import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { TxState } from '../../common/hooks/useTxState';
import type { Pet } from '../../pets/types/pet';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockOnSubmit = vi.fn();
const mockOnReset = vi.fn();

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const samplePets: Pet[] = [
    {
        id: 'pet-id-1',
        name: 'Buddy',
        age: 3,
        animalType: 'Dog',
        caretakerName: 'Alice',
        caretakerPhone: '555-0101',
    },
    {
        id: 'pet-id-2',
        name: 'Bella',
        age: 2,
        animalType: 'Cat',
        caretakerName: 'Bob',
        caretakerPhone: '555-0102',
    },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function idleTxState(): TxState {
    return { status: 'idle' };
}

function pendingTxState(): TxState {
    return { status: 'pending', step: 'wallet-approval' };
}

function confirmedTxState(): TxState {
    return { status: 'confirmed', signature: 'mock-schedule-sig-1234567890' };
}

function errorTxState(error = 'Transaction failed'): TxState {
    return { status: 'error', error };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ScheduleAppointmentForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders all form fields in idle state', async () => {
        const { ScheduleAppointmentForm } = await import(
            '../../appointments/components/ScheduleAppointmentForm'
        );

        render(
            <ScheduleAppointmentForm
                txState={idleTxState()}
                pets={samplePets}
                onSubmit={mockOnSubmit}
                onReset={mockOnReset}
                isWalletConnected={true}
            />,
        );

        // Check all form fields render
        expect(screen.getByLabelText('Pet')).toBeInTheDocument();
        expect(screen.getByLabelText('Date')).toBeInTheDocument();
        expect(screen.getByLabelText('Time')).toBeInTheDocument();
        expect(screen.getByLabelText('Amount (lamports)')).toBeInTheDocument();

        // Check submit button
        expect(
            screen.getByRole('button', { name: 'Schedule Appointment' }),
        ).toBeInTheDocument();
    });

    it('shows pet options in select', async () => {
        const { ScheduleAppointmentForm } = await import(
            '../../appointments/components/ScheduleAppointmentForm'
        );

        render(
            <ScheduleAppointmentForm
                txState={idleTxState()}
                pets={samplePets}
                onSubmit={mockOnSubmit}
                onReset={mockOnReset}
                isWalletConnected={true}
            />,
        );

        const petSelect = screen.getByLabelText('Pet');
        expect(petSelect).toBeInTheDocument();

        expect(screen.getByRole('option', { name: 'Buddy (Dog)' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'Bella (Cat)' })).toBeInTheDocument();
    });

    it('shows validation errors when submitting empty form', async () => {
        const { ScheduleAppointmentForm } = await import(
            '../../appointments/components/ScheduleAppointmentForm'
        );

        render(
            <ScheduleAppointmentForm
                txState={idleTxState()}
                pets={samplePets}
                onSubmit={mockOnSubmit}
                onReset={mockOnReset}
                isWalletConnected={true}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'Schedule Appointment' }));

        await waitFor(() => {
            expect(screen.getByText('Please select a pet')).toBeInTheDocument();
            expect(screen.getByText('Date is required')).toBeInTheDocument();
            expect(screen.getByText('Time is required')).toBeInTheDocument();
            expect(screen.getByText('Amount must be a positive number')).toBeInTheDocument();
        });

        expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('disables form fields during pending state', async () => {
        const { ScheduleAppointmentForm } = await import(
            '../../appointments/components/ScheduleAppointmentForm'
        );

        render(
            <ScheduleAppointmentForm
                txState={pendingTxState()}
                pets={samplePets}
                onSubmit={mockOnSubmit}
                onReset={mockOnReset}
                isWalletConnected={true}
            />,
        );

        expect(screen.getByLabelText('Pet')).toBeDisabled();
        expect(screen.getByLabelText('Date')).toBeDisabled();
        expect(screen.getByLabelText('Time')).toBeDisabled();
        expect(screen.getByLabelText('Amount (lamports)')).toBeDisabled();

        expect(
            screen.getByRole('button', { name: /Approve in wallet/i }),
        ).toBeDisabled();
    });

    it('shows success state with explorer link when confirmed', async () => {
        const { ScheduleAppointmentForm } = await import(
            '../../appointments/components/ScheduleAppointmentForm'
        );

        render(
            <ScheduleAppointmentForm
                txState={confirmedTxState()}
                pets={samplePets}
                onSubmit={mockOnSubmit}
                onReset={mockOnReset}
                isWalletConnected={true}
            />,
        );

        expect(
            screen.getByText('Appointment Scheduled Successfully!'),
        ).toBeInTheDocument();

        const explorerLink = screen.getByRole('link');
        expect(explorerLink).toHaveAttribute(
            'href',
            'https://explorer.solana.com/tx/mock-schedule-sig-1234567890?cluster=devnet',
        );

        expect(
            screen.getByRole('button', { name: 'Schedule Another Appointment' }),
        ).toBeInTheDocument();
    });

    it('calls onReset when clicking "Schedule Another Appointment" in confirmed state', async () => {
        const { ScheduleAppointmentForm } = await import(
            '../../appointments/components/ScheduleAppointmentForm'
        );

        render(
            <ScheduleAppointmentForm
                txState={confirmedTxState()}
                pets={samplePets}
                onSubmit={mockOnSubmit}
                onReset={mockOnReset}
                isWalletConnected={true}
            />,
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'Schedule Another Appointment' }),
        );

        expect(mockOnReset).toHaveBeenCalledOnce();
    });

    it('shows error state with message', async () => {
        const { ScheduleAppointmentForm } = await import(
            '../../appointments/components/ScheduleAppointmentForm'
        );

        render(
            <ScheduleAppointmentForm
                txState={errorTxState('Insufficient funds')}
                pets={samplePets}
                onSubmit={mockOnSubmit}
                onReset={mockOnReset}
                isWalletConnected={true}
            />,
        );

        expect(screen.getByText('Failed to Schedule Appointment')).toBeInTheDocument();
        expect(screen.getByText('Insufficient funds')).toBeInTheDocument();

        expect(
            screen.getByRole('button', { name: 'Try Again' }),
        ).toBeInTheDocument();
    });

    it('shows connect wallet warning when not connected', async () => {
        const { ScheduleAppointmentForm } = await import(
            '../../appointments/components/ScheduleAppointmentForm'
        );

        render(
            <ScheduleAppointmentForm
                txState={idleTxState()}
                pets={samplePets}
                onSubmit={mockOnSubmit}
                onReset={mockOnReset}
                isWalletConnected={false}
            />,
        );

        expect(
            screen.getByText('Connect your wallet first'),
        ).toBeInTheDocument();
    });

    it('calls onSubmit with form data when valid', async () => {
        const { ScheduleAppointmentForm } = await import(
            '../../appointments/components/ScheduleAppointmentForm'
        );

        mockOnSubmit.mockResolvedValue(undefined);

        render(
            <ScheduleAppointmentForm
                txState={idleTxState()}
                pets={samplePets}
                onSubmit={mockOnSubmit}
                onReset={mockOnReset}
                isWalletConnected={true}
            />,
        );

        // Fill in the form
        fireEvent.change(screen.getByLabelText('Pet'), {
            target: { value: 'pet-id-1' },
        });

        fireEvent.change(screen.getByLabelText('Date'), {
            target: { value: '2026-06-15' },
        });

        fireEvent.change(screen.getByLabelText('Time'), {
            target: { value: '10:00' },
        });

        fireEvent.change(screen.getByLabelText('Amount (lamports)'), {
            target: { value: '1000000000' },
        });

        // Submit
        fireEvent.click(screen.getByRole('button', { name: 'Schedule Appointment' }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledOnce();
        });

        const calledWith = mockOnSubmit.mock.calls[0][0];
        expect(calledWith.petId).toBe('pet-id-1');
        expect(calledWith.date).toBe('2026-06-15');
        expect(calledWith.time).toBe('10:00');
        expect(calledWith.amount).toBe('1000000000');
    });
});
