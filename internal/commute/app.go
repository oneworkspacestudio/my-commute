package commute

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
	"net/http"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

type Stop struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Lat   float64 `json:"lat"`
	Lon   float64 `json:"lon"`
	Lines []Line  `json:"lines,omitempty"`
}
type Line struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}
type Leg struct {
	ID          string  `json:"id"`
	Mode        string  `json:"mode"`
	Stop        Stop    `json:"stop"`
	Line        string  `json:"line"`
	LineName    string  `json:"lineName"`
	Direction   string  `json:"direction"`
	Destination string  `json:"destination"`
	RideMinutes float64 `json:"rideMinutes"`
	WalkMinutes float64 `json:"walkMinutes"`
	To          string  `json:"to"`
	CRS         string  `json:"crs,omitempty"`
	ToCRS       string  `json:"toCrs,omitempty"`
}
type Journey struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Outbound []Leg  `json:"outbound"`
	Inbound  []Leg  `json:"inbound"`
}
type Preferences struct {
	Buffer    float64 `json:"buffer"`
	WalkSpeed float64 `json:"walkSpeed"`
	FinalWalk float64 `json:"finalWalk"`
}
type State struct {
	Journeys    []Journey   `json:"journeys"`
	Preferences Preferences `json:"preferences"`
}
type Arrival struct {
	ID              string `json:"id"`
	LineID          string `json:"lineId"`
	LineName        string `json:"lineName"`
	DestinationName string `json:"destinationName"`
	Direction       string `json:"direction"`
	PlatformName    string `json:"platformName"`
	ExpectedArrival string `json:"expectedArrival"`
	Timestamp       string `json:"timestamp"`
	Cancelled       bool   `json:"cancelled,omitempty"`
	Scheduled       string `json:"scheduled,omitempty"`
	Status          string `json:"status,omitempty"`
	Timetabled      bool   `json:"timetabled,omitempty"`
}
type Board struct {
	Arrivals  []Arrival     `json:"arrivals"`
	FetchedAt string        `json:"fetchedAt"`
	Source    string        `json:"source"`
	Timetable *BusTimetable `json:"timetable,omitempty"`
}
type cacheEntry struct {
	Data []byte
	At   time.Time
}
type App struct {
	h                 *apphost.Host
	client            *http.Client
	mu                sync.Mutex
	calendarMu        sync.Mutex
	cache             map[string]cacheEntry
	tflKey, railToken string
	slots             chan struct{}
}

func New(h *apphost.Host) (*App, error) {
	if e := migrate(h); e != nil {
		return nil, e
	}
	a := &App{h: h, client: &http.Client{Timeout: 12 * time.Second, CheckRedirect: func(_ *http.Request, _ []*http.Request) error { return errors.New("upstream redirect rejected") }}, cache: map[string]cacheEntry{}, tflKey: os.Getenv("TFL_APP_KEY"), railToken: os.Getenv("NATIONAL_RAIL_TOKEN"), slots: make(chan struct{}, 6)}
	var tk, rt string
	if e := h.DB.QueryRow("SELECT tfl_key,rail_token FROM commute_providers WHERE id=1").Scan(&tk, &rt); e == nil {
		if tk != "" {
			a.tflKey = tk
		}
		if rt != "" {
			a.railToken = rt
		}
	} else if e != sql.ErrNoRows {
		return nil, e
	}
	h.Mux.HandleFunc("GET /api/state", h.Require(a.getState))
	h.Mux.HandleFunc("PUT /api/state", h.Require(a.putState))
	h.Mux.HandleFunc("PUT /api/journey-import", h.Require(a.importJourney))
	h.Mux.HandleFunc("PUT /api/providers", h.Owner(a.putProviders))
	for path, fn := range map[string]http.HandlerFunc{"GET /api/search": a.search, "GET /api/stop": a.stop, "GET /api/arrivals": a.arrivals, "GET /api/status": a.status, "GET /api/rail": a.rail, "GET /api/timetable": a.busTimetable} {
		h.Mux.HandleFunc(path, h.Require(fn))
	}
	return a, nil
}
func (a *App) Run(ctx context.Context) error { <-ctx.Done(); return nil }
func (a *App) getState(w http.ResponseWriter, r *http.Request) {
	s := State{Journeys: []Journey{}, Preferences: Preferences{2, 4.5, 3}}
	var raw string
	e := a.h.DB.QueryRowContext(r.Context(), "SELECT body FROM commute_state WHERE user_id=?", apphost.Current(r).User.ID).Scan(&raw)
	if e != nil && e != sql.ErrNoRows {
		a.h.DBError(w, e)
		return
	}
	if e == nil && json.Unmarshal([]byte(raw), &s) != nil {
		apphost.Problem(w, 500, "Saved journeys could not be read")
		return
	}
	normalize(&s)
	a.mu.Lock()
	configured := a.railToken != ""
	a.mu.Unlock()
	apphost.JSON(w, 200, map[string]any{"state": s, "railConfigured": configured})
}

