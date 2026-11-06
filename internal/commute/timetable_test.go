package commute

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

const syntheticTimetable = `{"lineId":"24","lineName":"24","direction":"inbound","stops":[{"id":"end","name":"Synthetic terminus"}],"timetable":{"departureStopId":"490000036S","routes":[{"stationIntervals":[{"id":"0","intervals":[{"stopId":"end"}]}],"schedules":[{"name":"Monday to Friday","knownJourneys":[{"hour":"8","minute":"15","intervalId":0},{"hour":"24","minute":"10","intervalId":0}],"periods":[{"type":"FrequencyMinutes","fromTime":{"hour":"9","minute":"00"},"toTime":{"hour":"17","minute":"59"},"frequency":{"lowestFrequency":14,"highestFrequency":10}}]},{"name":"Saturday","knownJourneys":[{"hour":"1","minute":"15","intervalId":0}]}]}]}}`

func TestTimetableParseAndCalendar(t *testing.T) {
	tt, e := parseBusTimetable([]byte(syntheticTimetable), "24", "490000036S")
	if e != nil {
		t.Fatal(e)
	}
	if tt.Schedules[0].Departures[0].Destination != "Synthetic terminus" || len(tt.Schedules[0].Departures) != 2 || !strings.Contains(tt.Schedules[0].Frequencies[0], "10–14") {
		t.Fatalf("lost published data: %+v", tt)
	}
	now := time.Date(2026, 11, 6, 8, 0, 0, 0, london)
	calendar := map[string]bool{"year:2026": true}
	a := timetableArrivals(&tt, now, calendar)
	if len(a) != 3 || a[0].ExpectedArrival != "2026-11-06T08:15:00Z" || a[1].ExpectedArrival != "2026-11-07T00:10:00Z" || !a[0].Timetabled {
		t.Fatalf("calendar or midnight: %+v", a)
	}
	calendar["2026-11-06"] = true
	if chooseSchedule(tt, now, calendar) != nil || chooseSchedule(tt, now, nil) != nil {
		t.Fatal("special/unknown calendar must not guess")
	}
	if chooseSchedule(tt, time.Date(2027, 1, 1, 0, 0, 0, 0, london), calendar) != nil {
		t.Fatal("unpublished year must not guess")
	}
	if _, e := parseBusTimetable([]byte(syntheticTimetable), "24", "490000000X"); e == nil {
		t.Fatal("wrong road-side stop accepted")
	}
	tt.Schedules = append(tt.Schedules, tt.Schedules[0])
	if chooseSchedule(tt, now.AddDate(0, 0, -1), calendar) != nil {
		t.Fatal("conflicting patterns must not be merged")
	}
	if dayPattern("Monday to Friday School Days", time.Friday) {
		t.Fatal("school calendar guessed")
	}
}

func TestTimetableLondonDST(t *testing.T) {
	for _, date := range []string{"2026-03-29", "2026-10-25"} {
		d, _ := time.ParseInLocation("2006-01-02", date, london)
		tt := BusTimetable{LineID: "24", Schedules: []BusSchedule{{Name: "Sunday", Departures: []TimetableTime{{Time: "01:30", Minutes: 90}, {Time: "03:30", Minutes: 210}}}}}
		a := timetableArrivals(&tt, d, map[string]bool{"year:2026": true})
		if len(a) != 1 || !strings.HasSuffix(a[0].Scheduled, "30:00Z") {
			t.Fatalf("ambiguous/nonexistent clock time used: %s %+v", date, a)
		}
		at, _ := time.Parse(time.RFC3339, a[0].Scheduled)
		if at.In(london).Hour() != 3 {
			t.Fatal("London clock conversion failed")
		}
	}
}

type timetableTransport func(*http.Request) (*http.Response, error)

func (f timetableTransport) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestTimetableEndpointAndCache(t *testing.T) {
	calls := 0
	a := &App{cache: map[string]cacheEntry{}, slots: make(chan struct{}, 6), client: &http.Client{Transport: timetableTransport(func(r *http.Request) (*http.Response, error) {
		calls++
		body := syntheticTimetable
		if r.URL.Host == "www.gov.uk" {
			body = `{"england-and-wales":{"events":[{"date":"` + time.Now().Format("2006") + `-01-01"}]}}`
		} else if r.URL.Path != "/Line/24/Timetable/490000036S" {
			t.Fatalf("unexpected upstream: %s", r.URL)
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(body))}, nil
	})}}
	for i := 0; i < 2; i++ {
		w := httptest.NewRecorder()
		a.busTimetable(w, httptest.NewRequest("GET", "/api/timetable?line=24&stop=490000036S", nil))
		if w.Code != 200 {
			t.Fatal(w.Body.String())
		}
		var b Board
		if json.Unmarshal(w.Body.Bytes(), &b) != nil || b.Timetable == nil {
			t.Fatal("missing board")
		}
	}
	if calls != 2 {
		t.Fatalf("timetable/calendar not cached: %d", calls)
	}
	w := httptest.NewRecorder()
	a.busTimetable(w, httptest.NewRequest("GET", "/api/timetable?line=24/evil&stop=490000036S", nil))
	if w.Code != 400 || calls != 2 {
		t.Fatal("invalid parameters reached upstream")
	}
}
