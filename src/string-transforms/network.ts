/**
 * Network-related utility functions
 */

/**
 * Extracts a short network name from an RPC endpoint variable name
 * @param rpcEndpoint - The RPC endpoint variable name (e.g., "RPC_ETH_HTTP")
 * @returns The short network name (e.g., "eth")
 * @throws Error if the format is invalid
 */
export function extractShortNetworkName(rpcEndpoint: string): string {
  // Extract network name from RPC_ETH_HTTP -> eth, RPC_ARBITRUM_ONE_HTTP -> arbitrum-one
  const match = rpcEndpoint.match(/^RPC_(.+)_HTTP$/);
  if (!match) {
    throw new Error(`Invalid rpcEndpoint format: ${rpcEndpoint}`);
  }
  return match[1].toLowerCase().replace(/_/g, '-');
}
