import { useState, useCallback } from 'react';

/**
 * Steps within the pending state of a transaction lifecycle.
 */
export type TxStep = 'wallet-approval' | 'sending';

/**
 * Discriminated union representing the full transaction state machine.
 *
 * Transitions:
 * - idle → pending (wallet-approval) → pending (sending) → confirmed
 * - idle → pending → error (at any step)
 */
export type TxState =
  | { status: 'idle' }
  | { status: 'pending'; step: TxStep }
  | { status: 'confirmed'; signature: string }
  | { status: 'error'; error: string };

/**
 * Return type for the useTxState hook.
 */
export interface UseTxStateReturn {
  /** Current transaction state */
  state: TxState;
  /**
   * Execute a transaction function.
   * Handles the full lifecycle: idle → pending → confirmed/error.
   * The function should return a transaction signature string.
   */
  execute: (fn: () => Promise<string>) => Promise<void>;
  /** Reset state back to idle */
  reset: () => void;
}

/**
 * Generic transaction state machine hook.
 *
 * Usage:
 * ```tsx
 * const { state, execute, reset } = useTxState();
 *
 * const handleSubmit = async () => {
 *   await execute(() => program.methods.registerPet(...).rpc());
 * };
 * ```
 */
export function useTxState(): UseTxStateReturn {
  const [state, setState] = useState<TxState>({ status: 'idle' });

  const execute = useCallback(async (fn: () => Promise<string>) => {
    setState({ status: 'pending', step: 'wallet-approval' });

    try {
      setState({ status: 'pending', step: 'sending' });
      const signature = await fn();
      setState({ status: 'confirmed', signature });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: 'error', error: message });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  return { state, execute, reset };
}
