import { useState } from 'react';
import type { TxState } from '../../common/hooks/useTxState';

/**
 * Props for the PayAppointmentButton component.
 */
interface PayAppointmentButtonProps {
    /** The appointment ID to pay for */
    appointmentId: string;
    /** Current transaction state */
    txState: TxState;
    /** Submit handler — receives appointment ID and amount */
    onSubmit: (appointmentId: string, amount: number) => Promise<void>;
    /** Reset transaction state */
    onReset: () => void;
    /** Whether the wallet is connected */
    isWalletConnected: boolean;
}

/**
 * PayAppointmentButton Component
 *
 * Renders a button that opens an inline amount input for paying an appointment.
 * Uses the transaction state machine for feedback (Idle → Pending → Confirmed → Success/Error).
 */
export function PayAppointmentButton({
    appointmentId,
    txState,
    onSubmit,
    onReset,
    isWalletConnected,
}: PayAppointmentButtonProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [amount, setAmount] = useState('');
    const [amountError, setAmountError] = useState('');

    const isSubmitting = txState.status === 'pending';

    const handleExpand = () => {
        setIsExpanded(true);
        setAmount('');
        setAmountError('');
    };

    const handleCancel = () => {
        setIsExpanded(false);
        setAmount('');
        setAmountError('');
        onReset();
    };

    const validateAmount = (): boolean => {
        const amountNum = Number(amount);
        if (!amount || isNaN(amountNum) || amountNum <= 0) {
            setAmountError('Amount must be a positive number');
            return false;
        }
        setAmountError('');
        return true;
    };

    const handlePay = async () => {
        if (!isWalletConnected || !validateAmount()) return;

        await onSubmit(appointmentId, Number(amount));
        setIsExpanded(false);
    };

    // Confirmed state
    if (txState.status === 'confirmed') {
        return (
            <div className="tx-success tx-success-inline">
                <p>Payment Successful!</p>
                <p className="tx-signature">
                    <a
                        href={`https://explorer.solana.com/tx/${txState.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {txState.signature.slice(0, 8)}...{txState.signature.slice(-8)}
                    </a>
                </p>
                <button className="btn-primary" onClick={onReset}>
                    Done
                </button>
            </div>
        );
    }

    // Error state
    if (txState.status === 'error') {
        return (
            <div className="tx-error tx-error-inline">
                <p>Payment Failed: {txState.error}</p>
                <button className="btn-primary" onClick={onReset}>
                    Dismiss
                </button>
            </div>
        );
    }

    if (!isExpanded) {
        return (
            <button
                className="btn-primary"
                onClick={handleExpand}
                disabled={!isWalletConnected}
            >
                Pay Appointment
            </button>
        );
    }

    return (
        <div className="pay-appointment-inline">
            <div className="form-group">
                <label className="form-label" htmlFor={`pay-amount-${appointmentId}`}>
                    Amount (lamports)
                </label>
                <input
                    id={`pay-amount-${appointmentId}`}
                    type="number"
                    className={`form-input${amountError ? ' error' : ''}`}
                    placeholder="Enter payment amount"
                    value={amount}
                    onChange={(e) => {
                        setAmount(e.target.value);
                        if (amountError) setAmountError('');
                    }}
                    disabled={isSubmitting}
                    min="1"
                />
                {amountError && <p className="form-error">{amountError}</p>}
            </div>
            <div className="pay-appointment-actions">
                <button
                    className="btn-primary"
                    onClick={handlePay}
                    disabled={isSubmitting || !isWalletConnected}
                >
                    {isSubmitting
                        ? txState.step === 'wallet-approval'
                            ? 'Approving...'
                            : 'Confirming...'
                        : 'Confirm Payment'}
                </button>
                <button
                    className="btn-secondary"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}
