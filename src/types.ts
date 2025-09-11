export interface CreateSquidConfig {
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
