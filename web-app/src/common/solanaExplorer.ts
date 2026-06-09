/**
 * Build a Solana explorer URL for a transaction signature.
 *
 * Environment variables for customization:
 * - `VITE_SOLANA_EXPLORER_URL` — override the base explorer URL (default: https://explorer.solana.com)
 * - `VITE_SOLANA_CLUSTER` — set the cluster query param (default: devnet)
 *
 * @example
 * ```ts
 * getExplorerTxUrl('3xAB...xyz') // → https://explorer.solana.com/tx/3xAB...xyz?cluster=devnet
 * ```
 */
export function getExplorerTxUrl(signature: string): string {
  const baseUrl =
    import.meta.env.VITE_SOLANA_EXPLORER_URL ?? 'https://explorer.solana.com';
  const cluster = import.meta.env.VITE_SOLANA_CLUSTER ?? 'devnet';
  return `${baseUrl}/tx/${signature}?cluster=${cluster}`;
}
