import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as mustache from 'mustache';
import { glob } from 'glob';
import {
  CreateSquidConfig,
  GeneratedProject,
  ProcessedContract,
  ProcessedInstance,
  ProcessedEvent,
  GeneratorOptions,
  ContractTemplateData,
  NetworkBasedTemplateData,
  ProcessedContractForTemplate
} from './types';
import {
  parseAbiFile,
  findEventBySignature,
  mapSolidityTypeToGraphQL
} from './abi-parser';
import { getNetworkConfigs } from './network-configs';
import { extractEventName } from './string-transforms/event';
import {
  decapitalize,
  kebabToCamel,
  toSnakeCase,
  capitalize
} from './string-transforms/casing';
import { extractShortNetworkName } from './string-transforms/network';
import { cleanupExistingFiles } from './filesystem';
import { runCodeGeneration, installDependencies } from './external-calls';

/**
 * Custom error types for better error handling
 */
export class SquidGeneratorError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'SquidGeneratorError';
  }
}

export class ConfigError extends SquidGeneratorError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigError';
  }
}

export class TemplateError extends SquidGeneratorError {
  constructor(message: string) {
    super(message, 'TEMPLATE_ERROR');
    this.name = 'TemplateError';
  }
}

/**
 * Main class for generating Squid projects from configuration files
 * 
 * This class handles the complete process of generating a Squid project including:
 * - Loading and validating configuration
 * - Processing contracts and events
 * - Rendering templates with appropriate data
 * - Managing file cleanup and code generation
 * - Installing dependencies
 * 
 * @example
 * ```typescript
 * const generator = new SquidGenerator('createSquid.yaml', {
 *   outputDir: './my-squid',
 *   skipInstall: false,
 *   skipCodegen: false
 * });
 * await generator.generate();
 * ```
 */
export class SquidGenerator {
  private config: CreateSquidConfig;
  private configPath: string;
  private options: GeneratorOptions;
  private templatesDir: string;
  private generatedFiles: Set<string> = new Set();

  // Template file patterns for different data preparation strategies
  private static readonly CONTRACT_TEMPLATE_PATTERNS = ['schema.graphql', 'processor.ts', 'main.ts'];
  private static readonly NETWORK_TEMPLATE_PATTERNS = ['config.ts'];
  private static readonly PRESERVED_FILES = new Set(['createSquid.yaml']);
  private static readonly PRESERVED_DIRS = new Set(['abi']);

  /**
   * Creates a new SquidGenerator instance
   * 
   * @param configPath - Path to the createSquid.yaml configuration file
   * @param options - Generator options including output directory and flags
   * @throws {ConfigError} When the configuration file cannot be loaded or is invalid
   */
  constructor(configPath: string, options: GeneratorOptions) {
    this.configPath = configPath;
    this.config = this.loadConfig(configPath);
    this.options = options;
    this.templatesDir = path.join(__dirname, '..', 'templates');
  }

