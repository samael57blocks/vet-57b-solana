/**
 * Re-export the canonical Appointment type used by the service layer.
 * The canonical definition lives in pets/types/pet.ts to avoid circular dependencies
 * since both pets and appointments reference it.
 */
export type { Appointment as MedicalAppointment } from '../../pets/types/pet';