func (a *App) putProviders(w http.ResponseWriter, r *http.Request) {
	var in struct {
		TFLKey    string `json:"tflKey"`
		RailToken string `json:"railToken"`
	}
	if !apphost.Decode(w, r, &in) {
		return
	}
	in.TFLKey = strings.TrimSpace(in.TFLKey)
	in.RailToken = strings.TrimSpace(in.RailToken)
	if len(in.TFLKey) > 1024 || len(in.RailToken) > 1024 || strings.ContainsAny(in.TFLKey+in.RailToken, "\r\n") {
		apphost.Problem(w, 400, "Invalid provider credentials")
		return
	}
	a.mu.Lock()
	defer a.mu.Unlock()
	tk, rt := a.tflKey, a.railToken
	if in.TFLKey != "" {
		tk = in.TFLKey
	}
	if in.RailToken != "" {
		rt = in.RailToken
	}
	if _, e := a.h.DB.ExecContext(r.Context(), "INSERT INTO commute_providers(id,tfl_key,rail_token) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET tfl_key=excluded.tfl_key,rail_token=excluded.rail_token", tk, rt); e != nil {
		a.h.DBError(w, e)
		return
	}
	a.tflKey, a.railToken = tk, rt
	a.cache = map[string]cacheEntry{}
	apphost.JSON(w, 200, map[string]bool{"railConfigured": rt != "", "tflConfigured": tk != ""})
}

var stopID = regexp.MustCompile(`^[A-Za-z0-9_-]{3,80}$`)
var crsID = regexp.MustCompile(`^[A-Z]{3}$`)

func normalize(s *State) {
	if s.Journeys == nil {
		s.Journeys = []Journey{}
	}
	for i := range s.Journeys {
		if s.Journeys[i].Outbound == nil {
			s.Journeys[i].Outbound = []Leg{}
		}
		if s.Journeys[i].Inbound == nil {
			s.Journeys[i].Inbound = []Leg{}
		}
	}
}

