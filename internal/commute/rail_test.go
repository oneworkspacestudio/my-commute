package commute

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type transportFunc func(*http.Request) (*http.Response, error)

func (f transportFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }
func TestDarwinRequestMatchesPublishedWSDL(t *testing.T) {
	a := &App{railToken: "synthetic-token", slots: make(chan struct{}, 6), client: &http.Client{Transport: transportFunc(func(r *http.Request) (*http.Response, error) {
		if r.Header.Get("SOAPAction") != "http://thalesgroup.com/RTTI/2015-05-14/ldb/GetDepBoardWithDetails" {
			t.Fatal("SOAP action must use operation's published 2015 namespace")
		}
		if r.URL.Host != "lite.realtime.nationalrail.co.uk" || r.URL.Path != "/OpenLDBWS/ldb12.asmx" {
			t.Fatal("unapproved provider")
		}
		raw, _ := io.ReadAll(r.Body)
		if !strings.Contains(string(raw), "2021-11-01/ldb/") || !strings.Contains(string(raw), "<ldb:filterCrs>CLJ</ldb:filterCrs>") {
			t.Fatal("incorrect body namespace/destination")
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(`<Envelope><Body><GetDepBoardWithDetailsResponse><GetStationBoardResult><generatedAt>2026-11-05T08:00:00Z</generatedAt></GetStationBoardResult></GetDepBoardWithDetailsResponse></Body></Envelope>`)), Header: http.Header{}}, nil
	})}}
	w := httptest.NewRecorder()
	a.rail(w, httptest.NewRequest("GET", "/api/rail?crs=WAT&to=CLJ", nil))
	if w.Code != 200 || strings.Contains(w.Body.String(), "synthetic-token") {
		t.Fatal("invalid or secret-bearing response")
	}
}

func TestRailMidnightAndUnknown(t *testing.T) {
	now := time.Date(2026, 11, 5, 23, 55, 0, 0, time.UTC)
	got, ok := railTime("00:10", now)
	if !ok || got.Day() != 6 {
		t.Fatal("must roll midnight", got)
	}
	if _, ok := railTime("Delayed", now); ok {
		t.Fatal("must not invent departure time")
	}
}
func TestRailBoardFiltersCallsAndCancellation(t *testing.T) {
	raw := `<Envelope><Body><GetDepBoardWithDetailsResponse><GetStationBoardResult><generatedAt>2026-11-05T08:00:00Z</generatedAt><trainServices><service><serviceID>a</serviceID><std>08:10</std><etd>On time</etd><destination><location><locationName>Woking</locationName><crs>WOK</crs></location></destination><subsequentCallingPoints><callingPointList><callingPoint><locationName>Clapham Junction</locationName><crs>CLJ</crs><st>08:18</st></callingPoint></callingPointList></subsequentCallingPoints></service><service><serviceID>b</serviceID><std>08:12</std><etd>Cancelled</etd><destination><location><locationName>Clapham Junction</locationName><crs>CLJ</crs></location></destination></service><service><serviceID>wrong</serviceID><std>08:15</std><etd>On time</etd><destination><location><locationName>Reading</locationName><crs>RDG</crs></location></destination></service></trainServices></GetStationBoardResult></GetDepBoardWithDetailsResponse></Body></Envelope>`
	b, e := parseRail([]byte(raw), "CLJ")
	if e != nil || len(b.Arrivals) != 2 {
		t.Fatal(b, e)
	}
	if b.Arrivals[0].ExpectedArrival != "2026-11-05T08:10:00Z" || b.Arrivals[0].RideMinutes != 8 || !b.Arrivals[1].Cancelled || b.Arrivals[1].ExpectedArrival != "" {
		t.Fatal(b)
	}
	if !strings.Contains(b.Arrivals[0].PlatformName, "not announced") {
		t.Fatal("invented platform")
	}
}
func TestValidation(t *testing.T) {
	s := State{Preferences: Preferences{2, 4.5, 3}, Journeys: []Journey{{ID: "journey-one", Name: "Commute", Outbound: []Leg{{ID: "leg-one", Mode: "tube", Stop: Stop{ID: "940GZZLUHAI", Name: "Highbury", Lat: 51.546, Lon: -.103}, Line: "victoria", Destination: "Brixton", RideMinutes: 9, WalkMinutes: 4, To: "Oxford Circus"}}}}}
	if e := validate(s); e != nil {
		t.Fatal(e)
	}
	s.Journeys[0].Outbound[0].Destination = ""
	if validate(s) == nil {
		t.Fatal("missing train direction accepted")
	}
	s.Preferences.Buffer = -1
	if validate(s) == nil {
		t.Fatal("negative safety buffer accepted")
	}
}

func TestEmptyStateListsNormalize(t *testing.T) {
	s := State{}
	normalize(&s)
	if s.Journeys == nil {
		t.Fatal("empty journeys must serialize as an array")
	}
	s.Journeys = []Journey{{}}
	normalize(&s)
	if s.Journeys[0].Outbound == nil || s.Journeys[0].Inbound == nil {
		t.Fatal("empty directions must serialize as arrays")
	}
}
