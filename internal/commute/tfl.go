package commute

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

func (a *App) fetch(ctx context.Context, path string) ([]byte, error) {
	return a.fetchTTL(ctx, path, 20*time.Second)
}

func (a *App) fetchTTL(ctx context.Context, path string, ttl time.Duration) ([]byte, error) {
	a.mu.Lock()
	c, ok := a.cache[path]
	key := a.tflKey
	a.mu.Unlock()
	if ok && time.Since(c.At) < ttl {
		return c.Data, nil
	}
	select {
	case a.slots <- struct{}{}:
		defer func() { <-a.slots }()
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	u, _ := url.Parse("https://api.tfl.gov.uk" + path)
	if key != "" {
		q := u.Query()
		q.Set("app_key", key)
		u.RawQuery = q.Encode()
	}
	r, _ := http.NewRequestWithContext(ctx, "GET", u.String(), nil)
	r.Header.Set("User-Agent", "MyCommute/0.1 (London transport)")
	resp, e := a.client.Do(r)
	if e != nil {
		return nil, errors.New("TfL could not be reached. Please retry")
	}
	defer resp.Body.Close()
	if resp.StatusCode == 429 {
		return nil, errors.New("TfL request limit reached. Try again shortly")
	}
	if resp.StatusCode != 200 {
		return nil, errors.New("TfL predictions are temporarily unavailable")
	}
	raw, e := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if e != nil || !json.Valid(raw) {
		return nil, errors.New("TfL returned an incomplete response")
	}
	a.mu.Lock()
	if len(a.cache) > 256 {
		a.cache = map[string]cacheEntry{}
	}
	a.cache[path] = cacheEntry{raw, time.Now()}
	a.mu.Unlock()
	return raw, nil
}

type tflStop struct {
	ID         string    `json:"id"`
	Name       string    `json:"commonName"`
	Lat        float64   `json:"lat"`
	Lon        float64   `json:"lon"`
	Modes      []string  `json:"modes"`
	Lines      []Line    `json:"lines"`
	Children   []tflStop `json:"children"`
	StopLetter string    `json:"stopLetter"`
}

func (s tflStop) public() Stop {
	name := s.Name
	if s.StopLetter != "" {
		name += " · Stop " + s.StopLetter
	}
	return Stop{s.ID, name, s.Lat, s.Lon, s.Lines}
}
func (a *App) search(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	mode := r.URL.Query().Get("mode")
	if len(q) < 2 || len(q) > 100 {
		apphost.Problem(w, 400, "Enter a stop name between 2 and 100 characters")
		return
	}
	switch mode {
	case "bus", "tube", "overground", "elizabeth-line", "dlr", "national-rail":
	default:
		apphost.Problem(w, 400, "Choose a TfL mode")
		return
	}
	raw, e := a.fetch(r.Context(), "/StopPoint/Search?query="+url.QueryEscape(q)+"&modes="+mode+"&maxResults=15")
	if e != nil {
		apphost.Problem(w, 502, e.Error())
		return
	}
	var data struct {
		Matches []struct {
			ID, Name string
			Lat, Lon float64
		} `json:"matches"`
	}
	if json.Unmarshal(raw, &data) != nil {
		apphost.Problem(w, 502, "Search response unavailable")
		return
	}
	out := []Stop{}
	for _, s := range data.Matches {
		if strings.HasPrefix(s.ID, "HUB") {
			b, e := a.fetch(r.Context(), "/StopPoint/"+url.PathEscape(s.ID))
			if e != nil {
				continue
			}
			var hub tflStop
			if json.Unmarshal(b, &hub) != nil {
				continue
			}
			for _, ch := range hub.Children {
				for _, m := range ch.Modes {
					if m == mode {
						out = append(out, ch.public())
						break
					}
				}
			}
		} else {
			out = append(out, Stop{ID: s.ID, Name: s.Name, Lat: s.Lat, Lon: s.Lon})
		}
	}
	apphost.JSON(w, 200, out)
}
func (a *App) stop(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	if !stopID.MatchString(id) {
		apphost.Problem(w, 400, "Invalid stop")
		return
	}
	raw, e := a.fetch(r.Context(), "/StopPoint/"+id)
	if e != nil {
		apphost.Problem(w, 502, e.Error())
		return
	}
	var s tflStop
	if json.Unmarshal(raw, &s) != nil || s.ID == "" {
		apphost.Problem(w, 502, "Stop details unavailable")
		return
	}
	selected, ok := exactStop(s, id)
	if !ok {
		apphost.Problem(w, 502, "The requested boarding stop was not returned")
		return
	}
	apphost.JSON(w, 200, selected.public())
}
func (a *App) arrivals(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("stop")
	if !stopID.MatchString(id) {
		apphost.Problem(w, 400, "Invalid stop")
		return
	}
	raw, e := a.fetch(r.Context(), "/StopPoint/"+id+"/Arrivals")
	if e != nil {
		apphost.Problem(w, 502, e.Error())
		return
	}
	arr := []Arrival{}
	if json.Unmarshal(raw, &arr) != nil {
		apphost.Problem(w, 502, "Arrival predictions could not be read")
		return
	}
	sort.Slice(arr, func(i, j int) bool { return arr[i].ExpectedArrival < arr[j].ExpectedArrival })
	apphost.JSON(w, 200, Board{Arrivals: arr, FetchedAt: time.Now().UTC().Format(time.RFC3339), Source: "TfL"})
}
func (a *App) status(w http.ResponseWriter, r *http.Request) {
	raw, e := a.fetch(r.Context(), "/Line/Mode/tube,overground,elizabeth-line,dlr/Status")
	if e != nil {
		apphost.Problem(w, 502, e.Error())
		return
	}
	var data any
	if json.Unmarshal(raw, &data) != nil {
		apphost.Problem(w, 502, "Network status unavailable")
		return
	}
	apphost.JSON(w, 200, data)
}

// TfL may wrap a requested platform or road-side stop in its parent hub.
func exactStop(s tflStop, id string) (tflStop, bool) {
	if s.ID == id {
		return s, true
	}
	for _, child := range s.Children {
		if found, ok := exactStop(child, id); ok {
			return found, true
		}
	}
	return tflStop{}, false
}
