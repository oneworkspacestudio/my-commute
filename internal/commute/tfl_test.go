package commute

import "testing"

func TestExactBoardingStopInsideHub(t *testing.T) {
	north := tflStop{ID: "synthetic-north", Name: "Synthetic stop", StopLetter: "N", Lat: 51.51, Lon: -.11}
	south := tflStop{ID: "synthetic-south", Name: "Synthetic stop", StopLetter: "S", Lat: 51.52, Lon: -.12}
	hub := tflStop{ID: "synthetic-hub", Children: []tflStop{{ID: "synthetic-group", Children: []tflStop{north, south}}}}
	got, ok := exactStop(hub, south.ID)
	if !ok || got.ID != south.ID || got.Lat != south.Lat || got.public().Name != "Synthetic stop · Stop S" {
		t.Fatal("lost the requested side of the road", got)
	}
	if _, ok := exactStop(hub, "missing-platform"); ok {
		t.Fatal("must not substitute an entire hub")
	}
}
