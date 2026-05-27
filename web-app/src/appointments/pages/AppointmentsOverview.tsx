import { useAppointments } from "../hooks/useAppointments";
import { usePetsOverview } from "../../pets/hooks/usePetsOverview";
import { AppointmentsOverviewView } from "../views/AppointmentsOverviewView";
import { useVetProgram } from "../../solana/useVetProgram";

/**
 * AppointmentsOverview Page Component
 *
 * Handles data fetching for both appointments and pets,
 * and passes data to the view.
 * Detects wallet connection status and passes it down.
 */
export function AppointmentsOverviewPage() {
    const { appointments, loading, error, refetch } = useAppointments();
    const { pets } = usePetsOverview();
    const program = useVetProgram();
    const isMockMode = import.meta.env.VITE_USE_MOCK_DATA === 'true';
    const isWalletConnected = isMockMode || program !== null;

    const handleMutated = () => {
        refetch();
    };

    return (
        <AppointmentsOverviewView
            appointments={appointments}
            pets={pets}
            loading={loading}
            error={error}
            onRetry={refetch}
            onMutated={handleMutated}
            isWalletConnected={isWalletConnected}
        />
    );
}
