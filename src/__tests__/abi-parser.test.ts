import { parseAbiFile, findEventsInAbi, findEventByName, findEventBySignature, generateEventSignature, mapSolidityTypeToGraphQL } from '../abi-parser';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('ABI Parser', () => {
  const testAbiPath = path.join(__dirname, '..', '..', 'tests', 'event-tables', 'abi', 'erc20.json');

  beforeAll(async () => {
    // Ensure test ABI file exists
    if (!await fs.pathExists(testAbiPath)) {
      throw new Error(`Test ABI file not found: ${testAbiPath}`);
    }
  });

  describe('parseAbiFile', () => {
    it('should parse a valid ABI file', () => {
      const abi = parseAbiFile(testAbiPath);
      expect(Array.isArray(abi)).toBe(true);
      expect(abi.length).toBeGreaterThan(0);
    });

    it('should throw error for invalid file', () => {
      expect(() => parseAbiFile('nonexistent.json')).toThrow();
    });
  });

  describe('findEventsInAbi', () => {
    it('should find events in ABI', () => {
      const abi = parseAbiFile(testAbiPath);
      const events = findEventsInAbi(abi);
      
      expect(events.length).toBeGreaterThan(0);
      expect(events.every(event => event.type === 'event')).toBe(true);
    });
  });

  describe('findEventByName', () => {
    it('should find specific event by name', () => {
      const abi = parseAbiFile(testAbiPath);
      const transferEvent = findEventByName(abi, 'Transfer');
      
      expect(transferEvent).toBeDefined();
      expect(transferEvent?.name).toBe('Transfer');
      expect(transferEvent?.type).toBe('event');
    });

    it('should return undefined for non-existent event', () => {
      const abi = parseAbiFile(testAbiPath);
      const nonExistentEvent = findEventByName(abi, 'NonExistentEvent');
      
      expect(nonExistentEvent).toBeUndefined();
    });
  });

  describe('findEventBySignature', () => {
    it('should find specific event by full signature', () => {
      const abi = parseAbiFile(testAbiPath);
      const transferEvent = findEventBySignature(abi, 'Transfer(address,address,uint256)');
      
      expect(transferEvent).toBeDefined();
      expect(transferEvent?.name).toBe('Transfer');
      expect(transferEvent?.type).toBe('event');
    });

    it('should return undefined for non-existent signature', () => {
      const abi = parseAbiFile(testAbiPath);
      const nonExistentEvent = findEventBySignature(abi, 'NonExistentEvent(address)');
      
      expect(nonExistentEvent).toBeUndefined();
    });

    it('should return undefined for signature with wrong parameters', () => {
      const abi = parseAbiFile(testAbiPath);
      const wrongSignatureEvent = findEventBySignature(abi, 'Transfer(address,uint256)');
      
      expect(wrongSignatureEvent).toBeUndefined();
    });

    it('should return undefined for signature with wrong parameter types', () => {
      const abi = parseAbiFile(testAbiPath);
      const wrongTypesEvent = findEventBySignature(abi, 'Transfer(address,address,string)');
      
      expect(wrongTypesEvent).toBeUndefined();
    });
  });

  describe('generateEventSignature', () => {
    it('should generate correct event signature', () => {
      const abi = parseAbiFile(testAbiPath);
      const transferEvent = findEventByName(abi, 'Transfer');
      
      if (transferEvent) {
        const signature = generateEventSignature(transferEvent);
        expect(signature).toBe('Transfer(address,address,uint256)');
      }
    });
  });

  describe('mapSolidityTypeToGraphQL', () => {
    it('should map basic types correctly', () => {
      expect(mapSolidityTypeToGraphQL('address')).toBe('String');
      expect(mapSolidityTypeToGraphQL('string')).toBe('String');
      expect(mapSolidityTypeToGraphQL('bool')).toBe('Boolean');
      expect(mapSolidityTypeToGraphQL('uint256')).toBe('BigInt');
      expect(mapSolidityTypeToGraphQL('uint8')).toBe('Int');
      expect(mapSolidityTypeToGraphQL('bytes')).toBe('Bytes');
    });

    it('should handle arrays', () => {
      expect(mapSolidityTypeToGraphQL('address[]')).toBe('[String!]');
      expect(mapSolidityTypeToGraphQL('uint256[]')).toBe('[BigInt!]');
    });

    it('should handle fixed-size arrays', () => {
      expect(mapSolidityTypeToGraphQL('address[2]')).toBe('[String!]');
      expect(mapSolidityTypeToGraphQL('uint256[10]')).toBe('[BigInt!]');
    });

    it('should default to String for unknown types', () => {
      expect(mapSolidityTypeToGraphQL('unknownType')).toBe('String');
    });
  });
});
