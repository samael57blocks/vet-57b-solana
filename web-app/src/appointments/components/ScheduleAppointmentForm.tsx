import { useState, useCallback } from 'react';
import type { Pet } from '../../pets/types/pet';
import type { TxState } from '../../common/hooks/useTxState';

/**
 * Form data for scheduling a new appointment.
 */
interface ScheduleAppointmentFormData {
    petId: string;
    date: string;
    time: string;
    amount: string;
}

/**
 * Validation errors for the form.
 */
interface FormErrors {
    petId?: string;
    date?: string;
    time?: string;
    amount?: string;
}

/**
 * Props for the ScheduleAppointmentForm component.
 */
interface ScheduleAppointmentFormProps {
    /** Current transaction state */
    txState: TxState;
    /** List of pets available for scheduling */
    pets: Pet[];
    /** Submit handler receiving form data */
    onSubmit: (data: ScheduleAppointmentFormData) => Promise<void>;
    /** Reset transaction state back to idle */
    onReset: () => void;
    /** Whether the wallet is connected */
    isWalletConnected: boolean;
}

const INITIAL_FORM_DATA: ScheduleAppointmentFormData = {
    petId: '',
    date: '',
    time: '',
    amount: '',
};

/**
 * ScheduleAppointmentForm Component
 *
 * Form for scheduling a new medical appointment on-chain.
 * Allows selecting a pet, date, time, and appointment amount.
 * Uses the transaction state machine for feedback (Idle → Pending → Confirmed → Success/Error).
 */
export function ScheduleAppointmentForm({
    txState,
    pets,
    onSubmit,
    onReset,
    isWalletConnected,
}: ScheduleAppointmentFormProps) {
    const [formData, setFormData] = useState<ScheduleAppointmentFormData>(INITIAL_FORM_DATA);
    const [errors, setErrors] = useState<FormErrors>({});

    const isSubmitting = txState.status === 'pending';

    const validate = useCallback((): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.petId) {
            newErrors.petId = 'Please select a pet';
        }

        if (!formData.date) {
            newErrors.date = 'Date is required';
        }

        if (!formData.time) {
            newErrors.time = 'Time is required';
        }

        const amountNum = Number(formData.amount);
        if (!formData.amount || isNaN(amountNum) || amountNum <= 0) {
            newErrors.amount = 'Amount must be a positive number';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [formData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isWalletConnected) {
            return;
        }

        if (!validate()) {
            return;
        }

        await onSubmit(formData);
    };

    const handleInputChange = (
        field: keyof ScheduleAppointmentFormData,
        value: string,
    ) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field as keyof FormErrors]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const handleCloseSuccess = () => {
        setFormData(INITIAL_FORM_DATA);
        setErrors({});
        onReset();
    };

    // Confirmed state
    if (txState.status === 'confirmed') {
        return (
            <div className="tx-success">
                <h3>Appointment Scheduled Successfully!</h3>
                <p className="tx-signature">
                    Transaction:{' '}
                    <a
                        href={`https://explorer.solana.com/tx/${txState.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {txState.signature.slice(0, 8)}...{txState.signature.slice(-8)}
                    </a>
                </p>
                <button className="btn-primary" onClick={handleCloseSuccess}>
                    Schedule Another Appointment
                </button>
            </div>
        );
    }

    // Error state
    if (txState.status === 'error') {
        return (
            <div className="tx-error">
                <h3>Failed to Schedule Appointment</h3>
                <p>{txState.error}</p>
                <button className="btn-primary" onClick={handleCloseSuccess}>
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit}>
            {!isWalletConnected && (
                <p className="form-warning">Connect your wallet first</p>
            )}

            {/* Pet Selection */}
            <div className="form-group">
                <label className="form-label" htmlFor="appointment-pet">
                    Pet
                </label>
                <select
                    id="appointment-pet"
                    className={`form-input${errors.petId ? ' error' : ''}`}
                    value={formData.petId}
                    onChange={(e) => handleInputChange('petId', e.target.value)}
                    disabled={isSubmitting}
                >
                    <option value="">Select a pet</option>
                    {pets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                            {pet.name} ({pet.animalType})
                        </option>
                    ))}
                </select>
                {errors.petId && <p className="form-error">{errors.petId}</p>}
            </div>

            {/* Date */}
            <div className="form-group">
                <label className="form-label" htmlFor="appointment-date">
                    Date
                </label>
                <input
                    id="appointment-date"
                    type="date"
                    className={`form-input${errors.date ? ' error' : ''}`}
                    value={formData.date}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    disabled={isSubmitting}
                />
                {errors.date && <p className="form-error">{errors.date}</p>}
            </div>

            {/* Time */}
            <div className="form-group">
                <label className="form-label" htmlFor="appointment-time">
                    Time
                </label>
                <input
                    id="appointment-time"
                    type="time"
                    className={`form-input${errors.time ? ' error' : ''}`}
                    value={formData.time}
                    onChange={(e) => handleInputChange('time', e.target.value)}
                    disabled={isSubmitting}
                />
                {errors.time && <p className="form-error">{errors.time}</p>}
            </div>

            {/* Amount */}
            <div className="form-group">
                <label className="form-label" htmlFor="appointment-amount">
                    Amount (lamports)
                </label>
                <input
                    id="appointment-amount"
                    type="number"
                    className={`form-input${errors.amount ? ' error' : ''}`}
                    placeholder="Enter amount in lamports"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', e.target.value)}
                    disabled={isSubmitting}
                    min="1"
                />
                {errors.amount && <p className="form-error">{errors.amount}</p>}
            </div>

            {/* Submit button */}
            <div className="form-actions">
                <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmitting || !isWalletConnected}
                >
                    {isSubmitting
                        ? txState.step === 'wallet-approval'
                            ? 'Approve in wallet...'
                            : 'Confirming...'
                        : 'Schedule Appointment'}
                </button>
            </div>
        </form>
    );
}
