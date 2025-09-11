import { NetworkInfo } from './types';

export const NETWORK_CONFIGS: Record<string, NetworkInfo> = {
  'ethereum-mainnet': {
    name: 'ethereum-mainnet',
    gateway: 'https://v2.archive.subsquid.io/network/ethereum-mainnet',
    rpcEndpoint: 'RPC_ETH_HTTP',
    finalityConfirmation: 75
  },
  'arbitrum-one': {
    name: 'arbitrum-one',
    gateway: 'https://v2.archive.subsquid.io/network/arbitrum-one',
    rpcEndpoint: 'RPC_ARBITRUM_ONE_HTTP',
    finalityConfirmation: 15
  },
  'polygon-mainnet': {
    name: 'polygon-mainnet',
    gateway: 'https://v2.archive.subsquid.io/network/polygon-mainnet',
    rpcEndpoint: 'RPC_POLYGON_HTTP',
    finalityConfirmation: 50
  },
  'base-mainnet': {
    name: 'base-mainnet',
    gateway: 'https://v2.archive.subsquid.io/network/base-mainnet',
    rpcEndpoint: 'RPC_BASE_HTTP',
    finalityConfirmation: 10
  }
};
