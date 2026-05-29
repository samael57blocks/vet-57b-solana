// Package solana defines a SolanaClient interface for interacting with the Solana
// blockchain via RPC and WebSocket. The interface enables test mocks (MockSolanaClient)
// to be swapped in for unit testing the listener and poller components.
//
// The real implementation (not in this phase) uses gagliardetto/solana-go's rpc.Client
// and ws.Client. This interface abstracts those away so the listener code depends only
// on the contract, not on the transport library.
package solana

import (
	"context"
	"fmt"
)

// AccountData holds the raw bytes of a Solana on-chain account together with its
// public key (as a base58-encoded string). The Data field contains the full
// account data including the Anchor 8-byte discriminator.
type AccountData struct {
	Pubkey string
	Data   []byte
}

// Subscription represents an active WebSocket subscription that can be terminated
// by calling Unsubscribe. After Unsubscribe returns, no more messages will be
// delivered on the associated channel.
type Subscription interface {
	Unsubscribe() error
}

// SolanaClient abstracts the Solana RPC and WebSocket interactions needed by the
// event indexer. A real implementation wraps gagliardetto/solana-go's rpc.Client
// and ws.Client. Tests use MockSolanaClient.
type SolanaClient interface {
	// GetProgramAccounts fetches all accounts owned by the given program that
	// match the specified DataSize filter. Returns the raw account data including
	// the Anchor 8-byte discriminator prefix.
	GetProgramAccounts(ctx context.Context, programID string, dataSize uint64) ([]AccountData, error)

	// SubscribeLogs opens a WebSocket subscription for log messages from the
	// given program ID. Returns a channel that receives slices of log lines
	// (each slice corresponds to one transaction's logs), and a Subscription
	// handle to close the subscription.
	//
	// The channel is closed by the client when the subscription terminates
	// (due to disconnect or Unsubscribe call).
	SubscribeLogs(ctx context.Context, programID string) (<-chan []string, Subscription, error)

	// Close shuts down all active connections and subscriptions. After Close
	// returns, the client MUST NOT be reused.
	Close() error
}

// MockSolanaClient is a mock implementation of SolanaClient for testing.
// Each method has a configurable function field. If a function field is nil,
// the method returns a sensible zero-value (empty slice, nil channel, etc.)
// rather than panicking.
type MockSolanaClient struct {
	GetProgramAccountsFn func(ctx context.Context, programID string, dataSize uint64) ([]AccountData, error)
	SubscribeLogsFn      func(ctx context.Context, programID string) (<-chan []string, Subscription, error)
	CloseFn              func() error
}

// Compile-time interface check.
var _ SolanaClient = (*MockSolanaClient)(nil)

// GetProgramAccounts calls GetProgramAccountsFn if set, otherwise returns an
// empty slice with no error.
func (m *MockSolanaClient) GetProgramAccounts(ctx context.Context, programID string, dataSize uint64) ([]AccountData, error) {
	if m.GetProgramAccountsFn == nil {
		return []AccountData{}, nil
	}
	return m.GetProgramAccountsFn(ctx, programID, dataSize)
}

// SubscribeLogs calls SubscribeLogsFn if set, otherwise returns a closed channel
// and a no-op subscription with no error.
func (m *MockSolanaClient) SubscribeLogs(ctx context.Context, programID string) (<-chan []string, Subscription, error) {
	if m.SubscribeLogsFn == nil {
		ch := make(chan []string)
		close(ch)
		return ch, &noopSubscription{}, nil
	}
	return m.SubscribeLogsFn(ctx, programID)
}

// Close calls CloseFn if set, otherwise returns nil.
func (m *MockSolanaClient) Close() error {
	if m.CloseFn == nil {
		return nil
	}
	return m.CloseFn()
}

// noopSubscription is a Subscription that does nothing on Unsubscribe.
type noopSubscription struct{}

func (s *noopSubscription) Unsubscribe() error { return nil }

// Ensure noopSubscription implements Subscription.
var _ Subscription = (*noopSubscription)(nil)

// NewMockSolanaClient creates a MockSolanaClient with default return values.
// Provide function fields to configure specific behaviors for your test.
func NewMockSolanaClient() *MockSolanaClient {
	return &MockSolanaClient{
		GetProgramAccountsFn: func(ctx context.Context, programID string, dataSize uint64) ([]AccountData, error) {
			return []AccountData{}, nil
		},
		SubscribeLogsFn: func(ctx context.Context, programID string) (<-chan []string, Subscription, error) {
			ch := make(chan []string)
			close(ch)
			return ch, &noopSubscription{}, nil
		},
		CloseFn: func() error { return nil },
	}
}

// ErrMock is a convenience error value for tests that need to simulate failures.
var ErrMock = fmt.Errorf("mock error")
