import { useEffect, useState, useCallback } from 'react';
import type { Appointment } from '../../pets/types/pet';
import { useVetProgram } from '../../solana/useVetProgram';
import { getAppointments } from '../services/solana/appointmentService';

/**
 * Mock appointments used when VITE_USE_MOCK_DATA=true.
 */
const MOCK_APPOINTMENTS: Appointment[] = [
    {
        id: 'mock-appt-1',
        petId: '1',
        date: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days from now
        time: '10:00',
        appointmentValue: 100_000_000, // 0.1 SOL
        paidValue: 0,
    },
    {
        id: 'mock-appt-2',
        petId: '2',
        date: Math.floor(Date.now() / 1000) + 86400 * 14, // 14 days from now
        time: '14:30',
        appointmentValue: 200_000_000, // 0.2 SOL
        paidValue: 200_000_000, // Already paid
    },
];

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
 * When VITE_USE_MOCK_DATA=true, returns mock data without needing a Solana validator.
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
        const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

        // Mock mode: return mock data without needing on-chain connection
        if (isMockMode) {
            setLoading(true);
            setError(null);
            try {
                // Simulate network delay
                await new Promise(resolve => setTimeout(resolve, 300));
                setAppointments(MOCK_APPOINTMENTS);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                setError(message);
                setAppointments([]);
            } finally {
                setLoading(false);
            }
            return;
        }

        // On-chain mode: requires a connected wallet + running validator
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
