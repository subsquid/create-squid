import * as fs from 'fs-extra';
import * as path from 'path';

export interface AbiEvent {
  name: string;
  type: 'event';
  anonymous: boolean;
  inputs: Array<{
    name: string;
    type: string;
    indexed: boolean;
  }>;
}

export interface AbiFunction {
  name: string;
  type: 'function';
  inputs: Array<{
    name: string;
    type: string;
  }>;
  outputs: Array<{
    name: string;
    type: string;
  }>;
}

export type AbiItem = AbiEvent | AbiFunction;

export function parseAbiFile(abiPath: string): AbiItem[] {
  const abiContent = fs.readFileSync(abiPath, 'utf8');
  return JSON.parse(abiContent);
}

export function findEventsInAbi(abi: AbiItem[]): AbiEvent[] {
  return abi.filter((item): item is AbiEvent => item.type === 'event');
}

export function findEventByName(abi: AbiItem[], eventName: string): AbiEvent | undefined {
  const events = findEventsInAbi(abi);
  return events.find(event => event.name === eventName);
}

export function findEventBySignature(abi: AbiItem[], eventSignature: string): AbiEvent | undefined {
  const events = findEventsInAbi(abi);
  return events.find(event => generateEventSignature(event) === eventSignature);
}

export function generateEventSignature(event: AbiEvent): string {
  const inputTypes = event.inputs.map(input => input.type).join(',');
  return `${event.name}(${inputTypes})`;
}

export function mapSolidityTypeToGraphQL(solidityType: string): string {
  const typeMap: Record<string, string> = {
    'address': 'String',
    'string': 'String',
    'bool': 'Boolean',
    'uint8': 'Int',
    'uint16': 'Int',
    'uint32': 'Int',
    'uint64': 'Int',
    'uint128': 'BigInt',
    'uint256': 'BigInt',
    'int8': 'Int',
    'int16': 'Int',
    'int32': 'Int',
    'int64': 'Int',
    'int128': 'BigInt',
    'int256': 'BigInt',
    'bytes': 'Bytes',
    'bytes32': 'Bytes',
  };

  // Handle arrays
  if (solidityType.endsWith('[]')) {
    const baseType = solidityType.slice(0, -2);
    return `[${mapSolidityTypeToGraphQL(baseType)}!]`;
  }

  // Handle fixed-size arrays
  const fixedArrayMatch = solidityType.match(/^(.+)\[(\d+)\]$/);
  if (fixedArrayMatch) {
    const baseType = fixedArrayMatch[1];
    return `[${mapSolidityTypeToGraphQL(baseType)}!]`;
  }

  return typeMap[solidityType] || 'String';
}
