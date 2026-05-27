import { useState } from "react";
import type { Pet, AnimalType } from "../types/pet";
import { PetOverView, PetOverviewSkeleton } from "../components/PetOverview";
import { RegisterPetForm } from "../components/RegisterPetForm";
import { useTxState } from "../../common/hooks/useTxState";
import { useVetProgram } from "../../solana/useVetProgram";
import { registerPet } from "../services/solana/petService";

/**
 * Props for the PetsOverviewView component
 */
interface PetsOverviewViewProps {
    /** List of pets to display */
    pets: Pet[];
    /** Whether data is loading */
    loading: boolean;
    /** Error message if fetching failed */
    error: string | null;
    /** Retry callback for error state */
    onRetry: () => void;
    /** Whether the wallet is connected */
    isWalletConnected: boolean;
}

/**
 * Form data structure for registering a new pet (legacy support).
 */
interface PetFormData {
    name: string;
    age: string;
}

/**
 * Form errors structure
 */
interface FormErrors {
    name?: string;
    age?: string;
}

/**
 * RegisterPetFormData from the RegisterPetForm component.
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
 * PetsOverviewView Component
 *
 * Displays on-chain pets with loading/error/empty states.
 * Shows RegisterPetForm dialog for adding new pets.
 * Handles the full transaction lifecycle for pet registration.
 */
export function PetsOverviewView({
    pets,
    loading,
    error,
    onRetry,
    isWalletConnected,
}: PetsOverviewViewProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<PetFormData>({ name: "", age: "" });
    const [errors, setErrors] = useState<FormErrors>({});
    const txState = useTxState();
    const program = useVetProgram();

    const openDialog = () => {
        setIsDialogOpen(true);
        setFormData({ name: "", age: "" });
        setErrors({});
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setFormData({ name: "", age: "" });
        setErrors({});
        txState.reset();
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Validate name (at least 2 characters)
        if (!formData.name || formData.name.trim().length < 2) {
            newErrors.name = "Name must have at least 2 characters";
        }

        // Validate age (must be a number greater than 0)
        const ageNum = Number(formData.age);
        if (!formData.age || isNaN(ageNum) || ageNum <= 0) {
            newErrors.age = "Age must be a number greater than 0";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLegacySubmit = (e: React.FormEvent) => {
        e.preventDefault();
        validateForm();
    };

    const handleInputChange = (field: keyof PetFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';

    const handleRegisterPet = async (data: RegisterPetFormData) => {
        if (!program && !isMockMode) return;

        const birthDate = new Date(data.birthDate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear();

        // Mock mode: simulate successful registration
        if (isMockMode) {
            console.log('[Mock] Registering pet:', data.name);
            onRetry();
            return;
        }

        await txState.execute(async () => {
            return registerPet(program!, {
                name: data.name,
                species: data.species as AnimalType,
                age,
                caretakerName: data.caretakerName,
                caretakerPhone: data.caretakerPhone,
            });
        });

        // Refresh pets list after registration attempt
        onRetry();
    };

    // Wallet not connected
    if (!isWalletConnected) {
        return (
            <main className="main-content">
                <div className="page-header">
                    <h1 className="page-title">Pets</h1>
                </div>
                <div className="empty-state">
                    <div className="empty-state-icon">🐾</div>
                    <p className="empty-state-text">Connect wallet to see your pets</p>
                </div>
            </main>
        );
    }

    return (
        <main className="main-content">
            <div className="page-header">
                <h1 className="page-title">Pets</h1>
                <button className="btn-primary" onClick={openDialog}>
                    Register Pet
                </button>
            </div>

            {/* Loading state */}
            {loading && (
                <div className="pets-grid">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <PetOverviewSkeleton key={i} />
                    ))}
                </div>
            )}

            {/* Error state */}
            {error && !loading && (
                <div className="error-state">
                    <p className="error-state-text">Failed to load pets</p>
                    <p className="error-state-detail">{error}</p>
                    <button className="btn-primary" onClick={onRetry}>
                        Retry
                    </button>
                </div>
            )}

            {/* Empty state */}
            {!loading && !error && pets.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-icon">🐾</div>
                    <p className="empty-state-text">No pets registered yet</p>
                    <button className="btn-primary" onClick={openDialog}>
                        Register your first pet
                    </button>
                </div>
            )}

            {/* Pets grid */}
            {!loading && !error && pets.length > 0 && (
                <div className="pets-grid">
                    {pets.map((pet) => (
                        <PetOverView key={pet.id} pet={pet} />
                    ))}
                </div>
            )}

            {/* Legacy dialog for registration (uses new RegisterPetForm inside) */}
            {isDialogOpen && (
                <div className="dialog-overlay" onClick={closeDialog}>
                    <div className="dialog" onClick={(e) => e.stopPropagation()}>
                        <h2 className="dialog-title">Register New Pet</h2>

                        <RegisterPetForm
                            txState={txState.state}
                            onSubmit={handleRegisterPet}
                            onReset={txState.reset}
                            isWalletConnected={isWalletConnected}
                        />

                        {/* Legacy form (kept for backward compatibility) */}
                        <details className="legacy-form-toggle">
                            <summary>Legacy form</summary>
                            <form onSubmit={handleLegacySubmit}>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="pet-name">
                                        Name
                                    </label>
                                    <input
                                        id="pet-name"
                                        type="text"
                                        className={`form-input ${errors.name ? "error" : ""}`}
                                        placeholder="Enter pet name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            handleInputChange("name", e.target.value)
                                        }
                                    />
                                    {errors.name && (
                                        <p className="form-error">{errors.name}</p>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="pet-age">
                                        Age
                                    </label>
                                    <input
                                        id="pet-age"
                                        type="number"
                                        className={`form-input ${errors.age ? "error" : ""}`}
                                        placeholder="Enter pet age"
                                        value={formData.age}
                                        onChange={(e) =>
                                            handleInputChange("age", e.target.value)
                                        }
                                        min="1"
                                    />
                                    {errors.age && (
                                        <p className="form-error">{errors.age}</p>
                                    )}
                                </div>

                                <div className="dialog-actions">
                                    <button
                                        type="button"
                                        className="btn-secondary"
                                        onClick={closeDialog}
                                    >
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn-primary">
                                        Register Pet (Legacy)
                                    </button>
                                </div>
                            </form>
                        </details>
                    </div>
                </div>
            )}
        </main>
    );
}
