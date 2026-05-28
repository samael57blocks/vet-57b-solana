import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Pet } from '../../pets/types/pet';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetPets = vi.fn();
const mockUseVetProgram = vi.fn();

vi.mock('../../solana/useVetProgram', () => ({
  useVetProgram: () => mockUseVetProgram(),
}));

vi.mock('../../pets/services/solana/petService', () => ({
  getPets: (...args: unknown[]) => mockGetPets(...args),
}));

// ---------------------------------------------------------------------------
// Sample data
// ---------------------------------------------------------------------------

const samplePets: Pet[] = [
  {
    id: '111111111111111111111111111111111',
    name: 'Buddy',
    age: 3,
    animalType: 'Dog',
    caretakerName: 'Alice',
    caretakerPhone: '555-0101',
  },
  {
    id: '222222222222222222222222222222222',
    name: 'Bella',
    age: 2,
    animalType: 'Cat',
    caretakerName: 'Bob',
    caretakerPhone: '555-0102',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePetsOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_USE_MOCK_DATA', 'false');
  });

  it('returns empty pets when wallet is not connected', async () => {
    mockUseVetProgram.mockReturnValue(null);

    const { usePetsOverview } = await import('../../pets/hooks/usePetsOverview');

    const { result } = renderHook(() => usePetsOverview());

    await act(async () => {
      // Wait for the effect to run
      await new Promise((r) => setTimeout(r, 0));
    });

    // After first render with null program, pets should be empty
    // The hook sets loading false and error null when program is null
    expect(result.current.pets).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('returns loading state then pets when program is available', async () => {
    const programStub = { account: {} };
    mockUseVetProgram.mockReturnValue(programStub);
    mockGetPets.mockResolvedValue(samplePets);

    const { usePetsOverview } = await import('../../pets/hooks/usePetsOverview');

    const { result } = renderHook(() => usePetsOverview());

    // Initial render should trigger loading (useEffect runs after mount)
    expect(result.current.loading).toBe(true);
    expect(result.current.pets).toEqual([]);

    // Wait for the effect to resolve
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pets).toHaveLength(2);
    expect(result.current.pets[0].name).toBe('Buddy');
    expect(result.current.error).toBeNull();
  });

  it('returns error state when RPC call fails', async () => {
    const programStub = { account: {} };
    mockUseVetProgram.mockReturnValue(programStub);
    mockGetPets.mockRejectedValue(new Error('RPC connection failed'));

    const { usePetsOverview } = await import('../../pets/hooks/usePetsOverview');

    const { result } = renderHook(() => usePetsOverview());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pets).toEqual([]);
    expect(result.current.error).toBe('RPC connection failed');
  });

  it('refetches pets when refetch is called', async () => {
    const programStub = { account: {} };
    mockUseVetProgram.mockReturnValue(programStub);
    mockGetPets.mockResolvedValue(samplePets);

    const { usePetsOverview } = await import('../../pets/hooks/usePetsOverview');

    const { result } = renderHook(() => usePetsOverview());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.pets).toHaveLength(2);
    expect(mockGetPets).toHaveBeenCalledTimes(1);

    // Set up new data for refetch
    const updatedPets = [
      {
        ...samplePets[0],
        name: 'Buddy Updated',
      },
    ];
    mockGetPets.mockResolvedValue(updatedPets);

    // Call refetch
    await act(async () => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.pets).toHaveLength(1);
    });

    expect(result.current.pets[0].name).toBe('Buddy Updated');
    expect(mockGetPets).toHaveBeenCalledTimes(2);
  });

  it('resets to empty when wallet disconnects', async () => {
    // Start with connected wallet
    const programStub = { account: {} };
    mockUseVetProgram.mockReturnValue(programStub);
    mockGetPets.mockResolvedValue(samplePets);

    const { usePetsOverview } = await import('../../pets/hooks/usePetsOverview');

    const { result, rerender } = renderHook(() => usePetsOverview());

    await waitFor(() => {
      expect(result.current.pets).toHaveLength(2);
    });

    // Simulate wallet disconnect
    mockUseVetProgram.mockReturnValue(null);
    mockGetPets.mockClear();

    // Re-render triggers effect with null program
    rerender();

    await waitFor(() => {
      expect(result.current.pets).toEqual([]);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
