import { useEffect, useState, useCallback } from 'react';
import type { Pet } from '../types/pet';
import { useVetProgram } from '../../solana/useVetProgram';
import { getPets } from '../services/solana/petService';

/**
 * Return type for the usePetsOverview hook.
 */
export interface UsePetsOverviewReturn {
    /** The list of pets fetched from on-chain */
    pets: Pet[];
    /** Whether the data is currently being fetched */
    loading: boolean;
    /** Error message if fetching failed */
    error: string | null;
    /** Re-fetch pets from on-chain */
    refetch: () => void;
}

/**
 * Hook that fetches all MedicalRecord accounts from the Solana program
 * using the connected wallet. Returns pets, loading state, error state, and a refetch function.
 *
 * Handles:
 * - Disconnected wallet → empty pets
 * - Loading state → skeleton ready
 * - Error state with retry
 * - Empty state → CTA to register
 */
export function usePetsOverview(): UsePetsOverviewReturn {
    const program = useVetProgram();
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPets = useCallback(async () => {
        if (!program) {
            setPets([]);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await getPets(program);
            setPets(result);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            setPets([]);
        } finally {
            setLoading(false);
        }
    }, [program]);

    useEffect(() => {
        fetchPets();
    }, [fetchPets]);

    return { pets, loading, error, refetch: fetchPets };
}
