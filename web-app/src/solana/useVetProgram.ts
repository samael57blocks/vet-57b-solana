import { Program } from '@coral-xyz/anchor';
import { useMemo } from 'react';
import type { Vet57b } from './types/vet_57b';
import { useAnchorProvider } from './useAnchorProvider';
import idl from './idl/vet_57b.json';

/**
 * Typed hook that returns a Anchor `Program<Vet57b>` instance.
 *
 * Returns `null` when no wallet is connected.
 *
 * The program is memoized and recreated only when the provider changes.
 * The program ID is resolved from the IDL's `address` field.
 */
export function useVetProgram(): Program<Vet57b> | null {
  const provider = useAnchorProvider();

  return useMemo<Program<Vet57b> | null>(() => {
    if (!provider) {
      return null;
    }

    return new Program<Vet57b>(
      idl as unknown as Vet57b,
      provider,
    );
  }, [provider]);
}
