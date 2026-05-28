import { usePetsOverview } from "../hooks/usePetsOverview";
import { PetsOverviewView } from "../views/PetsOverviewView";
import { useVetProgram } from "../../solana/useVetProgram";

/**
 * PetsOverview Page Component
 * Handles data fetching and passes pets data to the view.
 * Detects wallet connection status and passes it down.
 * In mock mode, skips the wallet check so UI is navigable.
 */
export function PetsOverviewPage() {
    const { pets, loading, error, refetch } = usePetsOverview();
    const program = useVetProgram();
    const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';
    const isWalletConnected = isMockMode || program !== null;

    return (
        <PetsOverviewView
            pets={pets}
            loading={loading}
            error={error}
            onRetry={refetch}
            isWalletConnected={isWalletConnected}
        />
    );
}
