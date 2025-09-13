import { extractShortNetworkName } from './network';

describe('String Transforms - Network', () => {
  describe('extractShortNetworkName', () => {
    it('should extract short network name from valid RPC endpoint', () => {
      expect(extractShortNetworkName('RPC_ETH_HTTP')).toBe('eth');
      expect(extractShortNetworkName('RPC_BTC_HTTP')).toBe('btc');
      expect(extractShortNetworkName('RPC_POLYGON_HTTP')).toBe('polygon');
      expect(extractShortNetworkName('RPC_AVALANCHE_HTTP')).toBe('avalanche');
    });

    it('should handle network names with underscores', () => {
      expect(extractShortNetworkName('RPC_ARBITRUM_ONE_HTTP')).toBe('arbitrum-one');
      expect(extractShortNetworkName('RPC_BASE_MAINNET_HTTP')).toBe('base-mainnet');
      expect(extractShortNetworkName('RPC_OPTIMISM_MAINNET_HTTP')).toBe('optimism-mainnet');
      expect(extractShortNetworkName('RPC_POLYGON_MUMBAI_HTTP')).toBe('polygon-mumbai');
    });

    it('should handle network names with multiple underscores', () => {
      expect(extractShortNetworkName('RPC_ETHEREUM_MAINNET_HTTP')).toBe('ethereum-mainnet');
      expect(extractShortNetworkName('RPC_BINANCE_SMART_CHAIN_HTTP')).toBe('binance-smart-chain');
      expect(extractShortNetworkName('RPC_FANTOM_OPERA_HTTP')).toBe('fantom-opera');
    });

    it('should convert to lowercase', () => {
      expect(extractShortNetworkName('RPC_ETH_HTTP')).toBe('eth');
      expect(extractShortNetworkName('RPC_BTC_HTTP')).toBe('btc');
      expect(extractShortNetworkName('RPC_POLYGON_HTTP')).toBe('polygon');
    });

    it('should handle single word network names', () => {
      expect(extractShortNetworkName('RPC_ETH_HTTP')).toBe('eth');
      expect(extractShortNetworkName('RPC_BTC_HTTP')).toBe('btc');
      expect(extractShortNetworkName('RPC_ADA_HTTP')).toBe('ada');
      expect(extractShortNetworkName('RPC_DOT_HTTP')).toBe('dot');
    });

    it('should handle network names with numbers', () => {
      expect(extractShortNetworkName('RPC_CHAIN_1_HTTP')).toBe('chain-1');
      expect(extractShortNetworkName('RPC_NETWORK_2_HTTP')).toBe('network-2');
      expect(extractShortNetworkName('RPC_TESTNET_3_HTTP')).toBe('testnet-3');
    });

    it('should handle testnet names', () => {
      expect(extractShortNetworkName('RPC_ETH_GOERLI_HTTP')).toBe('eth-goerli');
      expect(extractShortNetworkName('RPC_ETH_SEPOLIA_HTTP')).toBe('eth-sepolia');
      expect(extractShortNetworkName('RPC_POLYGON_MUMBAI_HTTP')).toBe('polygon-mumbai');
      expect(extractShortNetworkName('RPC_BSC_TESTNET_HTTP')).toBe('bsc-testnet');
    });

    it('should handle layer 2 networks', () => {
      expect(extractShortNetworkName('RPC_ARBITRUM_ONE_HTTP')).toBe('arbitrum-one');
      expect(extractShortNetworkName('RPC_OPTIMISM_MAINNET_HTTP')).toBe('optimism-mainnet');
      expect(extractShortNetworkName('RPC_POLYGON_POS_HTTP')).toBe('polygon-pos');
      expect(extractShortNetworkName('RPC_BASE_MAINNET_HTTP')).toBe('base-mainnet');
    });

    it('should handle sidechain networks', () => {
      expect(extractShortNetworkName('RPC_POLYGON_MAINNET_HTTP')).toBe('polygon-mainnet');
      expect(extractShortNetworkName('RPC_BSC_MAINNET_HTTP')).toBe('bsc-mainnet');
      expect(extractShortNetworkName('RPC_AVALANCHE_C_CHAIN_HTTP')).toBe('avalanche-c-chain');
    });

    it('should throw error for invalid format without RPC_ prefix', () => {
      expect(() => extractShortNetworkName('ETH_HTTP')).toThrow('Invalid rpcEndpoint format: ETH_HTTP');
      expect(() => extractShortNetworkName('POLYGON_HTTP')).toThrow('Invalid rpcEndpoint format: POLYGON_HTTP');
    });

    it('should throw error for invalid format without _HTTP suffix', () => {
      expect(() => extractShortNetworkName('RPC_ETH')).toThrow('Invalid rpcEndpoint format: RPC_ETH');
      expect(() => extractShortNetworkName('RPC_POLYGON')).toThrow('Invalid rpcEndpoint format: RPC_POLYGON');
    });

    it('should throw error for invalid format with wrong suffix', () => {
      expect(() => extractShortNetworkName('RPC_ETH_HTTPS')).toThrow('Invalid rpcEndpoint format: RPC_ETH_HTTPS');
      expect(() => extractShortNetworkName('RPC_ETH_WS')).toThrow('Invalid rpcEndpoint format: RPC_ETH_WS');
      expect(() => extractShortNetworkName('RPC_ETH_WSS')).toThrow('Invalid rpcEndpoint format: RPC_ETH_WSS');
    });

    it('should throw error for empty string', () => {
      expect(() => extractShortNetworkName('')).toThrow('Invalid rpcEndpoint format: ');
    });

    it('should throw error for malformed strings', () => {
      expect(() => extractShortNetworkName('RPC_ETH_HTTP_EXTRA')).toThrow('Invalid rpcEndpoint format: RPC_ETH_HTTP_EXTRA');
      expect(() => extractShortNetworkName('RPC_ETH_HTTP_')).toThrow('Invalid rpcEndpoint format: RPC_ETH_HTTP_');
      expect(() => extractShortNetworkName('_RPC_ETH_HTTP')).toThrow('Invalid rpcEndpoint format: _RPC_ETH_HTTP');
    });

    it('should throw error for strings with spaces', () => {
      expect(() => extractShortNetworkName('RPC ETH HTTP')).toThrow('Invalid rpcEndpoint format: RPC ETH HTTP');
      expect(() => extractShortNetworkName('RPC_ETH HTTP')).toThrow('Invalid rpcEndpoint format: RPC_ETH HTTP');
      expect(() => extractShortNetworkName('RPC ETH_HTTP')).toThrow('Invalid rpcEndpoint format: RPC ETH_HTTP');
    });

    it('should throw error for strings with special characters', () => {
      expect(() => extractShortNetworkName('RPC_ETH-HTTP')).toThrow('Invalid rpcEndpoint format: RPC_ETH-HTTP');
      expect(() => extractShortNetworkName('RPC_ETH.HTTP')).toThrow('Invalid rpcEndpoint format: RPC_ETH.HTTP');
      expect(() => extractShortNetworkName('RPC_ETH@HTTP')).toThrow('Invalid rpcEndpoint format: RPC_ETH@HTTP');
    });

    it('should handle case variations in network names', () => {
      expect(extractShortNetworkName('RPC_ETH_HTTP')).toBe('eth');
      expect(extractShortNetworkName('RPC_Eth_HTTP')).toBe('eth');
      expect(extractShortNetworkName('RPC_ETHEREUM_HTTP')).toBe('ethereum');
      expect(extractShortNetworkName('RPC_Ethereum_HTTP')).toBe('ethereum');
    });

    it('should handle very long network names', () => {
      const longNetworkName = 'VERY_LONG_NETWORK_NAME_WITH_MANY_UNDERSCORES';
      expect(extractShortNetworkName(`RPC_${longNetworkName}_HTTP`)).toBe('very-long-network-name-with-many-underscores');
    });

    it('should handle network names with consecutive underscores', () => {
      expect(extractShortNetworkName('RPC_ETH__MAINNET_HTTP')).toBe('eth--mainnet');
      expect(extractShortNetworkName('RPC_POLYGON___TESTNET_HTTP')).toBe('polygon---testnet');
    });

    it('should handle edge cases with minimal network names', () => {
      expect(extractShortNetworkName('RPC_A_HTTP')).toBe('a');
      expect(extractShortNetworkName('RPC_AB_HTTP')).toBe('ab');
      expect(extractShortNetworkName('RPC_ABC_HTTP')).toBe('abc');
    });

    it('should handle network names that are already lowercase', () => {
      expect(extractShortNetworkName('RPC_eth_HTTP')).toBe('eth');
      expect(extractShortNetworkName('RPC_polygon_HTTP')).toBe('polygon');
      expect(extractShortNetworkName('RPC_arbitrum_one_HTTP')).toBe('arbitrum-one');
    });

    it('should handle network names with mixed case', () => {
      expect(extractShortNetworkName('RPC_Eth_HTTP')).toBe('eth');
      expect(extractShortNetworkName('RPC_Polygon_HTTP')).toBe('polygon');
      expect(extractShortNetworkName('RPC_Arbitrum_One_HTTP')).toBe('arbitrum-one');
    });

    it('should handle real-world network examples', () => {
      // Ethereum networks
      expect(extractShortNetworkName('RPC_ETHEREUM_MAINNET_HTTP')).toBe('ethereum-mainnet');
      expect(extractShortNetworkName('RPC_ETH_GOERLI_HTTP')).toBe('eth-goerli');
      expect(extractShortNetworkName('RPC_ETH_SEPOLIA_HTTP')).toBe('eth-sepolia');
      
      // Polygon networks
      expect(extractShortNetworkName('RPC_POLYGON_MAINNET_HTTP')).toBe('polygon-mainnet');
      expect(extractShortNetworkName('RPC_POLYGON_MUMBAI_HTTP')).toBe('polygon-mumbai');
      
      // Other major networks
      expect(extractShortNetworkName('RPC_BSC_MAINNET_HTTP')).toBe('bsc-mainnet');
      expect(extractShortNetworkName('RPC_AVALANCHE_MAINNET_HTTP')).toBe('avalanche-mainnet');
      expect(extractShortNetworkName('RPC_FANTOM_OPERA_HTTP')).toBe('fantom-opera');
      expect(extractShortNetworkName('RPC_CRONOS_MAINNET_HTTP')).toBe('cronos-mainnet');
    });
  });
});
