package commute

import (
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strings"

	"github.com/oneworkspacestudio/one-workspace/pkg/apphost"
)

type Origin struct {
	Lat    float64 `json:"lat"`
	Lon    float64 `json:"lon"`
	Source string  `json:"source"`
}

func (o Origin) valid() bool {
	return (o.Source == "location" || o.Source == "postcode") &&
		o.Lat >= 49 && o.Lat <= 61 && o.Lon >= -9 && o.Lon <= 3
}

var postcodeID = regexp.MustCompile(`^([A-Z]{1,2}[0-9][0-9A-Z]?[0-9][A-Z]{2}|GIR0AA)$`)

func (a *App) lookupOrigin(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Postcode string `json:"postcode"`
	}
	if !apphost.Decode(w, r, &input) {
		return
	}
	code := strings.ReplaceAll(strings.ToUpper(strings.TrimSpace(input.Postcode)), " ", "")
	if !postcodeID.MatchString(code) {
		apphost.Problem(w, 400, "Enter a full UK postcode")
		return
	}
	select {
	case a.slots <- struct{}{}:
		defer func() { <-a.slots }()
	case <-r.Context().Done():
		return
	}
	req, _ := http.NewRequestWithContext(r.Context(), http.MethodGet, "https://api.postcodes.io/postcodes/"+code, nil)
	resp, err := a.client.Do(req)
	if err != nil {
		apphost.Problem(w, 502, "Postcode lookup is unavailable. Try again or use your current location")
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		apphost.Problem(w, 404, "Postcode not found. Check it or use your current location")
		return
	}
	var body struct {
		Result struct {
			Latitude  *float64 `json:"latitude"`
			Longitude *float64 `json:"longitude"`
		} `json:"result"`
	}
	if resp.StatusCode != http.StatusOK || json.NewDecoder(io.LimitReader(resp.Body, 32<<10)).Decode(&body) != nil {
		apphost.Problem(w, 502, "Postcode lookup is unavailable. Try again or use your current location")
		return
	}
	if body.Result.Latitude == nil || body.Result.Longitude == nil {
		apphost.Problem(w, 502, "The postcode did not return usable coordinates")
		return
	}
	origin := Origin{Lat: *body.Result.Latitude, Lon: *body.Result.Longitude, Source: "postcode"}
	if !origin.valid() {
		apphost.Problem(w, 502, "The postcode did not return usable coordinates")
		return
	}
	apphost.JSON(w, 200, origin)
}
