package commute

import (
	"context"
	"encoding/json"
	"errors"
	"math"
	"net/http"
	"regexp"
	"sort"
	"strings"
	"time"

	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
)

type routeStop struct {
	Stop
	Minutes float64 `json:"minutes"`
}

type servicePath struct {
	LineID     string      `json:"lineId"`
	Direction  string      `json:"direction"`
	Terminus   string      `json:"terminus"`
	TerminusID string      `json:"terminusId"`
	Source     string      `json:"source"`
	Stops      []routeStop `json:"stops"`
}

var transitLineID = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{0,39}$`)
var routeValidationError = errors.New("Check the selected alighting stop and route details")

func routeDirection(s string) bool { return s == "inbound" || s == "outbound" }

func (a *App) busServices(w http.ResponseWriter, r *http.Request) {
	stop := r.URL.Query().Get("stop")
	if !stopID.MatchString(stop) {
		apphost.Problem(w, 400, "Choose a boarding stop")
		return
	}
	raw, err := a.fetchTTL(r.Context(), "/StopPoint/"+stop+"/Route", 15*time.Minute)
	if err != nil {
		apphost.Problem(w, 502, "Bus routes could not be loaded. Try again.")
		return
	}
	var routes []struct {
		NaptanID, LineID, Mode, Direction, DestinationName, VehicleDestinationText string
		IsActive                                                                   bool
	}
	if json.Unmarshal(raw, &routes) != nil {
		apphost.Problem(w, 502, "Bus routes could not be read")
		return
	}
	result := []LegService{}
	seen := map[[3]string]bool{}
	for _, route := range routes {
		if !route.IsActive || route.Mode != "bus" || route.NaptanID != stop || !busLineID.MatchString(route.LineID) || !routeDirection(route.Direction) {
			continue
		}
		name := route.VehicleDestinationText
		if name == "" {
			name = route.DestinationName
		}
		key := [3]string{route.LineID, route.Direction, name}
		if name != "" && !seen[key] {
			seen[key] = true
			terminus := route.DestinationName
			if terminus == "" {
				terminus = name
			}
			result = append(result, LegService{LineID: route.LineID, Direction: route.Direction, Terminus: terminus, VehicleDestination: name})
		}
	}
	apphost.JSON(w, 200, result)
}

func (a *App) servicePaths(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	stop, line, mode, direction := q.Get("stop"), q.Get("line"), q.Get("mode"), q.Get("direction")
	switch mode {
	case "bus", "tube", "overground", "elizabeth-line", "dlr":
	default:
		apphost.Problem(w, 400, "Choose a supported TfL service")
		return
	}
	if !stopID.MatchString(stop) || !transitLineID.MatchString(line) || (direction != "" && !routeDirection(direction)) {
		apphost.Problem(w, 400, "Choose a boarding stop and service")
		return
	}
	directions := []string{direction}
	if direction == "" {
		directions = []string{"inbound", "outbound"}
	}
	results := make(chan []servicePath, len(directions))
	for _, dir := range directions {
		go func(dir string) { results <- a.loadServicePaths(r.Context(), stop, line, mode, dir) }(dir)
	}
	paths := []servicePath{}
	for range directions {
		paths = append(paths, <-results...)
	}
	sort.SliceStable(paths, func(i, j int) bool {
		return paths[i].Direction+paths[i].TerminusID < paths[j].Direction+paths[j].TerminusID
	})
	if len(paths) == 0 {
		apphost.Problem(w, 502, "Stops for this service are unavailable. Try again or choose another service.")
		return
	}
	apphost.JSON(w, 200, paths)
}

func (a *App) loadServicePaths(ctx context.Context, stop, line, mode, dir string) []servicePath {
	// The Weaver and other Overground routes expose sequences but no stop timetable.
	if mode == "bus" || mode == "tube" || mode == "dlr" {
		raw, err := a.fetchTTL(ctx, "/Line/"+line+"/Timetable/"+stop+"?direction="+dir, 15*time.Minute)
		if err == nil {
			if paths := timetablePaths(raw, stop, line, dir); len(paths) > 0 {
				return paths
			}
		}
	}
	raw, err := a.fetchTTL(ctx, "/Line/"+line+"/Route/Sequence/"+dir, 15*time.Minute)
	if err != nil {
		return nil
	}
	return sequencePaths(raw, stop, line, mode, dir)
}

func timetablePaths(raw []byte, stop, line, dir string) []servicePath {
	var data tflTimetable
	if json.Unmarshal(raw, &data) != nil || data.LineID != line || data.Direction != dir || data.Timetable.DepartureStopID != stop {
		return nil
	}
	stops := map[string]Stop{}
	for _, s := range data.Stops {
		stops[s.ID] = Stop{ID: s.ID, Name: s.Name, Lat: s.Lat, Lon: s.Lon}
	}
	var result []servicePath
	for _, route := range data.Timetable.Routes {
		for _, branch := range route.StationIntervals {
			if len(branch.Intervals) == 0 {
				continue
			}
			last := stops[branch.Intervals[len(branch.Intervals)-1].StopID]
			if last.Name == "" || last.ID == stop {
				continue
			}
			path := servicePath{LineID: line, Direction: dir, Terminus: last.Name, TerminusID: last.ID, Source: "TfL timetable"}
			for _, interval := range branch.Intervals {
				s := stops[interval.StopID]
				if s.ID != stop && s.Name != "" && interval.TimeToArrival != nil && *interval.TimeToArrival >= 0 && *interval.TimeToArrival <= 180 {
					path.Stops = append(path.Stops, routeStop{s, math.Max(1, math.Ceil(*interval.TimeToArrival))})
				}
			}
			if len(path.Stops) > 0 {
				result = append(result, path)
			}
		}
	}
	return result
}

func sequencePaths(raw []byte, stop, line, mode, dir string) []servicePath {
	var data struct {
		LineID, Mode, Direction string
		StopPointSequences      []struct {
			StopPoint []Stop
		}
		OrderedLineRoutes []struct {
			NaptanIDs []string
		}
	}
	if json.Unmarshal(raw, &data) != nil || data.LineID != line || data.Mode != mode || data.Direction != dir {
		return nil
	}
	stops := map[string]Stop{}
	for _, sequence := range data.StopPointSequences {
		for _, s := range sequence.StopPoint {
			stops[s.ID] = s
		}
	}
	var result []servicePath
	for _, route := range data.OrderedLineRoutes {
		for i, id := range route.NaptanIDs {
			if id == stop && i+1 < len(route.NaptanIDs) {
				if path, ok := estimatePath(stops, route.NaptanIDs[i:], line, mode, dir); ok {
					result = append(result, path)
				}
				break
			}
		}
	}
	return result
}

func estimatePath(stops map[string]Stop, ids []string, line, mode, dir string) (servicePath, bool) {
	last := stops[ids[len(ids)-1]]
	path := servicePath{LineID: line, Direction: dir, Terminus: last.Name, TerminusID: last.ID, Source: "Estimate from TfL stop spacing"}
	// Approximate speeds and dwell are used only when the provider gives no run times.
	speed := map[string]float64{"bus": 16, "tube": 30, "overground": 38, "elizabeth-line": 45, "dlr": 27}[mode]
	var minutes float64
	previous := stops[ids[0]]
	for _, id := range ids[1:] {
		s := stops[id]
		if previous.Lat == 0 || s.Lat == 0 || s.Name == "" || speed == 0 {
			return servicePath{}, false
		}
		const rad = math.Pi / 180
		dx := (s.Lon - previous.Lon) * math.Cos((s.Lat+previous.Lat)*rad/2)
		km := math.Hypot(s.Lat-previous.Lat, dx) * 111.2
		minutes += km*60/speed + 0.5
		if minutes <= 180 {
			path.Stops = append(path.Stops, routeStop{s, math.Ceil(minutes)})
		}
		previous = s
	}
	return path, last.Name != "" && len(path.Stops) > 0
}

func validateLegRoute(l Leg) error {
	if l.Alight != nil && (!stopID.MatchString(l.Alight.ID) || l.Alight.ID == l.Stop.ID || len(l.Alight.Name) > 250 || len(l.Alight.Lines) > 150) {
		return routeValidationError
	}
	if len(l.Services) > 32 || len(l.RideSource) > 100 {
		return routeValidationError
	}
	lines := "," + l.Line + ","
	for _, s := range l.Services {
		if !transitLineID.MatchString(s.LineID) || !strings.Contains(lines, ","+s.LineID+",") || !routeDirection(s.Direction) || s.Terminus == "" || len(s.Terminus) > 250 || len(s.VehicleDestination) > 250 || !stopID.MatchString(s.TerminusID) || s.Minutes < 1 || s.Minutes > 180 {
			return routeValidationError
		}
	}
	return nil
}
