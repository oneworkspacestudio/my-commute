package commute

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	_ "time/tzdata"

	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
)

// A frequency window is not an exact departure. Keep it separate from journeys.
type TimetableTime struct {
	Time        string `json:"time"`
	Destination string `json:"destination"`
	Minutes     int    `json:"minutes"`
}
type BusSchedule struct {
	Name        string          `json:"name"`
	Departures  []TimetableTime `json:"departures"`
	Frequencies []string        `json:"frequencies"`
}
type BusTimetable struct {
	LineID        string        `json:"lineId"`
	LineName      string        `json:"lineName"`
	Direction     string        `json:"direction"`
	Schedules     []BusSchedule `json:"schedules"`
	TodaySchedule string        `json:"todaySchedule"`
	Warning       string        `json:"warning"`
}
type tflClock struct{ Hour, Minute string }

func (c tflClock) minutes() (int, bool) {
	h, e := strconv.Atoi(c.Hour)
	m, f := strconv.Atoi(c.Minute)
	return h*60 + m, e == nil && f == nil && h >= 0 && h <= 47 && m >= 0 && m < 60
}
func clockMinutes(m int) string { return fmt.Sprintf("%02d:%02d", m/60, m%60) }

type tflTimetable struct {
	LineID, LineName, Direction string
	Stops                       []struct {
		ID, Name string
		Lat, Lon float64
	}
	Timetable struct {
		DepartureStopID string
		Routes          []struct {
			StationIntervals []struct {
				ID        string
				Intervals []struct {
					StopID        string
					TimeToArrival *float64
				}
			}
			Schedules []struct {
				Name          string
				KnownJourneys []struct {
					tflClock
					IntervalID int
				}
				Periods []struct {
					Type             string
					FromTime, ToTime tflClock
					Frequency        *struct{ LowestFrequency, HighestFrequency float64 }
				}
			}
		}
	}
}

func parseBusTimetable(raw []byte, line, stop string) (BusTimetable, error) {
	var in tflTimetable
	if json.Unmarshal(raw, &in) != nil || !strings.EqualFold(in.LineID, line) || !strings.EqualFold(in.Timetable.DepartureStopID, stop) {
		return BusTimetable{}, fmt.Errorf("Timetable did not match the selected route and boarding stop")
	}
	out := BusTimetable{LineID: in.LineID, LineName: in.LineName, Direction: in.Direction, Schedules: []BusSchedule{}}
	names := map[string]string{}
	for _, s := range in.Stops {
		names[s.ID] = s.Name
	}
	for _, r := range in.Timetable.Routes {
		dest := map[int]string{}
		for _, si := range r.StationIntervals {
			n, e := strconv.Atoi(si.ID)
			if e == nil && len(si.Intervals) > 0 {
				dest[n] = names[si.Intervals[len(si.Intervals)-1].StopID]
			}
		}
		for _, s := range r.Schedules {
			v := BusSchedule{Name: s.Name, Departures: []TimetableTime{}, Frequencies: []string{}}
			for _, j := range s.KnownJourneys {
				if m, ok := j.tflClock.minutes(); ok {
					v.Departures = append(v.Departures, TimetableTime{clockMinutes(m), dest[j.IntervalID], m})
				}
			}
			for _, p := range s.Periods {
				if !strings.HasPrefix(p.Type, "Frequency") {
					continue
				}
				from, ok := p.FromTime.minutes()
				to, valid := p.ToTime.minutes()
				if !ok || !valid {
					continue
				}
				label := "frequency-based service; check live arrivals"
				if p.Frequency != nil {
					lo, hi := p.Frequency.LowestFrequency, p.Frequency.HighestFrequency
					if lo > hi {
						lo, hi = hi, lo
					}
					if lo > 0 && hi > 0 {
						label = fmt.Sprintf("every %g–%g minutes", lo, hi)
					}
				}
				v.Frequencies = append(v.Frequencies, clockMinutes(from)+"–"+clockMinutes(to)+": "+label)
			}
			sort.Slice(v.Departures, func(i, j int) bool { return v.Departures[i].Minutes < v.Departures[j].Minutes })
			out.Schedules = append(out.Schedules, v)
		}
	}
	return out, nil
}

// Select only a calendar pattern we can resolve without guessing school terms,
// special dates or conflicting route variants. Other patterns remain browsable.
func dayPattern(name string, weekday time.Weekday) bool {
	n := strings.ToLower(strings.TrimSpace(name))
	days := []string{"sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"}
	if n == "daily" || n == "every day" || n == "monday to sunday" {
		return true
	}
	if n == "weekdays" {
		return weekday >= time.Monday && weekday <= time.Friday
	}
	for i, d := range days {
		if n == d {
			return int(weekday) == i
		}
	}
	for i, a := range days {
		for j, b := range days {
			if n == a+" to "+b {
				if i <= j {
					return int(weekday) >= i && int(weekday) <= j
				}
				return int(weekday) >= i || int(weekday) <= j
			}
		}
	}
	return false
}
func chooseSchedule(t BusTimetable, d time.Time, holidays map[string]bool) *BusSchedule {
	if holidays == nil || !holidays["year:"+d.Format("2006")] || holidays[d.Format("2006-01-02")] {
		return nil
	}
	var match *BusSchedule
	for i := range t.Schedules {
		if dayPattern(t.Schedules[i].Name, d.Weekday()) {
			if match != nil {
				return nil
			}
			match = &t.Schedules[i]
		}
	}
	return match
}

