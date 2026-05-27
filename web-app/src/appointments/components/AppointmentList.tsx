import type { Appointment, Pet } from '../../pets/types/pet';

/**
 * Props for the AppointmentList component.
 */
interface AppointmentListProps {
    /** List of appointments to display */
    appointments: Appointment[];
    /** List of pets to resolve pet names */
    pets?: Pet[];
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
 * Calculates the payment percentage for the progress bar.
 */
function getPaymentPercent(appointment: Appointment): number {
    if (appointment.appointmentValue === 0) return 0;
    const pct = (appointment.paidValue / appointment.appointmentValue) * 100;
    return Math.min(pct, 100);
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
 * Builds a pet name lookup map from the pets array.
 */
function buildPetNameMap(pets?: Pet[]): Record<string, string> {
    if (!pets) return {};
    const map: Record<string, string> = {};
    for (const pet of pets) {
        map[pet.id] = pet.name;
    }
    return map;
}

/**
 * Loading skeleton for appointment card.
 */
function AppointmentCardSkeleton() {
    return (
        <article className="appointment-card appointment-card-skeleton" aria-hidden="true">
            <div className="appointment-card-inner">
                <div className="skeleton-line skeleton-line-title" />
                <div className="skeleton-line skeleton-line-text" />
                <div className="skeleton-line skeleton-line-text-short" />
            </div>
        </article>
    );
}

/**
 * AppointmentList Component
 *
 * Displays a list of on-chain appointments with their status (pending/paid),
 * date, time, pet name, and payment progress bar.
 * Shows loading, error, and empty states.
 */
export function AppointmentList({
    appointments,
    pets,
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

    const petNameMap = buildPetNameMap(pets);

    return (
        <div className="appointments-list">
            {appointments.map((appointment) => {
                const status = getPaymentStatus(appointment);
                const petName = petNameMap[appointment.petId] || `Pet #${appointment.petId.slice(0, 4)}`;
                const paymentPct = getPaymentPercent(appointment);
                const isFullyPaid = status === 'paid';

                return (
                    <article key={appointment.id} className={`appointment-card appointment-card--${status}`}>
                        <div className="appointment-card-inner">
                            {/* Top row: pet name + status badge */}
                            <div className="appointment-card-top">
                                <div className="appointment-card-pet">
                                    <h3 className="appointment-card-pet-name">{petName}</h3>
                                    <p className="appointment-card-pet-id">{appointment.id.slice(0, 12)}...</p>
                                </div>
                                <span className={`appointment-status-badge appointment-status-badge--${status}`}>
                                    {isFullyPaid ? '✓ Paid' : '○ Pending'}
                                </span>
                            </div>

                            {/* Details row: date, time, amount */}
                            <div className="appointment-card-details">
                                <div className="appointment-detail">
                                    <span className="appointment-detail-label">Date</span>
                                    <span className="appointment-detail-value">{formatDate(appointment.date)}</span>
                                </div>
                                <div className="appointment-detail">
                                    <span className="appointment-detail-label">Time</span>
                                    <span className="appointment-detail-value">{appointment.time}</span>
                                </div>
                                <div className="appointment-detail">
                                    <span className="appointment-detail-label">Amount</span>
                                    <span className="appointment-detail-value">{formatLamports(appointment.appointmentValue)}</span>
                                </div>
                            </div>

                            {/* Payment progress */}
                            <hr className="appointment-card-divider" />
                            <div className="appointment-card-footer">
                                <div className="appointment-payment-progress">
                                    <div className="appointment-payment-amounts">
                                        <span className="amount amount--paid">{formatLamports(appointment.paidValue)} paid</span>
                                        <span className="amount amount--pending">{formatLamports(appointment.appointmentValue - appointment.paidValue)} due</span>
                                    </div>
                                    <div className="appointment-payment-bar">
                                        <div
                                            className={`appointment-payment-bar-fill appointment-payment-bar-fill--${isFullyPaid ? 'paid' : paymentPct > 0 ? 'partial' : 'pending'}`}
                                            style={{ width: `${Math.max(paymentPct, isFullyPaid ? 100 : 5)}%` }}
                                        />
                                    </div>
                                </div>
                                {!isFullyPaid && (
                                    <button
                                        className="btn-primary"
                                        onClick={() => onPayAppointment(appointment.id)}
                                    >
                                        Pay Now
                                    </button>
                                )}
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
}
