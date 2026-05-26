import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { AnchorProvider } from '@coral-xyz/anchor';
import type { Wallet } from '@coral-xyz/anchor';
import { useMemo } from 'react';

/**
 * Creates an AnchorProvider from the wallet-adapter context.
 *
 * Returns `null` when no wallet is connected.
 * The provider is memoized and recreated only when the connection or wallet changes.
 */
export function useAnchorProvider(): AnchorProvider | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo<AnchorProvider | null>(() => {
    if (!connection || !wallet) {
      return null;
    }

    return new AnchorProvider(
      connection,
      wallet as unknown as Wallet,
      AnchorProvider.defaultOptions(),
    );
  }, [connection, wallet]);
}
