export interface CreateSquidConfig {
  name: string;
  description: string;
  style: 'batchHandlers';
  target: {
    type: 'postgres';
  };
  contracts: ContractConfig[];
}

export interface ContractConfig {
  name: string;
  abi: string;
  instances: ContractInstance[];
  events: string[];
}

export interface ContractInstance {
  address: string;
  proxy?: string;
  name: string;
  network: string;
  range: {
    from: number;
    to?: number;
  };
}

export interface GeneratedProject {
  name: string;
  description: string;
  contracts: ProcessedContract[];
  networks: string[];
}

export interface ProcessedContract {
  name: string;
  abiPath: string;
  instances: ProcessedInstance[];
  events: ProcessedEvent[];
}

export interface ProcessedInstance {
  name: string;
  address: string;
  proxy?: string;
  network: string;
  range: {
    from: number;
    to?: number;
  };
}

export interface ProcessedEvent {
  name: string;
  signature: string;
  abiEvent: any;
}

export interface NetworkInfo {
  name: string;
  gateway: string;
  rpcEndpoint: string;
  finalityConfirmation: number;
}

export interface GeneratorOptions {
  outputDir: string;
  projectName: string;
  projectDescription: string;
  skipInstall?: boolean;
  skipCodegen?: boolean;
}

export interface EventField {
  fieldName: string;
  fieldType: string;
  last: boolean;
}

export interface ProcessedEventForTemplate {
  name: string;
  eventNameLower: string;
  contractNameLower: string;
  contractName?: string;
  eventFields: EventField[];
}

export interface ProcessedInstanceForTemplate {
  name: string;
  address: string;
  proxy?: string;
  network: string;
  range: {
    from: number;
    to?: number;
  } | null;
  isOnNetwork: boolean;
}

export interface ProcessedContractForTemplate {
  name: string;
  contractNameLower: string;
  contractNameCamel: string;
  abiFileName: string;
  abiImportName: string;
  events: ProcessedEventForTemplate[];
  instances?: ProcessedInstanceForTemplate[];
  hasInstancesOnNetwork?: boolean;
  last?: boolean;
}

export interface NetworkTemplateData {
  name: string;
  shortName: string;
  gateway: string;
  rpcEndpoint: string;
  finalityConfirmation: number;
  contracts: ProcessedContractForTemplate[];
  last: boolean;
}

export interface ContractTemplateData {
  projectName: string;
  projectDescription: string;
  contracts: ProcessedContractForTemplate[];
}

export interface NetworkBasedTemplateData {
  projectName: string;
  projectDescription: string;
  networks: NetworkTemplateData[];
  contracts: ProcessedContractForTemplate[];
}
