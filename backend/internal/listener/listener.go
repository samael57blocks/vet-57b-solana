package listener

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/57blocks/vet-57b-backend/internal/solana"
)

// Listener orchestrates the WebSocket event listener and the periodic account
// poller. It launches both as goroutines and coordinates graceful shutdown via
// context cancellation.
type Listener struct {
	ws     *WSListener
	poller *Poller
	logger *slog.Logger
}

// New creates a new Listener orchestrator.
//
// Parameters:
//   - client: SolanaClient for RPC and WebSocket access.
//   - store: EventStore for persisting parsed data.
//   - programID: The Anchor program ID to subscribe to and poll.
//   - pollInterval: How often to poll accounts (e.g., 30s).
//   - wsMaxBackoff: Maximum backoff for WebSocket reconnection (e.g., 60s).
func New(
	client solana.SolanaClient,
	store EventStore,
	programID string,
	pollInterval time.Duration,
	wsMaxBackoff time.Duration,
) *Listener {
	return &Listener{
		ws:     NewWSListener(client, store, programID, wsMaxBackoff),
		poller: NewPoller(client, store, programID, pollInterval),
		logger: slog.With("component", "listener"),
	}
}

// Start launches the WS listener and poller in background goroutines. It blocks
// until the context is cancelled, then waits for both goroutines to finish.
//
// Usage:
//
//	ctx, cancel := context.WithCancel(context.Background())
//	defer cancel()
//	lis := listener.New(client, store, programID, 30*time.Second, 60*time.Second)
//	if err := lis.Start(ctx); err != nil {
//	    log.Fatal(err)
//	}
func (l *Listener) Start(ctx context.Context) error {
	l.logger.Info("starting listener orchestrator")

	// Create a cancellable child context so we can stop all goroutines.
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	var wg sync.WaitGroup

	// Channel to collect errors from goroutines.
	errCh := make(chan error, 2)

	// Start WebSocket listener.
	wg.Add(1)
	go func() {
		defer wg.Done()
		l.logger.Info("listener: starting WS listener goroutine")
		if err := l.ws.Run(ctx); err != nil {
			l.logger.Error("listener: WS listener exited with error", "error", err)
			errCh <- err
		}
	}()

	// Start account poller.
	wg.Add(1)
	go func() {
		defer wg.Done()
		l.logger.Info("listener: starting poller goroutine")
		if err := l.poller.Run(ctx); err != nil {
			l.logger.Error("listener: poller exited with error", "error", err)
			errCh <- err
		}
	}()

	l.logger.Info("listener: both goroutines running")

	// Wait for context cancellation or error.
	select {
	case <-ctx.Done():
		l.logger.Info("listener: context cancelled, shutting down")
		// Cancel to propagate to goroutines.
		cancel()
	case err := <-errCh:
		l.logger.Error("listener: goroutine error, shutting down", "error", err)
		// Cancel to stop the other goroutine.
		cancel()
	}

	// Wait for both goroutines to finish.
	wg.Wait()
	l.logger.Info("listener: all goroutines stopped")
	return nil
}
