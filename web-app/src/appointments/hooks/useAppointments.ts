import { useEffect, useState, useCallback } from 'react';
import type { Appointment } from '../../pets/types/pet';
import { useVetProgram } from '../../solana/useVetProgram';
import { getAppointments } from '../services/solana/appointmentService';

/**
 * Return type for the useAppointments hook.
 */
export interface UseAppointmentsReturn {
    /** The list of appointments fetched from on-chain */
    appointments: Appointment[];
    /** Whether the data is currently being fetched */
    loading: boolean;
    /** Error message if fetching failed */
    error: string | null;
    /** Re-fetch appointments from on-chain */
    refetch: () => void;
}

/**
 * Hook that fetches all MedicalAppointment accounts from the Solana program
 * using the connected wallet.
 *
 * Handles:
 * - Disconnected wallet → empty appointments
 * - Loading state → skeleton ready
 * - Error state with retry
 * - Empty state → CTA to schedule appointment
 */
export function useAppointments(): UseAppointmentsReturn {
    const program = useVetProgram();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAppointments = useCallback(async () => {
        if (!program) {
            setAppointments([]);
            setLoading(false);
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await getAppointments(program);
            setAppointments(result);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message);
            setAppointments([]);
        } finally {
            setLoading(false);
        }
    }, [program]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    return { appointments, loading, error, refetch: fetchAppointments };
}
