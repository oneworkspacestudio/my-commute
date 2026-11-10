package commute

import (
	"bytes"
	"encoding/xml"
	"errors"
	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
	"io"
	"net/http"
	"strings"
	"time"
)

type railPoint struct {
	Name string `xml:"locationName"`
	CRS  string `xml:"crs"`
	ST   string `xml:"st"`
	ET   string `xml:"et"`
}
type railService struct {
	ID          string      `xml:"serviceID"`
	STD         string      `xml:"std"`
	ETD         string      `xml:"etd"`
	Platform    string      `xml:"platform"`
	Operator    string      `xml:"operator"`
	Cancelled   bool        `xml:"isCancelled"`
	Destination []railPoint `xml:"destination>location"`
	Points      []struct {
		Points []railPoint `xml:"callingPoint"`
	} `xml:"subsequentCallingPoints>callingPointList"`
}
type railEnvelope struct {
	Board struct {
		Generated string        `xml:"generatedAt"`
		Services  []railService `xml:"trainServices>service"`
	} `xml:"Body>GetDepBoardWithDetailsResponse>GetStationBoardResult"`
	Fault struct {
		Text string `xml:"faultstring"`
	} `xml:"Body>Fault"`
}

func xmlText(s string) string {
	var b bytes.Buffer
	_ = xml.EscapeText(&b, []byte(s))
	return b.String()
}
func railTime(hhmm string, generated time.Time) (time.Time, bool) {
	loc, e := time.LoadLocation("Europe/London")
	if e != nil {
		return time.Time{}, false
	}
	if len(hhmm) != 5 {
		return time.Time{}, false
	}
	clock, e := time.Parse("15:04", hhmm)
	if e != nil {
		return time.Time{}, false
	}
	day := generated.In(loc)
	t := time.Date(day.Year(), day.Month(), day.Day(), clock.Hour(), clock.Minute(), 0, 0, loc)
	if t.Before(generated.Add(-2 * time.Hour)) {
		t = t.AddDate(0, 0, 1)
	}
	return t, true
}
func parseRail(raw []byte, to string) (Board, error) {
	var e railEnvelope
	if xml.Unmarshal(raw, &e) != nil || e.Fault.Text != "" || e.Board.Generated == "" {
		return Board{}, errors.New("National Rail returned no usable board")
	}
	generated, err := time.Parse(time.RFC3339, e.Board.Generated)
	if err != nil {
		return Board{}, errors.New("National Rail board time is invalid")
	}
	board := Board{Arrivals: []Arrival{}, FetchedAt: time.Now().UTC().Format(time.RFC3339), Source: "National Rail Darwin"}
	for _, s := range e.Board.Services {
		names := []string{}
		calls := false
		var rideMinutes float64
		for _, d := range s.Destination {
			names = append(names, d.Name)
			if d.CRS == to {
				calls = true
			}
		}
		for _, list := range s.Points {
			for _, p := range list.Points {
				if p.CRS == to {
					calls = true
					rideMinutes = scheduledRailMinutes(s.STD, p.ST)
				}
			}
		}
		if !calls {
			continue
		}
		expected := s.ETD
		if expected == "On time" {
			expected = s.STD
		}
		when, known := railTime(expected, generated)
		arrival := ""
		if known {
			arrival = when.UTC().Format(time.RFC3339)
		}
		platform := "Platform not announced"
		if s.Platform != "" {
			platform = "Platform " + s.Platform
		}
		board.Arrivals = append(board.Arrivals, Arrival{ID: s.ID, LineID: "", LineName: s.Operator, DestinationName: strings.Join(names, " / "), PlatformName: platform, ExpectedArrival: arrival, Timestamp: generated.UTC().Format(time.RFC3339), Cancelled: s.Cancelled || s.ETD == "Cancelled", Scheduled: s.STD, Status: s.ETD, RideMinutes: rideMinutes})
	}
	return board, nil
}

func scheduledRailMinutes(departure, arrival string) float64 {
	from, e1 := time.Parse("15:04", departure)
	to, e2 := time.Parse("15:04", arrival)
	if e1 != nil || e2 != nil {
		return 0
	}
	minutes := to.Sub(from).Minutes()
	if minutes < 0 {
		minutes += 24 * 60
	}
	if minutes > 180 {
		return 0
	}
	return minutes
}
func (a *App) rail(w http.ResponseWriter, r *http.Request) {
	a.mu.Lock()
	token := a.railToken
	a.mu.Unlock()
	if token == "" {
		apphost.Problem(w, 503, "National Rail live data is not connected. Add a Darwin access token on the server")
		return
	}
	crs, to := r.URL.Query().Get("crs"), r.URL.Query().Get("to")
	if !crsID.MatchString(crs) || !crsID.MatchString(to) || crs == to {
		apphost.Problem(w, 400, "Choose different three-letter departure and destination CRS codes")
		return
	}
	body := `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:typ="http://thalesgroup.com/RTTI/2013-11-28/Token/types" xmlns:ldb="http://thalesgroup.com/RTTI/2021-11-01/ldb/"><soap:Header><typ:AccessToken><typ:TokenValue>` + xmlText(token) + `</typ:TokenValue></typ:AccessToken></soap:Header><soap:Body><ldb:GetDepBoardWithDetailsRequest><ldb:numRows>9</ldb:numRows><ldb:crs>` + crs + `</ldb:crs><ldb:filterCrs>` + to + `</ldb:filterCrs><ldb:filterType>to</ldb:filterType><ldb:timeOffset>0</ldb:timeOffset><ldb:timeWindow>119</ldb:timeWindow></ldb:GetDepBoardWithDetailsRequest></soap:Body></soap:Envelope>`
	req, _ := http.NewRequestWithContext(r.Context(), "POST", "https://lite.realtime.nationalrail.co.uk/OpenLDBWS/ldb12.asmx", strings.NewReader(body))
	req.Header.Set("Content-Type", "text/xml; charset=utf-8")
	req.Header.Set("SOAPAction", "http://thalesgroup.com/RTTI/2015-05-14/ldb/GetDepBoardWithDetails")
	resp, err := a.client.Do(req)
	if err != nil {
		apphost.Problem(w, 502, "National Rail is temporarily unreachable")
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		apphost.Problem(w, 502, "National Rail refused the request. Check the server token or try later")
		return
	}
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 2<<20))
	if err != nil {
		apphost.Problem(w, 502, "National Rail returned an incomplete response")
		return
	}
	b, err := parseRail(raw, to)
	if err != nil {
		apphost.Problem(w, 502, err.Error())
		return
	}
	apphost.JSON(w, 200, b)
}
