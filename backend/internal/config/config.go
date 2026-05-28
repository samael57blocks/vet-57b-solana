// Package config provides environment-based configuration for the backend service.
//
// Follows 12-factor app principles — all configuration from environment variables,
// no config files. Uses slog for structured logging on startup.
package config

import (
	"fmt"
	"os"
	"strings"
	"time"
)

// Config holds all configuration values for the backend service.
// Parse from environment variables via Parse().
type Config struct {
	// Solana RPC endpoint (default: http://localhost:8899)
	SolanaRPCURL string

	// Solana WebSocket endpoint (default: ws://localhost:8900)
	SolanaWSURL string

	// Anchor program ID (required)
	ProgramID string

	// PostgreSQL connection string (required)
	DatabaseURL string

	// HTTP server listen address (default: :4000)
	ListenAddr string

	// Account polling interval (default: 30s)
	PollInterval time.Duration

	// Maximum backoff for WebSocket reconnection (default: 60s)
	WSMaxBackoff time.Duration
}

// Parse reads configuration from environment variables and returns a validated Config.
// Returns an error if any required variable is missing or unparseable.
func Parse() (*Config, error) {
	cfg := &Config{
		SolanaRPCURL: envOrDefault("SOLANA_RPC_URL", "http://localhost:8899"),
		SolanaWSURL:  envOrDefault("SOLANA_WS_URL", "ws://localhost:8900"),
		ListenAddr:   envOrDefault("LISTEN_ADDR", ":4000"),
		PollInterval: durationOrDefault("POLL_INTERVAL", 30*time.Second),
		WSMaxBackoff: durationOrDefault("WS_MAX_BACKOFF", 60*time.Second),
	}

	// Required variables.
	cfg.ProgramID = os.Getenv("PROGRAM_ID")
	if cfg.ProgramID == "" {
		return nil, fmt.Errorf("config: PROGRAM_ID is required")
	}

	cfg.DatabaseURL = os.Getenv("DATABASE_URL")
	if cfg.DatabaseURL == "" {
		return nil, fmt.Errorf("config: DATABASE_URL is required")
	}

	// Normalize WS URL: if scheme is http/https, swap to ws/wss.
	cfg.SolanaWSURL = normalizeWSScheme(cfg.SolanaWSURL)

	return cfg, nil
}

// envOrDefault returns the value of the environment variable named by key,
// or defaultVal if the variable is not set or empty.
func envOrDefault(key, defaultVal string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultVal
}

// durationOrDefault parses the environment variable as a duration (Go syntax),
// returning defaultVal on missing or unparseable values.
func durationOrDefault(key string, defaultVal time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return defaultVal
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return defaultVal
	}
	return d
}

// normalizeWSScheme converts http/https schemes to ws/wss for WebSocket URLs.
func normalizeWSScheme(raw string) string {
	if strings.HasPrefix(raw, "http://") {
		return "ws://" + strings.TrimPrefix(raw, "http://")
	}
	if strings.HasPrefix(raw, "https://") {
		return "wss://" + strings.TrimPrefix(raw, "https://")
	}
	return raw
}

// String returns a redacted string representation of Config for logging.
// The database URL has its password masked.
func (c *Config) String() string {
	redactedDB := redactDSN(c.DatabaseURL)
	return fmt.Sprintf(
		"Config{SolanaRPCURL: %s, SolanaWSURL: %s, ProgramID: %s, DatabaseURL: %s, ListenAddr: %s, PollInterval: %s, WSMaxBackoff: %s}",
		c.SolanaRPCURL, c.SolanaWSURL, c.ProgramID, redactedDB, c.ListenAddr, c.PollInterval, c.WSMaxBackoff,
	)
}

// redactDSN masks the password portion of a PostgreSQL DSN.
func redactDSN(dsn string) string {
	// Simple redaction: if "password=" appears, mask its value.
	// This is intentionally basic — DSNs can be complex.
	lower := strings.ToLower(dsn)
	idx := strings.Index(lower, "password=")
	if idx < 0 {
		return dsn
	}
	rest := dsn[idx+9:] // after "password="
	end := strings.IndexAny(rest, " ")
	if end < 0 {
		return dsn[:idx+9] + "****"
	}
	return dsn[:idx+9] + "****" + rest[end:]
}
