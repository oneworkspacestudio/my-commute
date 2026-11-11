package commute

import (
	"context"
	"errors"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestDepartureCacheSharesFetchAndPreservesAgeDuringOutage(t *testing.T) {
	app := &App{}
	ctx := context.Background()
	var calls atomic.Int32
	ready := make(chan struct{})
	load := func(context.Context) (Board, error) {
		if calls.Add(1) == 1 {
			<-ready
		}
		return Board{Source: "TfL", Arrivals: []Arrival{{ID: "known-train"}}}, nil
	}
	const readers = 8
	var wg sync.WaitGroup
	boards := make(chan Board, readers)
	for i := 0; i < readers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			board, err := app.cachedBoard(ctx, "stop", liveRefresh, predictionRetention, load)
			if err != nil {
				t.Error(err)
			}
			boards <- board
		}()
	}
	close(ready)
	wg.Wait()
	close(boards)
	firstFetch := ""
	live := 0
	for board := range boards {
		if firstFetch == "" {
			firstFetch = board.FetchedAt
		}
		if board.FetchedAt != firstFetch || len(board.Arrivals) != 1 {
			t.Fatalf("inconsistent board %+v", board)
		}
		if board.CacheState == "live" {
			live++
		}
	}
	if calls.Load() != 1 || live != 1 {
		t.Fatalf("fetch count %d, live responses %d", calls.Load(), live)
	}

	entry := app.boards["stop"]
	entry.at = time.Now().Add(-2 * time.Minute)
	outage := errors.New("provider unavailable")
	failed := func(context.Context) (Board, error) {
		calls.Add(1)
		return Board{}, outage
	}
	for i := 0; i < 2; i++ {
		board, err := app.cachedBoard(ctx, "stop", liveRefresh, predictionRetention, failed)
		if err != nil || board.CacheState != "estimated" || board.RefreshError != outage.Error() || board.FetchedAt != firstFetch {
			t.Fatalf("expected original snapshot during outage, got %+v, %v", board, err)
		}
	}
	if calls.Load() != 2 {
		t.Fatal("failure should throttle retries")
	}
	entry.at = time.Now().Add(-predictionRetention)
	if _, err := app.cachedBoard(ctx, "stop", liveRefresh, predictionRetention, failed); !errors.Is(err, outage) {
		t.Fatalf("expired snapshot was returned: %v", err)
	}
	entry.retryAt = time.Now().Add(-time.Second)
	if board, err := app.cachedBoard(ctx, "stop", liveRefresh, predictionRetention, load); err != nil || board.CacheState != "live" || board.RefreshError != "" {
		t.Fatalf("expected recovered live board, got %+v, %v", board, err)
	}
}

func TestProviderBackoffHonorsRetryAfterAcrossStops(t *testing.T) {
	app := &App{slots: make(chan struct{}, 2)}
	response := &http.Response{Header: http.Header{"Retry-After": {"180"}}}
	now := time.Now()
	app.rateLimited("TfL", response)
	if app.providerRetry["TfL"].Before(now.Add(180 * time.Second)) {
		t.Fatal("provider cooldown is shorter than Retry-After")
	}
	if _, err := app.providerSlot(context.Background(), "TfL"); err == nil {
		t.Fatal("TfL should be paused")
	}
	release, err := app.providerSlot(context.Background(), "National Rail")
	if err != nil {
		t.Fatal(err)
	}
	release()
}