  /**
   * Loads and validates the configuration file
   * 
   * @param configPath - Path to the configuration file
   * @returns The loaded and validated configuration
   * @throws {ConfigError} When the file cannot be loaded or is invalid
   */
  private loadConfig(configPath: string): CreateSquidConfig {
    try {
      if (!fs.existsSync(configPath)) {
        throw new ConfigError(`Configuration file not found: ${configPath}`);
      }
      
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent) as CreateSquidConfig;
      
      if (!config) {
        throw new ConfigError('Configuration file is empty or invalid');
      }
      
      if (!config.name || !config.contracts || !Array.isArray(config.contracts)) {
        throw new ConfigError('Configuration file is missing required fields: name, contracts');
      }
      
      return config;
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      throw new ConfigError(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates a complete Squid project from the configuration
   * 
   * This method orchestrates the entire generation process:
   * 1. Validates the output directory exists
   * 2. Processes the configuration and validates all contracts/events
   * 3. Renders all template files with appropriate data
   * 4. Cleans up any existing files that weren't generated
   * 5. Installs npm dependencies (if not skipped)
   * 6. Runs external code generation tools (if not skipped)
   * 
   * @throws {ConfigError} When configuration processing fails
   * @throws {TemplateError} When template rendering fails
   * @throws {Error} When output directory doesn't exist
   */
  public async generate(): Promise<void> {
    console.log('Starting squid project generation...');

    // Ensure output directory exists (should already exist with createSquid.yaml and ./abi)
    if (!await fs.pathExists(this.options.outputDir)) {
      throw new Error(`Output directory does not exist: ${this.options.outputDir}`);
    }

    // Process the configuration
    const project = await this.processConfig();

    // Generate files from templates
    await this.generateFromTemplates(project);

    // Clean up any files that were not generated
    await cleanupExistingFiles(
      this.options.outputDir, 
      this.generatedFiles, 
      SquidGenerator.PRESERVED_FILES, 
      SquidGenerator.PRESERVED_DIRS
    );

    // Install dependencies
    if (!this.options.skipInstall) {
      await installDependencies(this.options.outputDir, this.generatedFiles);
    }

    // Run external code generation tools
    if (!this.options.skipCodegen) {
      await runCodeGeneration(this.options.outputDir, this.generatedFiles);
    }

    console.log('Squid project generated successfully!');
  }

  /**
   * Processes the configuration and validates all contracts and events
   * 
   * @returns The processed project data ready for template rendering
   * @throws {ConfigError} When contract processing fails
   */
  private async processConfig(): Promise<GeneratedProject> {
    const contracts: ProcessedContract[] = [];
    const networks = new Set<string>();

    for (const contract of this.config.contracts) {
      try {
        const abiPath = path.resolve(this.options.outputDir, contract.abi);
        
        if (!fs.existsSync(abiPath)) {
          throw new ConfigError(`ABI file not found: ${abiPath}`);
        }
        
        const abi = parseAbiFile(abiPath);

        const processedInstances: ProcessedInstance[] = contract.instances.map(instance => ({
          name: instance.name,
          address: instance.address,
          proxy: instance.proxy,
          network: instance.network,
          range: instance.range
        }));

        const processedEvents: ProcessedEvent[] = contract.events.map(eventSignature => {
          const abiEvent = findEventBySignature(abi, eventSignature);
          
          if (!abiEvent) {
            throw new ConfigError(`Event with signature ${eventSignature} not found in ABI ${contract.abi}`);
          }

          const eventName = extractEventName(eventSignature);
          return {
            name: eventName,
            signature: eventSignature,
            abiEvent
          };
        });

        contracts.push({
          name: contract.name,
          abiPath: contract.abi,
          instances: processedInstances,
          events: processedEvents
        });

        // Collect unique networks
        contract.instances.forEach(instance => networks.add(instance.network));
      } catch (error) {
        if (error instanceof ConfigError) {
          throw error;
        }
        throw new ConfigError(`Failed to process contract ${contract.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return {
      name: this.config.name,
      description: this.config.description,
      contracts,
      networks: Array.from(networks)
    };
  }


  private async generateFromTemplates(project: GeneratedProject): Promise<void> {
    const templateFiles = await glob('**/*.mustache', { cwd: this.templatesDir, dot: true });

    for (const templateFile of templateFiles) {
      const templatePath = path.join(this.templatesDir, templateFile);
      
      // Check if this is a dynamic template (contains placeholders in filename)
      if (templateFile.includes('{{') && templateFile.includes('}}')) {
        await this.generateDynamicTemplates(templatePath, templateFile, project);
      } else {
        const outputPath = path.join(
          this.options.outputDir,
          templateFile.replace('.mustache', '')
        );
        await this.renderTemplate(templatePath, outputPath, project);
      }
    }
  }

  private async generateDynamicTemplates(templatePath: string, templateFile: string, project: GeneratedProject): Promise<void> {
    const templateData = prepareContractTemplateData(project);
    
    // Generate templates for each contract and event
    for (const contractData of templateData.contracts) {
      for (const eventData of contractData.events) {
        // Replace placeholders in filename
        let outputFileName = templateFile
          .replace('{{contractNameLower}}', contractData.contractNameLower)
          .replace('{{eventNameLower}}', eventData.eventNameLower)
          .replace('.mustache', '');

        const outputPath = path.join(this.options.outputDir, outputFileName);

        // Use contractData directly - it already has all the needed data including previouslyProcessed
        const specificTemplateData = {
          ...templateData,
          contractName: contractData.name,
          contractNameLower: contractData.contractNameLower,
          eventName: eventData.name,
          eventNameLower: eventData.eventNameLower,
          eventFields: eventData.eventFields,
          instances: contractData.instances,
          previouslyProcessed: eventData.previouslyProcessed,
          tableNameSnake: eventData.tableNameSnake,
          hasPreviouslyProcessed: eventData.hasPreviouslyProcessed
        };

        await this.renderTemplateWithData(templatePath, outputPath, specificTemplateData);
      }
    }
  }

  private async renderTemplate(templatePath: string, outputPath: string, project: GeneratedProject): Promise<void> {
    const template = await fs.readFile(templatePath, 'utf8');
    
    // Determine which template data function to use based on the template file
    const templateData = await this.selectTemplateData(templatePath, project);
    
    await this.renderTemplateWithData(templatePath, outputPath, templateData);
  }

  /**
   * Selects the appropriate template data preparation strategy based on the template file
   */
  private async selectTemplateData(templatePath: string, project: GeneratedProject): Promise<any> {
    const isContractTemplate = SquidGenerator.CONTRACT_TEMPLATE_PATTERNS.some(pattern => 
      templatePath.includes(pattern)
    );
    
    if (isContractTemplate) {
      // These templates need contract data without network-specific filtering
      return prepareContractTemplateData(project);
    } else {
      // Other templates (including config.ts) need network-based data
      return await prepareNetworkBasedTemplateData(project);
    }
  }

  private async renderTemplateWithData(templatePath: string, outputPath: string, templateData: any): Promise<void> {
    try {
      const template = await fs.readFile(templatePath, 'utf8');
      
      const rendered = mustache.render(template, templateData);
      
      // Ensure output directory exists
      await fs.ensureDir(path.dirname(outputPath));
      
      await fs.writeFile(outputPath, rendered);
      
      // Track this file as generated
      const relativePath = path.relative(this.options.outputDir, outputPath);
      this.generatedFiles.add(relativePath);
    } catch (error) {
      throw new TemplateError(`Failed to render template ${templatePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
/**
 * Template data preparation utilities
 */

/**
 * Prepares contract template data for templates that need all contracts
 */
function prepareContractTemplateData(project: GeneratedProject): ContractTemplateData {
  // Build a flat list of all events in order to determine previously processed fields
  const allEvents: Array<{contract: ProcessedContract, event: ProcessedEvent}> = [];
  for (const contract of project.contracts) {
    for (const event of contract.events) {
      allEvents.push({ contract, event });
    }
  }

  const contracts = project.contracts.map((contract, index) => {
    return processContractForTemplate(contract, index === project.contracts.length - 1, allEvents);
  });

  return {
    projectName: project.name,
    projectDescription: project.description,
    contracts
  };
}

/**
 * Prepares network-based template data for templates that need network-specific information
 */
async function prepareNetworkBasedTemplateData(project: GeneratedProject): Promise<NetworkBasedTemplateData> {
  // Build a flat list of all events in order to determine previously processed fields
  const allEvents: Array<{contract: ProcessedContract, event: ProcessedEvent}> = [];
  for (const contract of project.contracts) {
    for (const event of contract.events) {
      allEvents.push({ contract, event });
    }
  }

  // Get network configurations
  const networkConfigs = await getNetworkConfigs();

  const networks = project.networks.map((networkName, index) => {
    const networkConfig = networkConfigs[networkName];
    if (!networkConfig) {
      throw new Error(`Unknown network: ${networkName}`);
    }
    
    const shortName = extractShortNetworkName(networkConfig.rpcEndpoint);
    
    const contracts = project.contracts.map(contract => {
      const processedContract = processContractForTemplate(contract, false, allEvents);
      
      const instances = contract.instances.map(instance => ({
        name: instance.name,
        address: instance.address,
        proxy: instance.proxy,
        network: instance.network,
        range: instance.range,
        isOnNetwork: instance.network === networkName
      }));

      const hasInstancesOnNetwork = instances.some(instance => instance.isOnNetwork);

      return {
        ...processedContract,
        instances,
        hasInstancesOnNetwork
      };
    });

    return {
      name: networkName,
      shortName,
      gateway: networkConfig.gateway,
      rpcEndpoint: networkConfig.rpcEndpoint,
      finalityConfirmation: networkConfig.finalityConfirmation,
      publicRpcUrl: networkConfig.publicRpcUrl,
      rawRpcAbbreviation: networkConfig.rawRpcAbbreviation,
      contracts,
      last: index === project.networks.length - 1
    };
  });

  // For schema.graphql and other templates that need all contracts
  const contracts = project.contracts.map((contract, index) => {
    return processContractForTemplate(contract, index === project.contracts.length - 1, allEvents);
  });

  return {
    projectName: project.name,
    projectDescription: project.description,
    networks,
    contracts
  };
}

/**
 * Processes a contract for template rendering
 */
function processContractForTemplate(
  contract: ProcessedContract, 
  isLast: boolean = false, 
  allEvents: Array<{contract: ProcessedContract, event: ProcessedEvent}>
): ProcessedContractForTemplate {
  const contractNameLower = decapitalize(contract.name);
  const contractNameCamel = decapitalize(contract.name);
  const abiFileName = path.basename(contract.abiPath, '.json');
  const abiImportName = kebabToCamel(abiFileName);
  
  const events = contract.events.map(event => {
    const eventNameLower = decapitalize(event.name);
    
    const eventFields = event.abiEvent.inputs.map((input: any, index: number, array: any[]) => {
      const fieldType = mapSolidityTypeToGraphQL(input.type);
      return {
        fieldName: input.name,
        fieldNameSnake: toSnakeCase(input.name),
        fieldType,
        isBigInt: fieldType === 'BigInt',
        isBoolean: fieldType === 'Boolean',
        last: index === array.length - 1
      };
    });

    // Find the current event index in the global event list
    const currentEventIndex = allEvents.findIndex(ae => 
      ae.contract.name === contract.name && ae.event.name === event.name
    );

    // Build previously processed fields for this event
    const previouslyProcessed = [];
    for (let i = 0; i < currentEventIndex; i++) {
      const prevEvent = allEvents[i];
      previouslyProcessed.push({
        previouslyProcessedField: decapitalize(prevEvent.event.name) + 's',
        previouslyProcessedFieldType: prevEvent.contract.name + prevEvent.event.name
      });
    }

    return {
      name: event.name,
      eventNameLower,
      contractNameLower,
      contractName: contract.name,
      eventFields,
      previouslyProcessed,
      tableNameSnake: `${toSnakeCase(contract.name)}_${toSnakeCase(event.name)}`,
      hasPreviouslyProcessed: previouslyProcessed.length > 0
    };
  });

  const result: ProcessedContractForTemplate = {
    name: contract.name,
    contractNameLower,
    contractNameCamel,
    abiFileName,
    abiImportName,
    events,
    last: isLast
  };

  result.instances = contract.instances.map((instance, index) => ({
    name: instance.name,
    nameCapitalized: capitalize(instance.name),
    address: instance.address,
    proxy: instance.proxy,
    network: instance.network,
    range: instance.range,
    isOnNetwork: true, // For dynamic templates, we include all instances
    index: index,
    last: index === contract.instances.length - 1
  }));

  return result;
}
