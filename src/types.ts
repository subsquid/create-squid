import { CasingObject } from './string-transforms/casing';

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
  publicRpcUrl: string;
  rawRpcAbbreviation: string | null;
}

export interface GeneratorOptions {
  outputDir: string;
  projectName: string;
  projectDescription: string;
  skipInstall?: boolean;
  skipCodegen?: boolean;
  refreshDotEnv?: boolean;
  refreshPackageJson?: boolean;
  refreshReadme?: boolean;
  fullRefresh?: boolean;
}

export interface EventField {
  fieldName: CasingObject;
  fieldType: string;
  isBigInt: boolean;
  isBoolean: boolean;
  last: boolean;
}

export interface ProcessedEventForTemplate {
  eventName: CasingObject;
  contractName: CasingObject;
  eventFields: EventField[];
  previouslyProcessed: Array<{previouslyProcessedField: CasingObject, previouslyProcessedFieldType: CasingObject}>;
  tableName: CasingObject;
  hasPreviouslyProcessed: boolean;
}

export interface ProcessedInstanceForTemplate {
  name: CasingObject;
  address: string;
  proxy?: string;
  network: string;
  range: {
    from: number;
    to?: number;
  } | null;
  isOnNetwork: boolean;
  index?: number;
  last?: boolean;
}

export interface ProcessedContractForTemplate {
  contractName: CasingObject;
  abiFileName: string;
  abiImportName: CasingObject;
  events: ProcessedEventForTemplate[];
  instances?: ProcessedInstanceForTemplate[];
  hasInstancesOnNetwork?: boolean;
  last?: boolean;
}

export interface NetworkTemplateData {
  name: CasingObject;
  rpcAbbreviation: string | null;
  rpcEndpoint: string; // env var name in MACRO_CASE, like "RPC_ETH_HTTP"
  gateway: string;
  finalityConfirmation: number;
  publicRpcUrl: string;
  rawRpcAbbreviation: string | null;
  contracts: ProcessedContractForTemplate[];
  last: boolean;
}

export interface ContractTemplateData {
  projectName: CasingObject;
  projectDescription: string;
  contracts: ProcessedContractForTemplate[];
}

export interface NetworkBasedTemplateData {
  projectName: CasingObject;
  projectDescription: string;
  networks: NetworkTemplateData[];
  contracts: ProcessedContractForTemplate[];
}
