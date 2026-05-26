import type { Pet } from "../../types/pet";
import type { IPetService } from "../petService";

/**
 * Implementation of the PetService using mock data
 */
export const MockPetService: IPetService = {
    getPets: async (): Promise<Pet[]> => {
        return [
            {
                id: '1',
                name: 'Buddy',
                age: 3,
                animalType: 'Dog',
                caretakerName: 'Alice',
                caretakerPhone: '555-0101',
            },
            {
                id: '2',
                name: 'Max',
                age: 2,
                animalType: 'Dog',
                caretakerName: 'Bob',
                caretakerPhone: '555-0102',
            },
            {
                id: '3',
                name: 'Bella',
                age: 1,
                animalType: 'Cat',
                caretakerName: 'Charlie',
                caretakerPhone: '555-0103',
            },
        ]
    },
};