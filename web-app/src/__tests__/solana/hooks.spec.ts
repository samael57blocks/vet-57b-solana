import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// useVetProgram tests
// ---------------------------------------------------------------------------

const mockUseConnection = vi.fn();
const mockUseAnchorWallet = vi.fn();

vi.mock('@solana/wallet-adapter-react', () => ({
  useConnection: () => mockUseConnection(),
  useAnchorWallet: () => mockUseAnchorWallet(),
}));

describe('useVetProgram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no connection, no wallet
    mockUseConnection.mockReturnValue({ connection: null });
    mockUseAnchorWallet.mockReturnValue(null);
  });

  it('returns null when no wallet is connected', async () => {
    // Dynamic import so mocks are in place
    const { useVetProgram } = await import('../../solana/useVetProgram');
    const { result } = renderHook(() => useVetProgram());

    expect(result.current).toBeNull();
  });

  it('returns null when connection is available but wallet is not', async () => {
    mockUseConnection.mockReturnValue({ connection: {} });
    mockUseAnchorWallet.mockReturnValue(null);

    const { useVetProgram } = await import('../../solana/useVetProgram');
    const { result } = renderHook(() => useVetProgram());

    expect(result.current).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// useTxState tests
// ---------------------------------------------------------------------------

describe('useTxState', () => {
  beforeEach(() => {
    // Clear all module registry to get fresh hooks each time
    vi.resetModules();
  });

  it('starts in idle state', async () => {
    const { useTxState } = await import('../../common/hooks/useTxState');
    const { result } = renderHook(() => useTxState());

    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('transitions through pending steps to confirmed on success', async () => {
    const { useTxState } = await import('../../common/hooks/useTxState');
    const { result } = renderHook(() => useTxState());

    const executePromise = act(async () => {
      await result.current.execute(() => Promise.resolve('test-signature-123'));
    });

    await executePromise;

    expect(result.current.state).toEqual({
      status: 'confirmed',
      signature: 'test-signature-123',
    });
  });

  it('transitions to error when the function rejects', async () => {
    const { useTxState } = await import('../../common/hooks/useTxState');
    const { result } = renderHook(() => useTxState());

    const executePromise = act(async () => {
      await result.current.execute(() => Promise.reject(new Error('User rejected')));
    });

    await executePromise;

    expect(result.current.state).toEqual({
      status: 'error',
      error: 'User rejected',
    });
  });

  it('handles string errors gracefully', async () => {
    const { useTxState } = await import('../../common/hooks/useTxState');
    const { result } = renderHook(() => useTxState());

    const executePromise = act(async () => {
      await result.current.execute(() => Promise.reject('something went wrong'));
    });

    await executePromise;

    expect(result.current.state).toEqual({
      status: 'error',
      error: 'something went wrong',
    });
  });

  it('reset returns state to idle', async () => {
    const { useTxState } = await import('../../common/hooks/useTxState');
    const { result } = renderHook(() => useTxState());

    // First transition to confirmed
    await act(async () => {
      await result.current.execute(() => Promise.resolve('sig'));
    });

    expect(result.current.state).toEqual({ status: 'confirmed', signature: 'sig' });

    // Then reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('can execute again after reset', async () => {
    const { useTxState } = await import('../../common/hooks/useTxState');
    const { result } = renderHook(() => useTxState());

    // Execute first time
    await act(async () => {
      await result.current.execute(() => Promise.resolve('sig-1'));
    });

    expect(result.current.state).toEqual({ status: 'confirmed', signature: 'sig-1' });

    // Reset
    act(() => {
      result.current.reset();
    });

    // Execute second time
    await act(async () => {
      await result.current.execute(() => Promise.resolve('sig-2'));
    });

    expect(result.current.state).toEqual({ status: 'confirmed', signature: 'sig-2' });
  });
});
