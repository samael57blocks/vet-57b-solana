package solana

import (
	"context"
	"errors"
	"testing"
)

func TestMockSolanaClient_GetProgramAccounts(t *testing.T) {
	tests := []struct {
		name     string
		fn       func(ctx context.Context, programID string, dataSize uint64) ([]AccountData, error)
		wantErr  bool
		wantLen  int
		wantPk   string
	}{
		{
			name:    "default returns empty slice",
			wantLen: 0,
		},
		{
			name: "returns accounts from function",
			fn: func(ctx context.Context, programID string, dataSize uint64) ([]AccountData, error) {
				return []AccountData{
					{Pubkey: "abc", Data: []byte{1, 2, 3}},
				}, nil
			},
			wantLen: 1,
			wantPk:  "abc",
		},
		{
			name: "propagates error",
			fn: func(ctx context.Context, programID string, dataSize uint64) ([]AccountData, error) {
				return nil, errors.New("rpc error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &MockSolanaClient{GetProgramAccountsFn: tt.fn}
			results, err := m.GetProgramAccounts(context.Background(), "prog", 100)
			if (err != nil) != tt.wantErr {
				t.Errorf("GetProgramAccounts() error = %v, wantErr = %v", err, tt.wantErr)
				return
			}
			if len(results) != tt.wantLen {
				t.Errorf("got %d results, want %d", len(results), tt.wantLen)
			}
			if tt.wantLen > 0 && results[0].Pubkey != tt.wantPk {
				t.Errorf("got pubkey %q, want %q", results[0].Pubkey, tt.wantPk)
			}
		})
	}
}

func TestMockSolanaClient_SubscribeLogs(t *testing.T) {
	tests := []struct {
		name    string
		fn      func(ctx context.Context, programID string) (<-chan []string, Subscription, error)
		wantErr bool
	}{
		{
			name: "default returns closed channel",
			fn:   nil,
		},
		{
			name: "returns logs channel",
			fn: func(ctx context.Context, programID string) (<-chan []string, Subscription, error) {
				ch := make(chan []string, 1)
				ch <- []string{"log line"}
				close(ch)
				return ch, &noopSubscription{}, nil
			},
		},
		{
			name: "propagates error",
			fn: func(ctx context.Context, programID string) (<-chan []string, Subscription, error) {
				return nil, nil, errors.New("ws error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &MockSolanaClient{SubscribeLogsFn: tt.fn}
			ch, sub, err := m.SubscribeLogs(context.Background(), "prog")
			if (err != nil) != tt.wantErr {
				t.Errorf("SubscribeLogs() error = %v, wantErr = %v", err, tt.wantErr)
				return
			}
			if err != nil {
				return
			}
			if ch == nil {
				t.Error("got nil channel")
			}
			if sub == nil {
				t.Error("got nil subscription")
			}
			// Read available log entries.
			for range ch {
				// drain
			}
		})
	}
}

func TestMockSolanaClient_Close(t *testing.T) {
	tests := []struct {
		name    string
		fn      func() error
		wantErr bool
	}{
		{
			name: "default returns nil",
		},
		{
			name: "returns error",
			fn: func() error {
				return errors.New("close error")
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			m := &MockSolanaClient{CloseFn: tt.fn}
			err := m.Close()
			if (err != nil) != tt.wantErr {
				t.Errorf("Close() error = %v, wantErr = %v", err, tt.wantErr)
			}
		})
	}
}

func TestNewMockSolanaClient(t *testing.T) {
	m := NewMockSolanaClient()
	if m == nil {
		t.Fatal("NewMockSolanaClient() returned nil")
	}
	// Default methods should not panic.
	ctx := context.Background()
	accounts, err := m.GetProgramAccounts(ctx, "prog", 100)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if len(accounts) != 0 {
		t.Errorf("expected 0 accounts, got %d", len(accounts))
	}

	ch, sub, err := m.SubscribeLogs(ctx, "prog")
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if ch == nil {
		t.Error("got nil channel")
	}
	if sub == nil {
		t.Error("got nil subscription")
	}

	if err := m.Close(); err != nil {
		t.Errorf("unexpected error: %v", err)
	}
}
