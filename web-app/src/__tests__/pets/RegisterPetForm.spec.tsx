import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { TxState } from '../../common/hooks/useTxState';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockOnSubmit = vi.fn();
const mockOnReset = vi.fn();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function idleTxState(): TxState {
  return { status: 'idle' };
}

function pendingTxState(): TxState {
  return { status: 'pending', step: 'wallet-approval' };
}

function confirmedTxState(): TxState {
  return { status: 'confirmed', signature: 'mock-signature-1234567890' };
}

function errorTxState(error = 'Transaction failed'): TxState {
  return { status: 'error', error };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RegisterPetForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields in idle state', async () => {
    const { RegisterPetForm } = await import(
      '../../pets/components/RegisterPetForm'
    );

    render(
      <RegisterPetForm
        txState={idleTxState()}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        isWalletConnected={true}
      />,
    );

    // Check that all form fields render
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Species')).toBeInTheDocument();
    expect(screen.getByLabelText('Breed')).toBeInTheDocument();
    expect(screen.getByLabelText('Birth Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Caretaker Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Caretaker Phone')).toBeInTheDocument();

    // Check submit button
    expect(
      screen.getByRole('button', { name: 'Register Pet' }),
    ).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    const { RegisterPetForm } = await import(
      '../../pets/components/RegisterPetForm'
    );

    render(
      <RegisterPetForm
        txState={idleTxState()}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        isWalletConnected={true}
      />,
    );

    // Click submit without filling any fields
    fireEvent.click(screen.getByRole('button', { name: 'Register Pet' }));

    // Check validation errors appear
    await waitFor(() => {
      expect(screen.getByText('Name must have at least 2 characters')).toBeInTheDocument();
      expect(screen.getByText('Species must be Dog or Cat')).toBeInTheDocument();
      expect(screen.getByText('Breed is required')).toBeInTheDocument();
      expect(screen.getByText('Birth date is required')).toBeInTheDocument();
    });

    // onSubmit should not be called when validation fails
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates name field minimum length', async () => {
    const { RegisterPetForm } = await import(
      '../../pets/components/RegisterPetForm'
    );

    render(
      <RegisterPetForm
        txState={idleTxState()}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        isWalletConnected={true}
      />,
    );

    // Type a single character name
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'A' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: 'Register Pet' }));

    await waitFor(() => {
      expect(
        screen.getByText('Name must have at least 2 characters'),
      ).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('clears field error when user starts typing', async () => {
    const { RegisterPetForm } = await import(
      '../../pets/components/RegisterPetForm'
    );

    render(
      <RegisterPetForm
        txState={idleTxState()}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        isWalletConnected={true}
      />,
    );

    // Submit empty form to trigger errors
    fireEvent.click(screen.getByRole('button', { name: 'Register Pet' }));

    await waitFor(() => {
      expect(
        screen.getByText('Name must have at least 2 characters'),
      ).toBeInTheDocument();
    });

    // Start typing in the name field
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Buddy' },
    });

    // Name error should be cleared
    await waitFor(() => {
      expect(
        screen.queryByText('Name must have at least 2 characters'),
      ).not.toBeInTheDocument();
    });
  });

  it('shows species select options', async () => {
    const { RegisterPetForm } = await import(
      '../../pets/components/RegisterPetForm'
    );

    render(
      <RegisterPetForm
        txState={idleTxState()}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        isWalletConnected={true}
      />,
    );

    const speciesSelect = screen.getByLabelText('Species');
    expect(speciesSelect).toBeInTheDocument();

    // Check options exist
    expect(
      screen.getByRole('option', { name: 'Dog' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: 'Cat' }),
    ).toBeInTheDocument();
  });

  it('disables form fields during pending state', async () => {
    const { RegisterPetForm } = await import(
      '../../pets/components/RegisterPetForm'
    );

    render(
      <RegisterPetForm
        txState={pendingTxState()}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        isWalletConnected={true}
      />,
    );

    // All fields should be disabled
    expect(screen.getByLabelText('Name')).toBeDisabled();
    expect(screen.getByLabelText('Species')).toBeDisabled();
    expect(screen.getByLabelText('Breed')).toBeDisabled();
    expect(screen.getByLabelText('Birth Date')).toBeDisabled();
    expect(screen.getByLabelText('Caretaker Name')).toBeDisabled();
    expect(screen.getByLabelText('Caretaker Phone')).toBeDisabled();

    // Submit button should be disabled
    expect(
      screen.getByRole('button', { name: /Approve in wallet/i }),
    ).toBeDisabled();
  });

  it('shows success state with explorer link when confirmed', async () => {
    const { RegisterPetForm } = await import(
      '../../pets/components/RegisterPetForm'
    );

    render(
      <RegisterPetForm
        txState={confirmedTxState()}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        isWalletConnected={true}
      />,
    );

    // Success message should appear
    expect(
      screen.getByText('Pet Registered Successfully!'),
    ).toBeInTheDocument();

    // Explorer link should exist
    const explorerLink = screen.getByRole('link');
    expect(explorerLink).toHaveAttribute(
      'href',
      'https://explorer.solana.com/tx/mock-signature-1234567890?cluster=devnet',
    );

    // Register Another Pet button should exist
    expect(
      screen.getByRole('button', { name: 'Register Another Pet' }),
    ).toBeInTheDocument();
  });

  it('calls onReset when clicking "Register Another Pet" in confirmed state', async () => {
    const { RegisterPetForm } = await import(
      '../../pets/components/RegisterPetForm'
    );

    render(
      <RegisterPetForm
        txState={confirmedTxState()}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        isWalletConnected={true}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Register Another Pet' }),
    );

    expect(mockOnReset).toHaveBeenCalledOnce();
  });

  it('shows error state with message', async () => {
    const { RegisterPetForm } = await import(
      '../../pets/components/RegisterPetForm'
    );

    render(
      <RegisterPetForm
        txState={errorTxState('Insufficient funds')}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        isWalletConnected={true}
      />,
    );

    expect(screen.getByText('Registration Failed')).toBeInTheDocument();
    expect(screen.getByText('Insufficient funds')).toBeInTheDocument();

    // Try Again button should exist
    expect(
      screen.getByRole('button', { name: 'Try Again' }),
    ).toBeInTheDocument();
  });

  it('shows connect wallet warning when not connected', async () => {
    const { RegisterPetForm } = await import(
      '../../pets/components/RegisterPetForm'
    );

    render(
      <RegisterPetForm
        txState={idleTxState()}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        isWalletConnected={false}
      />,
    );

    expect(
      screen.getByText('Connect your wallet first'),
    ).toBeInTheDocument();
  });

  it('calls onSubmit with form data when valid', async () => {
    const { RegisterPetForm } = await import(
      '../../pets/components/RegisterPetForm'
    );

    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <RegisterPetForm
        txState={idleTxState()}
        onSubmit={mockOnSubmit}
        onReset={mockOnReset}
        isWalletConnected={true}
      />,
    );

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Buddy' },
    });

    fireEvent.change(screen.getByLabelText('Species'), {
      target: { value: 'Dog' },
    });

    fireEvent.change(screen.getByLabelText('Breed'), {
      target: { value: 'Golden Retriever' },
    });

    fireEvent.change(screen.getByLabelText('Birth Date'), {
      target: { value: '2021-01-15' },
    });

    fireEvent.change(screen.getByLabelText('Caretaker Name'), {
      target: { value: 'Alice' },
    });

    fireEvent.change(screen.getByLabelText('Caretaker Phone'), {
      target: { value: '555-0101' },
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Register Pet' }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledOnce();
    });

    // Check that form data was passed
    const calledWith = mockOnSubmit.mock.calls[0][0];
    expect(calledWith.name).toBe('Buddy');
    expect(calledWith.species).toBe('Dog');
    expect(calledWith.breed).toBe('Golden Retriever');
    expect(calledWith.birthDate).toBe('2021-01-15');
    expect(calledWith.caretakerName).toBe('Alice');
    expect(calledWith.caretakerPhone).toBe('555-0101');
  });
});
