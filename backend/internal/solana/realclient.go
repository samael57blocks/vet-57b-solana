package solana

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/gagliardetto/solana-go"
	"github.com/gagliardetto/solana-go/rpc"
	"github.com/gagliardetto/solana-go/rpc/ws"
)

// RealSolanaClient implements SolanaClient using gagliardetto/solana-go's
// RPC (rpc.Client) and WebSocket (rpc/ws.Client) clients. This is the real
// implementation used in production — tests use MockSolanaClient.
type RealSolanaClient struct {
	rpcClient *rpc.Client
	wsClient  *ws.Client
	logger    *slog.Logger
}

// NewRealSolanaClient creates a new RealSolanaClient connected to the given
// RPC and WebSocket endpoints.
func NewRealSolanaClient(rpcURL, wsURL string) (*RealSolanaClient, error) {
	rpcClient := rpc.New(rpcURL)

	wsClient, err := ws.Connect(context.Background(), wsURL)
	if err != nil {
		return nil, fmt.Errorf("solana: connect ws: %w", err)
	}

	return &RealSolanaClient{
		rpcClient: rpcClient,
		wsClient:  wsClient,
		logger:    slog.With("component", "solana"),
	}, nil
}

// GetProgramAccounts fetches all accounts owned by the given program that match
// the specified DataSize filter. Uses GetProgramAccountsWithOpts on the RPC
// client with the base64 encoding.
func (c *RealSolanaClient) GetProgramAccounts(ctx context.Context, programID string, dataSize uint64) ([]AccountData, error) {
	pubkey, err := solana.PublicKeyFromBase58(programID)
	if err != nil {
		return nil, fmt.Errorf("solana: parse program ID: %w", err)
	}

	opts := &rpc.GetProgramAccountsOpts{
		Filters: []rpc.RPCFilter{
			{DataSize: dataSize},
		},
	}

	result, err := c.rpcClient.GetProgramAccountsWithOpts(ctx, pubkey, opts)
	if err != nil {
		return nil, fmt.Errorf("solana: get program accounts: %w", err)
	}

	accounts := make([]AccountData, 0, len(result))
	for _, ka := range result {
		if ka.Account == nil || ka.Account.Data == nil {
			c.logger.Warn("solana: skipping nil account data", "pubkey", ka.Pubkey.String())
			continue
		}
		accounts = append(accounts, AccountData{
			Pubkey: ka.Pubkey.String(),
			Data:   ka.Account.Data.GetBinary(),
		})
	}

	return accounts, nil
}

// SubscribeLogs opens a WebSocket subscription for log messages from the given
// program ID. Returns a channel that receives slices of log lines, and a
// Subscription handle to close the subscription.
//
// The channel is closed when the subscription terminates (due to disconnect
// or context cancellation).
func (c *RealSolanaClient) SubscribeLogs(ctx context.Context, programID string) (<-chan []string, Subscription, error) {
	pubkey, err := solana.PublicKeyFromBase58(programID)
	if err != nil {
		return nil, nil, fmt.Errorf("solana: parse program ID: %w", err)
	}

	sub, err := c.wsClient.LogsSubscribeMentions(pubkey, rpc.CommitmentFinalized)
	if err != nil {
		return nil, nil, fmt.Errorf("solana: subscribe logs: %w", err)
	}

	logCh := make(chan []string)

	go func() {
		defer close(logCh)
		for {
			msg, err := sub.Recv(ctx)
			if err != nil {
				return
			}
			if msg == nil || msg.Value.Logs == nil {
				continue
			}

			select {
			case logCh <- msg.Value.Logs:
			case <-ctx.Done():
				return
			}
		}
	}()

	return logCh, &wsLogSubscription{sub: sub}, nil
}

// Close shuts down the WebSocket and RPC connections.
func (c *RealSolanaClient) Close() error {
	c.wsClient.Close()
	if err := c.rpcClient.Close(); err != nil {
		return fmt.Errorf("solana: close rpc: %w", err)
	}
	return nil
}

// wsLogSubscription wraps a ws.LogSubscription to implement the Subscription
// interface (which returns error from Unsubscribe).
type wsLogSubscription struct {
	sub *ws.LogSubscription
}

func (s *wsLogSubscription) Unsubscribe() error {
	s.sub.Unsubscribe()
	return nil
}

// Compile-time interface check.
var _ SolanaClient = (*RealSolanaClient)(nil)
