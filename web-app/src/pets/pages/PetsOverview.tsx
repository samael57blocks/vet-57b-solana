import { usePetsOverview } from "../hooks/usePetsOverview";
import { PetsOverviewView } from "../views/PetsOverviewView";
import { useVetProgram } from "../../solana/useVetProgram";

/**
 * PetsOverview Page Component
 * Handles data fetching and passes pets data to the view.
 * Detects wallet connection status and passes it down.
 */
export function PetsOverviewPage() {
    const { pets, loading, error, refetch } = usePetsOverview();
    const program = useVetProgram();
    const isWalletConnected = program !== null;

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
