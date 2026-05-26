import { useState, useCallback } from 'react';
import type { AnimalType } from '../types/pet';
import type { TxState } from '../../common/hooks/useTxState';

/**
 * Form data for registering a new pet.
 */
interface RegisterPetFormData {
  name: string;
  species: AnimalType | '';
  breed: string;
  birthDate: string;
  caretakerName: string;
  caretakerPhone: string;
}

/**
 * Validation errors for the form.
 */
interface FormErrors {
  name?: string;
  species?: string;
  breed?: string;
  birthDate?: string;
}

/**
 * Props for the RegisterPetForm component.
 */
interface RegisterPetFormProps {
  /** Current transaction state */
  txState: TxState;
  /** Submit handler receiving form data */
  onSubmit: (data: RegisterPetFormData) => Promise<void>;
  /** Reset transaction state back to idle */
  onReset: () => void;
  /** Whether the wallet is connected */
  isWalletConnected: boolean;
}

const INITIAL_FORM_DATA: RegisterPetFormData = {
  name: '',
  species: '',
  breed: '',
  birthDate: '',
  caretakerName: '',
  caretakerPhone: '',
};

/**
 * RegisterPetForm Component
 *
 * Form for registering a new pet on-chain.
 * Validates all fields before submission and uses the transaction state
 * machine for feedback (Idle → Pending → Confirmed → Success/Error).
 */
export function RegisterPetForm({
  txState,
  onSubmit,
  onReset,
  isWalletConnected,
}: RegisterPetFormProps) {
  const [formData, setFormData] = useState<RegisterPetFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<FormErrors>({});

  const isSubmitting = txState.status === 'pending';

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must have at least 2 characters';
    }

    if (!formData.species) {
      newErrors.species = 'Species must be Dog or Cat';
    }

    if (!formData.breed || formData.breed.trim().length < 1) {
      newErrors.breed = 'Breed is required';
    }

    if (!formData.birthDate) {
      newErrors.birthDate = 'Birth date is required';
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
    field: keyof RegisterPetFormData,
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

  if (txState.status === 'confirmed') {
    return (
      <div className="tx-success">
        <h3>Pet Registered Successfully!</h3>
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
          Register Another Pet
        </button>
      </div>
    );
  }

  if (txState.status === 'error') {
    return (
      <div className="tx-error">
        <h3>Registration Failed</h3>
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

      {/* Pet Name */}
      <div className="form-group">
        <label className="form-label" htmlFor="pet-name">
          Name
        </label>
        <input
          id="pet-name"
          type="text"
          className={`form-input${errors.name ? ' error' : ''}`}
          placeholder="Enter pet name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          disabled={isSubmitting}
        />
        {errors.name && <p className="form-error">{errors.name}</p>}
      </div>

      {/* Species */}
      <div className="form-group">
        <label className="form-label" htmlFor="pet-species">
          Species
        </label>
        <select
          id="pet-species"
          className={`form-input${errors.species ? ' error' : ''}`}
          value={formData.species}
          onChange={(e) => handleInputChange('species', e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Select species</option>
          <option value="Dog">Dog</option>
          <option value="Cat">Cat</option>
        </select>
        {errors.species && <p className="form-error">{errors.species}</p>}
      </div>

      {/* Breed */}
      <div className="form-group">
        <label className="form-label" htmlFor="pet-breed">
          Breed
        </label>
        <input
          id="pet-breed"
          type="text"
          className={`form-input${errors.breed ? ' error' : ''}`}
          placeholder="Enter breed"
          value={formData.breed}
          onChange={(e) => handleInputChange('breed', e.target.value)}
          disabled={isSubmitting}
        />
        {errors.breed && <p className="form-error">{errors.breed}</p>}
      </div>

      {/* Birth Date */}
      <div className="form-group">
        <label className="form-label" htmlFor="pet-birth-date">
          Birth Date
        </label>
        <input
          id="pet-birth-date"
          type="date"
          className={`form-input${errors.birthDate ? ' error' : ''}`}
          value={formData.birthDate}
          onChange={(e) => handleInputChange('birthDate', e.target.value)}
          disabled={isSubmitting}
        />
        {errors.birthDate && <p className="form-error">{errors.birthDate}</p>}
      </div>

      {/* Caretaker Name */}
      <div className="form-group">
        <label className="form-label" htmlFor="pet-caretaker-name">
          Caretaker Name
        </label>
        <input
          id="pet-caretaker-name"
          type="text"
          className="form-input"
          placeholder="Enter caretaker name"
          value={formData.caretakerName}
          onChange={(e) => handleInputChange('caretakerName', e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {/* Caretaker Phone */}
      <div className="form-group">
        <label className="form-label" htmlFor="pet-caretaker-phone">
          Caretaker Phone
        </label>
        <input
          id="pet-caretaker-phone"
          type="tel"
          className="form-input"
          placeholder="Enter caretaker phone"
          value={formData.caretakerPhone}
          onChange={(e) => handleInputChange('caretakerPhone', e.target.value)}
          disabled={isSubmitting}
        />
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
            : 'Register Pet'}
        </button>
      </div>
    </form>
  );
}
