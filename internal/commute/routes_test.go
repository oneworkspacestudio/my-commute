package commute

import "testing"

func TestBoardingSearchKeepsRailStationAndExpandsBusGroup(t *testing.T) {
	stations := []tflStop{
		{ID: "940GZZLUSYN", Modes: []string{"tube"}, Children: []tflStop{{ID: "entrance"}}},
		{ID: "490Gsynthetic", Modes: []string{"bus"}, Children: []tflStop{
			{ID: "490north", Modes: []string{"bus"}, StopLetter: "A"}, {ID: "490south", Modes: []string{"bus"}, StopLetter: "B"},
		}},
	}
	for _, tc := range []struct {
		mode string
		ids  []string
	}{{"tube", []string{"940GZZLUSYN"}}, {"bus", []string{"490north", "490south"}}} {
		var ids []string
		boardingStops(stations, tc.mode, func(s Stop) { ids = append(ids, s.ID) })
		if len(ids) != len(tc.ids) {
			t.Fatalf("%s: %v", tc.mode, ids)
		}
		for i, id := range tc.ids {
			if ids[i] != id {
				t.Fatalf("%s: %v", tc.mode, ids)
			}
		}
	}
}

func TestServicePathsUseExactBoardingAndRealTerminus(t *testing.T) {
	data := []byte(`{"lineId":"24","direction":"inbound","stops":[{"id":"first","name":"First Stop"},{"id":"last","name":"Last Stop"}],"timetable":{"departureStopId":"board","routes":[{"stationIntervals":[{"intervals":[{"stopId":"first","timeToArrival":0},{"stopId":"last","timeToArrival":6.5}]}]}]}}`)
	paths := timetablePaths(data, "board", "24", "inbound")
	if len(paths) != 1 || paths[0].Terminus != "Last Stop" || len(paths[0].Stops) != 2 || paths[0].Stops[0].Minutes != 1 || paths[0].Stops[1].Minutes != 7 {
		t.Fatalf("unexpected path: %+v", paths)
	}
	if len(timetablePaths(data, "other", "24", "inbound")) != 0 || len(timetablePaths(data, "board", "24", "outbound")) != 0 {
		t.Fatal("accepted timing for a different boarding stop or direction")
	}
}
