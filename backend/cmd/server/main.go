// Command server is the entry point for the vet-57b backend service.
//
// It wires together all components:
//   - Configuration (environment variables via config.Parse)
//   - PostgreSQL connection pool (pgxpool via db.Connect)
//   - SQL migrations (embedded at internal/db/migrations)
//   - Solana RPC + WebSocket clients (via solana.NewRealSolanaClient)
//   - Event indexer (WS subscription + account poller via listener)
//   - REST API (chi router via api.NewRouter)
//   - Signal handling (SIGTERM/SIGINT → graceful shutdown)
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/57blocks/vet-57b-backend/internal/api"
	"github.com/57blocks/vet-57b-backend/internal/config"
	"github.com/57blocks/vet-57b-backend/internal/db"
	"github.com/57blocks/vet-57b-backend/internal/listener"
	"github.com/57blocks/vet-57b-backend/internal/solana"
)

func main() {
	// -----------------------------------------------------------------------
	// 1. Parse configuration from environment variables.
	// -----------------------------------------------------------------------
	cfg, err := config.Parse()
	if err != nil {
		slog.Error("config: parse failed", "error", err)
		os.Exit(1)
	}
	slog.Info("config loaded", "config", cfg)

	// -----------------------------------------------------------------------
	// 2. Create root context with cancellation.
	//    Cancelling this context triggers shutdown of all goroutines.
	// -----------------------------------------------------------------------
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// -----------------------------------------------------------------------
	// 3. Connect to PostgreSQL via pgxpool.
	// -----------------------------------------------------------------------
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("db: connect failed", "error", err)
		os.Exit(1)
	}
	defer func() {
		pool.Close()
		slog.Info("db: connection pool closed")
	}()

	// -----------------------------------------------------------------------
	// 4. Run SQL migrations at startup.
	// -----------------------------------------------------------------------
	migrationsDir := db.DefaultMigrationsDir()
	if err := db.RunMigrations(ctx, pool, migrationsDir); err != nil {
		slog.Error("db: migration failed", "error", err, "dir", migrationsDir)
		os.Exit(1)
	}

	// -----------------------------------------------------------------------
	// 5. Create Solana RPC + WebSocket clients.
	// -----------------------------------------------------------------------
	solClient, err := solana.NewRealSolanaClient(cfg.SolanaRPCURL, cfg.SolanaWSURL)
	if err != nil {
		slog.Error("solana: client creation failed", "error", err)
		os.Exit(1)
	}
	defer func() {
		if err := solClient.Close(); err != nil {
			slog.Error("solana: close error", "error", err)
		}
	}()

	// -----------------------------------------------------------------------
	// 6. Create DB queries and EventStore adapter for the indexer.
	// -----------------------------------------------------------------------
	queries := db.NewQueries(pool)
	store := listener.NewDBAdapter(queries)

	// -----------------------------------------------------------------------
	// 7. Start the event indexer (WebSocket listener + account poller).
	// -----------------------------------------------------------------------
	lis := listener.New(solClient, store, cfg.ProgramID, cfg.PollInterval, cfg.WSMaxBackoff)

	errCh := make(chan error, 2)

	go func() {
		slog.Info("starting event listener")
		if err := lis.Start(ctx); err != nil {
			slog.Error("listener: exited with error", "error", err)
			errCh <- err
		}
	}()

	// -----------------------------------------------------------------------
	// 8. Start the HTTP server with chi router.
	// -----------------------------------------------------------------------
	router := api.NewRouter(queries)
	httpServer := &http.Server{
		Addr:    cfg.ListenAddr,
		Handler: router,
	}

	go func() {
		slog.Info("starting HTTP server", "addr", cfg.ListenAddr)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("http: server error", "error", err)
			errCh <- err
		}
	}()

	// -----------------------------------------------------------------------
	// 9. Wait for shutdown signal (SIGINT/SIGTERM) or service error.
	// -----------------------------------------------------------------------
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		slog.Info("received signal, shutting down", "signal", sig)
	case err := <-errCh:
		slog.Error("service error, initiating shutdown", "error", err)
	}

	// -----------------------------------------------------------------------
	// 10. Graceful shutdown.
	//     Order: cancel context → listener goroutines stop → HTTP drain.
	// -----------------------------------------------------------------------

	// Cancel the root context → listener.Start() returns (WS + poller stop).
	cancel()

	// Give the HTTP server a deadline for in-flight request completion.
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := httpServer.Shutdown(shutdownCtx); err != nil {
		slog.Error("http: shutdown error", "error", err)
	}

	slog.Info("shutdown complete")
}
