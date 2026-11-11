package commute

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"
)

const (
	liveRefresh         = time.Minute
	predictionRetention = 30 * time.Minute
	timetableRefresh    = 15 * time.Minute
	timetableRetention  = 24 * time.Hour
	maxBoards           = 256
)

type boardEntry struct {
	board       Board
	at, retryAt time.Time
	problem     error
	pending     chan struct{}
}

func (a *App) cachedBoard(ctx context.Context, key string, refresh, retention time.Duration, load func(context.Context) (Board, error)) (Board, error) {
	for {
		a.mu.Lock()
		now := time.Now()
		entry := a.boards[key]
		if entry != nil && entry.pending != nil {
			pending := entry.pending
			a.mu.Unlock()
			select {
			case <-pending:
				continue
			case <-ctx.Done():
				return Board{}, ctx.Err()
			}
		}
		if entry != nil && entry.problem != nil && now.Before(entry.retryAt) {
			board, err := entry.estimate(now, retention)
			a.mu.Unlock()
			return board, err
		}
		if entry != nil && entry.problem == nil && now.Sub(entry.at) < refresh {
			board := entry.board
			board.CacheState = "cached"
			a.mu.Unlock()
			return board, nil
		}
		if entry == nil {
			if a.boards == nil {
				a.boards = make(map[string]*boardEntry)
			}
			if len(a.boards) >= maxBoards {
				var oldestKey string
				var oldest *boardEntry
				for key, candidate := range a.boards {
					if candidate.pending == nil && (oldest == nil || candidate.at.Before(oldest.at)) {
						oldestKey, oldest = key, candidate
					}
				}
				if oldest == nil {
					a.mu.Unlock()
					return Board{}, errors.New("Departure refresh is busy. Try again shortly")
				}
				delete(a.boards, oldestKey)
			}
			entry = &boardEntry{}
			a.boards[key] = entry
		}
		entry.pending = make(chan struct{})
		a.mu.Unlock()

		board, err := load(ctx)
		now = time.Now()
		a.mu.Lock()
		close(entry.pending)
		entry.pending = nil
		switch {
		case err == nil:
			board.FetchedAt = now.UTC().Format(time.RFC3339)
			board.CacheState = "live"
			entry.board, entry.at, entry.problem = board, now, nil
		case ctx.Err() == nil:
			entry.problem, entry.retryAt = err, now.Add(liveRefresh)
			board, err = entry.estimate(now, retention)
		}
		a.mu.Unlock()
		return board, err
	}
}

func (e *boardEntry) estimate(now time.Time, retention time.Duration) (Board, error) {
	if e.at.IsZero() || now.Sub(e.at) >= retention {
		return Board{}, e.problem
	}
	board := e.board
	board.CacheState, board.RefreshError = "estimated", e.problem.Error()
	return board, nil
}

func (a *App) providerSlot(ctx context.Context, provider string) (func(), error) {
	select {
	case a.slots <- struct{}{}:
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	release := func() { <-a.slots }
	a.mu.Lock()
	retry := a.providerRetry[provider]
	a.mu.Unlock()
	if time.Now().Before(retry) {
		release()
		return nil, errors.New(provider + " request limit reached. Waiting to retry")
	}
	return release, nil
}

func (a *App) rateLimited(provider string, response *http.Response) error {
	now := time.Now()
	delay := liveRefresh
	if seconds, err := strconv.ParseUint(response.Header.Get("Retry-After"), 10, 32); err == nil {
		delay = max(delay, time.Duration(seconds)*time.Second)
	} else if at, err := http.ParseTime(response.Header.Get("Retry-After")); err == nil {
		delay = max(delay, at.Sub(now))
	}
	a.mu.Lock()
	if a.providerRetry == nil {
		a.providerRetry = make(map[string]time.Time)
	}
	next := now.Add(delay)
	if next.After(a.providerRetry[provider]) {
		a.providerRetry[provider] = next
	}
	a.mu.Unlock()
	return errors.New(provider + " request limit reached. Waiting to retry")
}