func validate(s State) error {
	if len(s.Journeys) > 20 || s.Preferences.Buffer < 1 || s.Preferences.Buffer > 15 || s.Preferences.FinalWalk < 0 || s.Preferences.FinalWalk > 60 || (s.Preferences.WalkSpeed != 3 && s.Preferences.WalkSpeed != 4.5 && s.Preferences.WalkSpeed != 5.5) {
		return errors.New("Check journey limits and travel preferences")
	}
	ids := map[string]bool{}
	for _, j := range s.Journeys {
		if !stopID.MatchString(j.ID) || ids[j.ID] || strings.TrimSpace(j.Name) == "" || len(j.Name) > 160 || len(j.Outbound) > 8 || len(j.Inbound) > 8 || len(j.Outbound)+len(j.Inbound) == 0 {
			return errors.New("Use a unique journey, name and up to eight legs per direction")
		}
		ids[j.ID] = true
		legIDs := map[string]bool{}
		for _, l := range append(append([]Leg{}, j.Outbound...), j.Inbound...) {
			if !stopID.MatchString(l.ID) || legIDs[l.ID] || l.RideMinutes < 1 || l.RideMinutes > 180 || l.WalkMinutes < 0 || l.WalkMinutes > 90 || strings.TrimSpace(l.To) == "" || len(l.To) > 200 || len(l.Destination) > 200 || len(l.Direction) > 200 || len(l.Stop.Name) > 250 || len(l.Line) > 100 || len(l.LineName) > 150 || len(l.Stop.Lines) > 150 {
				return errors.New("Check leg names, stops and travel durations")
			}
			legIDs[l.ID] = true
			if l.Mode == "national-rail" {
				if !crsID.MatchString(l.CRS) || !crsID.MatchString(l.ToCRS) || l.CRS == l.ToCRS {
					return errors.New("Choose different valid departure and destination station codes")
				}
			} else {
				switch l.Mode {
				case "bus", "tube", "overground", "elizabeth-line", "dlr":
				default:
					return errors.New("Unsupported transport mode")
				}
				if !stopID.MatchString(l.Stop.ID) || l.Line == "" || l.Stop.Lat < 51.2 || l.Stop.Lat > 51.8 || l.Stop.Lon < -0.65 || l.Stop.Lon > .4 {
					return errors.New("Choose a London boarding stop and service")
				}
				if l.Mode != "bus" && l.Direction == "" && l.Destination == "" {
					return errors.New("Choose the train direction or destination")
				}
			}
		}
	}
	return nil
}
func (a *App) putState(w http.ResponseWriter, r *http.Request) {
	var s State
	if !apphost.Decode(w, r, &s) {
		return
	}
	normalize(&s)
	if e := validate(s); e != nil {
		apphost.Problem(w, 400, e.Error())
		return
	}
	raw, _ := json.Marshal(s)
	_, e := a.h.DB.ExecContext(r.Context(), "INSERT INTO commute_state(user_id,body) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET body=excluded.body", apphost.Current(r).User.ID, string(raw))
	if e != nil {
		a.h.DBError(w, e)
		return
	}
	apphost.JSON(w, 200, map[string]bool{"saved": true})
}

// Import validates and previews one journey; saving remains an explicit user action.
func (a *App) importJourney(w http.ResponseWriter, r *http.Request) {
	var in struct {
		Journey Journey `json:"journey"`
	}
	if !apphost.Decode(w, r, &in) {
		return
	}
	state := State{Journeys: []Journey{in.Journey}, Preferences: Preferences{2, 4.5, 0}}
	normalize(&state)
	if e := validate(state); e != nil {
		apphost.Problem(w, 400, e.Error())
		return
	}
	apphost.JSON(w, 200, state.Journeys[0])
}

func migrate(h *apphost.Host) error {
	steps := []string{
		`CREATE TABLE IF NOT EXISTS commute_state(user_id TEXT PRIMARY KEY REFERENCES host_users(id) ON DELETE CASCADE,body TEXT NOT NULL);`,
		`CREATE TABLE IF NOT EXISTS commute_providers(id INTEGER PRIMARY KEY CHECK(id=1),tfl_key TEXT NOT NULL,rail_token TEXT NOT NULL);`,
	}
	var current int
	if e := h.DB.QueryRow("SELECT coalesce(max(version),0) FROM host_migrations").Scan(&current); e != nil {
		return e
	}
	if current > len(steps) {
		return errors.New("App data needs a newer My Commute executable")
	}
	for version := current + 1; version <= len(steps); version++ {
		if e := h.Migrate(version, steps[version-1]); e != nil {
			return e
		}
	}
	return nil
}
