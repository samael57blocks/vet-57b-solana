import type { Appointment } from '../../pets/types/pet';

/**
 * Props for the AppointmentList component.
 */
interface AppointmentListProps {
    /** List of appointments to display */
    appointments: Appointment[];
    /** Whether data is loading */
    loading: boolean;
    /** Error message if fetching failed */
    error: string | null;
    /** Retry callback for error state */
    onRetry: () => void;
    /** Callback when user wants to pay an appointment */
    onPayAppointment: (appointmentId: string) => void;
}

/**
 * Determines the payment status of an appointment.
 */
type PaymentStatus = 'paid' | 'pending';

function getPaymentStatus(appointment: Appointment): PaymentStatus {
    return appointment.paidValue >= appointment.appointmentValue ? 'paid' : 'pending';
}

/**
 * Formats a unix timestamp in seconds to a readable date string.
 */
function formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/**
 * Formats lamports to a human-readable SOL string.
 */
function formatLamports(lamports: number): string {
    return `${(lamports / 1_000_000_000).toFixed(4)} SOL`;
}

/**
 * Loading skeleton for appointment card.
 */
function AppointmentCardSkeleton() {
    return (
        <article className="appointment-card appointment-card-skeleton" aria-hidden="true">
            <div className="skeleton-line skeleton-line-title" />
            <div className="skeleton-line skeleton-line-text" />
            <div className="skeleton-line skeleton-line-text-short" />
        </article>
    );
}

/**
 * AppointmentList Component
 *
 * Displays a list of on-chain appointments with their status (pending/paid),
 * date, time, and payment amounts. Shows loading, error, and empty states.
 */
export function AppointmentList({
    appointments,
    loading,
    error,
    onRetry,
    onPayAppointment,
}: AppointmentListProps) {
    if (loading) {
        return (
            <div className="appointments-list">
                {Array.from({ length: 3 }).map((_, i) => (
                    <AppointmentCardSkeleton key={i} />
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-state">
                <p className="error-state-text">Failed to load appointments</p>
                <p className="error-state-detail">{error}</p>
                <button className="btn-primary" onClick={onRetry}>
                    Retry
                </button>
            </div>
        );
    }

    if (appointments.length === 0) {
        return (
            <div className="empty-state">
                <p className="empty-state-text">No appointments scheduled</p>
                <p className="empty-state-description">
                    Schedule an appointment using the form above.
                </p>
            </div>
        );
    }

    return (
        <div className="appointments-list">
            {appointments.map((appointment) => {
                const status = getPaymentStatus(appointment);
                return (
                    <article key={appointment.id} className="appointment-card">
                        <div className="appointment-card-header">
                            <span className={`appointment-status appointment-status--${status}`}>
                                {status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                            <span className="appointment-date">
                                {formatDate(appointment.date)}
                            </span>
                        </div>
                        <div className="appointment-card-body">
                            <p className="appointment-pet-id">
                                Pet ID: <code>{appointment.petId.slice(0, 8)}...</code>
                            </p>
                            <p className="appointment-time">
                                Time: {appointment.time}
                            </p>
                            <p className="appointment-amount">
                                Amount: {formatLamports(appointment.appointmentValue)}
                            </p>
                            <p className="appointment-paid">
                                Paid: {formatLamports(appointment.paidValue)}
                            </p>
                        </div>
                        {status === 'pending' && (
                            <div className="appointment-card-actions">
                                <button
                                    className="btn-primary"
                                    onClick={() => onPayAppointment(appointment.id)}
                                >
                                    Pay Appointment
                                </button>
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );
}
