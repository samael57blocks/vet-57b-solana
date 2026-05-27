import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Appointment } from '../../pets/types/pet';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetAppointments = vi.fn();
const mockUseVetProgram = vi.fn();

vi.mock('../../solana/useVetProgram', () => ({
    useVetProgram: () => mockUseVetProgram(),
}));

vi.mock('../../appointments/services/solana/appointmentService', () => ({
    getAppointments: (...args: unknown[]) => mockGetAppointments(...args),
}));

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const sampleAppointments: Appointment[] = [
    {
        id: '111111111111111111111111111111111',
        petId: '222222222222222222222222222222222',
        date: 1715000000,
        time: '10:00',
        appointmentValue: 1_000_000_000,
        paidValue: 0,
    },
    {
        id: '333333333333333333333333333333333',
        petId: '444444444444444444444444444444444',
        date: 1715086400,
        time: '14:30',
        appointmentValue: 2_000_000_000,
        paidValue: 2_000_000_000,
    },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAppointments', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('VITE_USE_MOCK_DATA', 'false');
    });

    it('returns empty appointments when wallet is not connected', async () => {
        mockUseVetProgram.mockReturnValue(null);

        const { useAppointments } = await import('../../appointments/hooks/useAppointments');

        const { result } = renderHook(() => useAppointments());

        await act(async () => {
            await new Promise((r) => setTimeout(r, 0));
        });

        expect(result.current.appointments).toEqual([]);
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });

    it('returns loading state then appointments when program is available', async () => {
        const programStub = { account: {} };
        mockUseVetProgram.mockReturnValue(programStub);
        mockGetAppointments.mockResolvedValue(sampleAppointments);

        const { useAppointments } = await import('../../appointments/hooks/useAppointments');

        const { result } = renderHook(() => useAppointments());

        // Initial render — loading starts
        expect(result.current.loading).toBe(true);
        expect(result.current.appointments).toEqual([]);

        // Wait for resolution
        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.appointments).toHaveLength(2);
        expect(result.current.appointments[0].time).toBe('10:00');
        expect(result.current.appointments[1].paidValue).toBe(2_000_000_000);
        expect(result.current.error).toBeNull();
    });

    it('returns error state when RPC call fails', async () => {
        const programStub = { account: {} };
        mockUseVetProgram.mockReturnValue(programStub);
        mockGetAppointments.mockRejectedValue(new Error('RPC connection failed'));

        const { useAppointments } = await import('../../appointments/hooks/useAppointments');

        const { result } = renderHook(() => useAppointments());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.appointments).toEqual([]);
        expect(result.current.error).toBe('RPC connection failed');
    });

    it('refetches appointments when refetch is called', async () => {
        const programStub = { account: {} };
        mockUseVetProgram.mockReturnValue(programStub);
        mockGetAppointments.mockResolvedValue(sampleAppointments);

        const { useAppointments } = await import('../../appointments/hooks/useAppointments');

        const { result } = renderHook(() => useAppointments());

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.appointments).toHaveLength(2);
        expect(mockGetAppointments).toHaveBeenCalledTimes(1);

        // Set up new data for refetch
        const updatedAppointments = [sampleAppointments[0]];
        mockGetAppointments.mockResolvedValue(updatedAppointments);

        await act(async () => {
            result.current.refetch();
        });

        await waitFor(() => {
            expect(result.current.appointments).toHaveLength(1);
        });

        expect(mockGetAppointments).toHaveBeenCalledTimes(2);
    });

    it('resets to empty when wallet disconnects', async () => {
        const programStub = { account: {} };
        mockUseVetProgram.mockReturnValue(programStub);
        mockGetAppointments.mockResolvedValue(sampleAppointments);

        const { useAppointments } = await import('../../appointments/hooks/useAppointments');

        const { result, rerender } = renderHook(() => useAppointments());

        await waitFor(() => {
            expect(result.current.appointments).toHaveLength(2);
        });

        // Simulate wallet disconnect
        mockUseVetProgram.mockReturnValue(null);
        mockGetAppointments.mockClear();

        rerender();

        await waitFor(() => {
            expect(result.current.appointments).toEqual([]);
        });

        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });
});