// GOV.UK supplies England/Wales bank holidays. A failed calendar lookup disables
// automatic fallback rather than applying an ordinary weekday on a special date.
func (a *App) bankHolidays(ctx context.Context) map[string]bool {
	a.calendarMu.Lock()
	defer a.calendarMu.Unlock()
	const key = "england-bank-holidays"
	a.mu.Lock()
	cached, ok := a.cache[key]
	a.mu.Unlock()
	raw := cached.Data
	if !ok || time.Since(cached.At) > 6*time.Hour {
		req, e := http.NewRequestWithContext(ctx, "GET", "https://www.gov.uk/bank-holidays.json", nil)
		if e != nil {
			return nil
		}
		resp, e := a.client.Do(req)
		if e != nil {
			return nil
		}
		defer resp.Body.Close()
		if resp.StatusCode != 200 {
			return nil
		}
		raw, e = io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		if e != nil || !json.Valid(raw) {
			return nil
		}
		a.mu.Lock()
		a.cache[key] = cacheEntry{raw, time.Now()}
		a.mu.Unlock()
	}
	var calendar map[string]struct{ Events []struct{ Date string } }
	if json.Unmarshal(raw, &calendar) != nil {
		return nil
	}
	events := calendar["england-and-wales"].Events
	if len(events) == 0 {
		return nil
	}
	result := map[string]bool{}
	years := map[string]bool{}
	for _, e := range events {
		if len(e.Date) == 10 {
			result[e.Date] = true
			result["year:"+e.Date[:4]] = true
			years[e.Date[:4]] = true
		}
	}
	// Absence outside the published calendar is not evidence of a normal day.
	year := time.Now().In(london).Format("2006")
	if !years[year] {
		return nil
	}
	return result
}

var london = func() *time.Location {
	l, e := time.LoadLocation("Europe/London")
	if e != nil {
		panic(e)
	}
	return l
}()
var busLineID = regexp.MustCompile(`^[a-z0-9]{1,8}$`)

func timetableArrivals(t *BusTimetable, now time.Time, holidays map[string]bool) []Arrival {
	local := now.In(london)
	day := time.Date(local.Year(), local.Month(), local.Day(), 0, 0, 0, 0, london)
	arr := []Arrival{}
	for offset := 0; offset < 2; offset++ {
		d := day.AddDate(0, 0, offset)
		s := chooseSchedule(*t, d, holidays)
		if s == nil {
			if offset == 0 {
				t.Warning = "Today's service pattern could not be confirmed (special day, calendar unavailable, or ambiguous timetable). Browse the published patterns; automatic scheduled fallback is off for this day."
			}
			continue
		}
		if offset == 0 {
			t.TodaySchedule = s.Name
		}
		for _, j := range s.Departures {
			target := d.AddDate(0, 0, j.Minutes/1440)
			h, m := (j.Minutes%1440)/60, j.Minutes%60
			at := time.Date(target.Year(), target.Month(), target.Day(), h, m, 0, 0, london)
			// Do not invent a clock time skipped or repeated by daylight saving.
			if at.Hour() != h || at.Minute() != m || at.Add(time.Hour).In(london).Format("2006-01-02 15:04") == at.Format("2006-01-02 15:04") || at.Add(-time.Hour).In(london).Format("2006-01-02 15:04") == at.Format("2006-01-02 15:04") {
				continue
			}
			if at.Before(now) || at.After(now.Add(24*time.Hour)) {
				continue
			}
			arr = append(arr, Arrival{ID: fmt.Sprintf("schedule:%s:%s:%s:%s", t.LineID, at.Format(time.RFC3339), t.Direction, j.Destination), LineID: t.LineID, LineName: t.LineName, Direction: t.Direction, DestinationName: j.Destination, ExpectedArrival: at.UTC().Format(time.RFC3339), Timestamp: now.UTC().Format(time.RFC3339), Scheduled: at.UTC().Format(time.RFC3339), Status: "Scheduled · not live", Timetabled: true})
		}
	}
	return arr
}

func (a *App) busTimetable(w http.ResponseWriter, r *http.Request) {
	line, stop := strings.ToLower(r.URL.Query().Get("line")), r.URL.Query().Get("stop")
	if !busLineID.MatchString(line) || !strings.HasPrefix(stop, "490") || !stopID.MatchString(stop) {
		apphost.Problem(w, 400, "Choose one bus route and its boarding stop")
		return
	}
	board, e := a.cachedBoard(r.Context(), "timetable:"+line+":"+stop, timetableRefresh, timetableRetention, func(ctx context.Context) (Board, error) {
		raw, err := a.fetchTFL(ctx, "/Line/"+line+"/Timetable/"+stop)
		if err != nil {
			return Board{}, fmt.Errorf("Bus timetable unavailable: %w", err)
		}
		timetable, err := parseBusTimetable(raw, line, stop)
		if err != nil {
			return Board{}, err
		}
		holidays := a.bankHolidays(ctx)
		arrivals := timetableArrivals(&timetable, time.Now(), holidays)
		return Board{Arrivals: arrivals, Source: "TfL published bus timetable", Timetable: &timetable}, nil
	})
	if e != nil {
		apphost.Problem(w, 502, e.Error())
		return
	}
	apphost.JSON(w, 200, board)
}
