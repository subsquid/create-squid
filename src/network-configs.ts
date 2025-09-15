import { NetworkInfo } from './types';
import { toMacroCase } from './string-transforms/casing';
import * as https from 'https';
import * as http from 'http';

interface ArchiveData {
  id: string;
  providers: Array<{
    dataSourceUrl: string;
  }>;
}

interface RpcLoreData {
  id: string;
  cloudRpcId: string | null;
  publicRpc: string;
}

interface FinalityConfirmationData {
  id: string;
  confirmations: number;
}

interface EvmArchivesResponse {
  archives: ArchiveData[];
}

/**
 * Fetches JSON data from a URL using Node.js built-in modules
 */
function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    
    client.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(new Error(`Failed to parse JSON from ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Failed to fetch ${url}: ${error.message}`));
    });
  });
}


/**
 * Fetches and merges network configuration data from the three JSON endpoints
 */
async function fetchNetworkConfigs(): Promise<Record<string, NetworkInfo>> {
  try {
    // Fetch data from all three endpoints in parallel
    const [evmArchives, rpcLoreData, finalityConfirmationsData] = await Promise.all([
      fetchJson<EvmArchivesResponse>('https://cdn.subsquid.io/archives/evm.json'),
      fetchJson<RpcLoreData[]>('https://cdn.subsquid.io/create-squid/rpc-lore.json'),
      fetchJson<FinalityConfirmationData[]>('https://cdn.subsquid.io/create-squid/finality-confirmations.json')
    ]);

    // Create lookup maps for faster access
    const rpcLoreMap = new Map(rpcLoreData.map(rpc => [rpc.id, rpc]));
    const finalityMap = new Map(finalityConfirmationsData.map(fc => [fc.id, fc.confirmations]));

    // Build the network configurations
    const networkConfigs: Record<string, NetworkInfo> = {};

    for (const archive of evmArchives.archives) {
      const rpcLore = rpcLoreMap.get(archive.id);
      const finalityConfirmation = finalityMap.get(archive.id) ?? 500; // Default to 500 if not found

      // Get gateway URL from first provider
      const gateway = archive.providers[0]?.dataSourceUrl || '';

      // Build RPC endpoint string and store raw abbreviation
      let rpcEndpoint: string;
      let rawRpcAbbreviation: string | null = null;
      
      if (rpcLore?.cloudRpcId) {
        rawRpcAbbreviation = rpcLore.cloudRpcId;
        rpcEndpoint = `RPC_${toMacroCase(rpcLore.cloudRpcId)}_HTTP`;
      } else {
        rpcEndpoint = `RPC_${toMacroCase(archive.id)}_HTTP`;
      }

      // Get public RPC URL (empty string if not available)
      const publicRpcUrl = rpcLore?.publicRpc || '';

      networkConfigs[archive.id] = {
        name: archive.id,
        gateway,
        rpcEndpoint,
        finalityConfirmation,
        publicRpcUrl,
        rawRpcAbbreviation
      };
    }

    return networkConfigs;
  } catch (error) {
    console.error('Failed to fetch network configurations:', error);
    throw error;
  }
}

// Cache for network configurations
let networkConfigsCache: Record<string, NetworkInfo> | null = null;

/**
 * Gets network configurations, fetching them if not already cached
 */
export async function getNetworkConfigs(): Promise<Record<string, NetworkInfo>> {
  if (!networkConfigsCache) {
    networkConfigsCache = await fetchNetworkConfigs();
  }
  return networkConfigsCache;
}

/**
 * Synchronous access to network configurations - throws if not initialized
 * Use getNetworkConfigs() for async initialization
 */
export function getNetworkConfigsSync(): Record<string, NetworkInfo> {
  if (!networkConfigsCache) {
    throw new Error('Network configurations not initialized. Call getNetworkConfigs() first.');
  }
  return networkConfigsCache;
}

// For backward compatibility, export a synchronous version that will be initialized
// This will be populated when the module is first used
export const NETWORK_CONFIGS: Record<string, NetworkInfo> = {};

// Initialize the cache when the module is loaded
getNetworkConfigs().then(configs => {
  Object.assign(NETWORK_CONFIGS, configs);
}).catch(error => {
  console.error('Failed to initialize network configurations:', error);
  throw error;
});
