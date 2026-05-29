// Package db provides PostgreSQL connection pooling and migration execution.
//
// Uses pgx v5 with pgxpool for concurrent access from the WebSocket listener,
// account poller, and REST API handlers. Migrations are embedded SQL files
// executed in order at startup.
package db

import (
	"cmp"
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect creates a new pgxpool connection pool using the provided database URL.
// Returns a pool that is ready to accept queries. The caller MUST call pool.Close()
// on shutdown.
func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("db: parse config: %w", err)
	}

	// Sensible pool defaults for concurrent WS listener + poller + API handlers.
	cfg.MaxConns = 10
	cfg.MinConns = 2

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("db: create pool: %w", err)
	}

	// Verify connectivity.
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("db: ping failed: %w", err)
	}

	slog.Info("db: connected to PostgreSQL", "max_conns", cfg.MaxConns, "min_conns", cfg.MinConns)
	return pool, nil
}

// RunMigrations reads all .sql files from the given directory, sorts them
// alphabetically (by filename), and executes each one in a single transaction.
//
// The function uses the pool directly (not a tx) so each migration file is its
// own implicit transaction. This keeps the migration runner simple — if a
// migration file fails, it fails atomically within that file's execution.
//
// Migration files MUST be idempotent (use IF NOT EXISTS / ON CONFLICT) so that
// re-running the migration after a partial failure is safe.
//
// dir is the path to the migrations directory. If dir does not exist, no error
// is returned (useful for development environments without migrations).
func RunMigrations(ctx context.Context, pool *pgxpool.Pool, dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			slog.Warn("db: migrations directory not found, skipping", "dir", dir)
			return nil
		}
		return fmt.Errorf("db: read migrations dir: %w", err)
	}

	// Collect and sort .sql files.
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	if len(files) == 0 {
		slog.Info("db: no migration files found", "dir", dir)
		return nil
	}

	for _, f := range files {
		path := filepath.Join(dir, f)
		if err := execMigration(ctx, pool, path); err != nil {
			return fmt.Errorf("db: migration %s: %w", f, err)
		}
		slog.Info("db: migration applied", "file", f)
	}

	return nil
}

// execMigration reads and executes a single SQL migration file.
func execMigration(ctx context.Context, pool *pgxpool.Pool, path string) error {
	sql, err := os.ReadFile(path)
	if err != nil {
		return fmt.Errorf("read file: %w", err)
	}

	// Trim whitespace and skip empty files.
	contents := strings.TrimSpace(string(sql))
	if contents == "" {
		return nil
	}

	if _, err := pool.Exec(ctx, contents); err != nil {
		return fmt.Errorf("exec: %w", err)
	}

	return nil
}

// DefaultMigrationsDir returns the default path to the migrations directory
// relative to the project root. It uses the BACKEND_MIGRATIONS_DIR env var if set,
// otherwise falls back to "internal/db/migrations".
func DefaultMigrationsDir() string {
	return cmp.Or(os.Getenv("BACKEND_MIGRATIONS_DIR"), "internal/db/migrations")
}
