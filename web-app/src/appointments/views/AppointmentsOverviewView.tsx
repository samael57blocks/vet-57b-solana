import { useState } from 'react';
import type { Appointment } from '../../pets/types/pet';
import type { Pet } from '../../pets/types/pet';
import { AppointmentList } from '../components/AppointmentList';
import { ScheduleAppointmentForm } from '../components/ScheduleAppointmentForm';
import { PayAppointmentButton } from '../components/PayAppointmentButton';
import { useTxState } from '../../common/hooks/useTxState';
import { useVetProgram } from '../../solana/useVetProgram';
import { scheduleAppointment, payAppointment } from '../services/solana/appointmentService';

/**
 * Props for the AppointmentsOverviewView component.
 */
interface AppointmentsOverviewViewProps {
    /** List of appointments to display */
    appointments: Appointment[];
    /** List of pets for the schedule form */
    pets: Pet[];
    /** Whether data is loading */
    loading: boolean;
    /** Error message if fetching failed */
    error: string | null;
    /** Retry callback for error state */
    onRetry: () => void;
    /** Refetch both appointments and pets after mutation */
    onMutated: () => void;
    /** Whether the wallet is connected */
    isWalletConnected: boolean;
}

/**
 * ScheduleAppointmentFormData from the ScheduleAppointmentForm component.
 */
interface ScheduleFormData {
    petId: string;
    date: string;
    time: string;
    amount: string;
}

/**
 * AppointmentsOverviewView Component
 *
 * Displays on-chain appointments with loading/error/empty states.
 * Shows ScheduleAppointmentForm dialog for scheduling new appointments.
 * Inline PayAppointmentButton for paying pending appointments.
 * Handles the full transaction lifecycle for on-chain operations.
 */
export function AppointmentsOverviewView({
    appointments,
    pets,
    loading,
    error,
    onRetry,
    onMutated,
    isWalletConnected,
}: AppointmentsOverviewViewProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const scheduleTxState = useTxState();
    const payTxState = useTxState();
    const [payingAppointmentId, setPayingAppointmentId] = useState<string | null>(null);
    const program = useVetProgram();

    const openDialog = () => setIsDialogOpen(true);

    const closeDialog = () => {
        setIsDialogOpen(false);
        scheduleTxState.reset();
    };

    const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

    const handleScheduleAppointment = async (data: ScheduleFormData) => {
        if (!program && !isMockMode) return;

        // Mock mode: simulate successful scheduling
        if (isMockMode) {
            console.log('[Mock] Scheduling appointment for pet:', data.petId);
            onMutated();
            return;
        }

        // Convert date string (YYYY-MM-DD) to unix timestamp
        const dateTimestamp = Math.floor(new Date(data.date + 'T' + data.time).getTime() / 1000);

        await scheduleTxState.execute(async () => {
            return scheduleAppointment(program!, {
                petId: data.petId,
                date: dateTimestamp,
                time: data.time,
                appointmentValue: Number(data.amount),
            });
        });

        // Refresh data after scheduling
        onMutated();
    };

    const handlePayAppointment = async (appointmentId: string, amount: number) => {
        if (!program && !isMockMode) return;

        // Mock mode: simulate successful payment
        if (isMockMode) {
            console.log('[Mock] Paying appointment:', appointmentId, amount);
            onMutated();
            return;
        }

        await payTxState.execute(async () => {
            return payAppointment(program!, appointmentId, amount);
        });

        // Refresh data after payment
        onMutated();
    };

    const handlePayClick = (appointmentId: string) => {
        setPayingAppointmentId(appointmentId);
    };

    // Wallet not connected
    if (!isWalletConnected) {
        return (
            <main className="main-content">
                <div className="page-header">
                    <h1 className="page-title">Appointments</h1>
                </div>
                <div className="empty-state">
                    <div className="empty-state-icon">📅</div>
                    <p className="empty-state-text">Connect wallet to see your appointments</p>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            <div className="page-header">
                <h1 className="page-title">Appointments</h1>
                <button className="btn-primary" onClick={openDialog}>
                    Schedule Appointment
                </button>
            </div>

            {/* Appointment List */}
            <AppointmentList
                appointments={appointments}
                pets={pets}
                loading={loading}
                error={error}
                onRetry={onRetry}
                onPayAppointment={handlePayClick}
            />

            {/* Inline Pay Appointment (shown below the list when triggered) */}
            {payingAppointmentId && (
                <div className="pay-appointment-section">
                    <h3>Pay Appointment</h3>
                    <PayAppointmentButton
                        appointmentId={payingAppointmentId}
                        txState={payTxState.state}
                        onSubmit={handlePayAppointment}
                        onReset={() => {
                            payTxState.reset();
                            setPayingAppointmentId(null);
                        }}
                        isWalletConnected={isWalletConnected}
                    />
                </div>
            )}

            {/* Schedule Appointment Dialog */}
            {isDialogOpen && (
                <div className="dialog-overlay" onClick={closeDialog}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <h2 className="dialog-title">Schedule New Appointment</h2>

                        <ScheduleAppointmentForm
                            txState={scheduleTxState.state}
                            pets={pets}
                            onSubmit={handleScheduleAppointment}
                            onReset={scheduleTxState.reset}
                            isWalletConnected={isWalletConnected}
                        />

                        <div className="dialog-actions">
                            <button
                                type="button"
                                className="btn-secondary"
                                onClick={closeDialog}
                                disabled={scheduleTxState.state.status === 'pending'}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
