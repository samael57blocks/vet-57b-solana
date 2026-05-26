import type { FC, ReactNode } from 'react';
import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import '@solana/wallet-adapter-react-ui/styles.css';
/**
 * Props for the SolanaProvider component.
 */
interface SolanaProviderProps {
  /** React children to wrap with wallet + anchor providers */
  children: ReactNode;
}

/**
 * Default RPC endpoint URL from environment variable.
 */
const DEFAULT_SOLANA_RPC_URL = 'http://localhost:8899';

/**
 * SolanaProvider wraps the application with the full Solana provider chain:
 * ConnectionProvider → WalletProvider → WalletModalProvider.
 *
 * This provides the wallet-adapter context needed by useAnchorProvider()
 * and downstream hooks like useVetProgram().
 */
export const SolanaProvider: FC<SolanaProviderProps> = ({ children }) => {
  const endpoint = import.meta.env.VITE_SOLANA_RPC_URL ?? DEFAULT_SOLANA_RPC_URL;

  const wallets = useMemo(
    () => [new PhantomWalletAdapter()],
    [],
  );

  if (!endpoint) {
    return (
      <div className="solana-config-error">
        <p>Solana RPC URL is not configured. Set <code>VITE_SOLANA_RPC_URL</code> in your <code>.env</code> file.</p>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaProvider;
