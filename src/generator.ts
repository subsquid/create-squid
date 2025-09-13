import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as mustache from 'mustache';
import { execSync } from 'child_process';
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
  ProcessedContractForTemplate,
  ProcessedEventForTemplate,
  ProcessedInstanceForTemplate
} from './types';
import {
  parseAbiFile,
  findEventByName,
  findEventBySignature,
  generateEventSignature,
  mapSolidityTypeToGraphQL
} from './abi-parser';
import { NETWORK_CONFIGS } from './network-configs';

export class SquidGenerator {
  private config: CreateSquidConfig;
  private configPath: string;
  private options: GeneratorOptions;
  private templatesDir: string;
  private generatedFiles: Set<string> = new Set();

  constructor(configPath: string, options: GeneratorOptions) {
    this.configPath = configPath;
    this.config = this.loadConfig(configPath);
    this.options = options;
    this.templatesDir = path.join(__dirname, '..', 'templates');
  }

  private loadConfig(configPath: string): CreateSquidConfig {
    const configContent = fs.readFileSync(configPath, 'utf8');
    return yaml.load(configContent) as CreateSquidConfig;
  }

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
    await this.cleanupExistingFiles();

    // Install dependencies
    if (!this.options.skipInstall) {
      await this.installDependencies();
    }

    // Run external code generation tools
    if (!this.options.skipCodegen) {
      await this.runCodeGeneration();
    }

    console.log('Squid project generated successfully!');
  }

  private async processConfig(): Promise<GeneratedProject> {
    const contracts: ProcessedContract[] = [];
    const networks = new Set<string>();

    for (const contract of this.config.contracts) {
      const abiPath = path.resolve(this.options.outputDir, contract.abi);
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
          throw new Error(`Event with signature ${eventSignature} not found in ABI ${contract.abi}`);
        }

        const eventName = this.extractEventName(eventSignature);
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
    }

    return {
      name: this.config.name,
      description: this.config.description,
      contracts,
      networks: Array.from(networks)
    };
  }

  private extractEventName(eventSignature: string): string {
    const match = eventSignature.match(/^(\w+)\(/);
    if (!match) {
      throw new Error(`Invalid event signature: ${eventSignature}`);
    }
    return match[1];
  }

  private decapitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  private capitalize(str: string): string {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private camelCase(str: string): string {
    if (!str) return str;
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  private toCamelCase(str: string): string {
    if (!str) return str;
    return str.replace(/-(.)/g, (match, letter) => letter.toUpperCase());
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
    const templateData = this.prepareContractTemplateData(project);
    
    // Generate templates for each contract and event
    for (const contractData of templateData.contracts) {
      for (const eventData of contractData.events) {
        // Replace placeholders in filename
        let outputFileName = templateFile
          .replace('{{contractNameLower}}', contractData.contractNameLower)
          .replace('{{eventNameLower}}', eventData.eventNameLower)
          .replace('.mustache', '');

        const outputPath = path.join(this.options.outputDir, outputFileName);

        // Find the corresponding contract and event in the original project data
        const originalContract = project.contracts.find(c => c.name === contractData.name);
        const originalEvent = originalContract?.events.find(e => e.name === eventData.name);

        if (!originalContract || !originalEvent) {
          throw new Error(`Could not find original contract/event data for ${contractData.name}.${eventData.name}`);
        }

        // Get previously processed fields for this event
        const previouslyProcessed = this.getPreviouslyProcessedFields(project, originalContract, originalEvent);

        // Use contractData directly - it already has all the needed data
        const specificTemplateData = {
          ...templateData,
          contractName: contractData.name,
          contractNameLower: contractData.contractNameLower,
          eventName: eventData.name,
          eventNameLower: eventData.eventNameLower,
          eventFields: eventData.eventFields,
          instances: contractData.instances,
          previouslyProcessed
        };

        await this.renderTemplateWithData(templatePath, outputPath, specificTemplateData);
      }
    }
  }

  private async renderTemplate(templatePath: string, outputPath: string, project: GeneratedProject): Promise<void> {
    const template = await fs.readFile(templatePath, 'utf8');
    
    // Determine which template data function to use based on the template file
    let templateData;
    if (templatePath.includes('schema.graphql') || templatePath.includes('processor.ts') || templatePath.includes('main.ts')) {
      // These templates need contract data without network-specific filtering
      templateData = this.prepareContractTemplateData(project);
    } else if (templatePath.includes('config.ts')) {
      // Config template needs network-based data with instances
      templateData = this.prepareNetworkBasedTemplateData(project);
    } else {
      // Other templates need network-based data
      templateData = this.prepareNetworkBasedTemplateData(project);
    }
    
    await this.renderTemplateWithData(templatePath, outputPath, templateData);
  }

  private async renderTemplateWithData(templatePath: string, outputPath: string, templateData: any): Promise<void> {
    const template = await fs.readFile(templatePath, 'utf8');
    
    const rendered = mustache.render(template, templateData);
    
    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));
    
    await fs.writeFile(outputPath, rendered);
    
    // Track this file as generated
    const relativePath = path.relative(this.options.outputDir, outputPath);
    this.generatedFiles.add(relativePath);
  }

  private extractShortNetworkName(rpcEndpoint: string): string {
    // Extract network name from RPC_ETH_HTTP -> eth, RPC_ARBITRUM_ONE_HTTP -> arbitrum-one
    const match = rpcEndpoint.match(/^RPC_(.+)_HTTP$/);
    if (!match) {
      throw new Error(`Invalid rpcEndpoint format: ${rpcEndpoint}`);
    }
    return match[1].toLowerCase().replace(/_/g, '-');
  }

  private prepareContractTemplateData(project: GeneratedProject): ContractTemplateData {
    const contracts = project.contracts.map((contract, index) => {
      return this.processContractForTemplate(contract, index === project.contracts.length - 1);
    });

    return {
      projectName: project.name,
      projectDescription: project.description,
      contracts
    };
  }

  private prepareNetworkBasedTemplateData(project: GeneratedProject): NetworkBasedTemplateData {
    const networks = project.networks.map((networkName, index) => {
      const networkConfig = NETWORK_CONFIGS[networkName];
      if (!networkConfig) {
        throw new Error(`Unknown network: ${networkName}`);
      }
      
      const shortName = this.extractShortNetworkName(networkConfig.rpcEndpoint);
      
      const contracts = project.contracts.map(contract => {
        const processedContract = this.processContractForTemplate(contract);
        
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
        contracts,
        last: index === project.networks.length - 1
      };
    });

    // For schema.graphql and other templates that need all contracts
    const contracts = project.contracts.map((contract, index) => {
      return this.processContractForTemplate(contract, index === project.contracts.length - 1);
    });

    return {
      projectName: project.name,
      projectDescription: project.description,
      networks,
      contracts
    };
  }

  private processContractForTemplate(contract: ProcessedContract, isLast: boolean = false): ProcessedContractForTemplate {
    const contractNameLower = this.decapitalize(contract.name);
    const contractNameCamel = this.camelCase(contract.name);
    const abiFileName = path.basename(contract.abiPath, '.json');
    const abiImportName = this.toCamelCase(abiFileName);
    
    const events = contract.events.map(event => {
      const eventNameLower = this.decapitalize(event.name);
      
      const eventFields = event.abiEvent.inputs.map((input: any, index: number, array: any[]) => ({
        fieldName: input.name,
        fieldType: mapSolidityTypeToGraphQL(input.type),
        last: index === array.length - 1
      }));

      return {
        name: event.name,
        eventNameLower,
        contractNameLower,
        contractName: contract.name,
        eventFields
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

    result.instances = contract.instances.map(instance => ({
      name: instance.name,
      address: instance.address,
      proxy: instance.proxy,
      network: instance.network,
      range: instance.range,
      isOnNetwork: true // For dynamic templates, we include all instances
    }));

    return result;
  }

  private getAllEventsInOrder(project: GeneratedProject): Array<{contract: ProcessedContract, event: ProcessedEvent, eventIndex: number}> {
    const allEvents: Array<{contract: ProcessedContract, event: ProcessedEvent, eventIndex: number}> = [];

    for (const contract of project.contracts) {
      for (let eventIndex = 0; eventIndex < contract.events.length; eventIndex++) {
        allEvents.push({
          contract,
          event: contract.events[eventIndex],
          eventIndex
        });
      }
    }

    return allEvents;
  }

  private getPreviouslyProcessedFields(project: GeneratedProject, currentContract: ProcessedContract, currentEvent: ProcessedEvent): Array<{previouslyProcessedField: string, previouslyProcessedFieldType: string}> {
    const allEvents = this.getAllEventsInOrder(project);
    const currentEventIndex = allEvents.findIndex(ae => 
      ae.contract.name === currentContract.name && ae.event.name === currentEvent.name
    );
    
    if (currentEventIndex === 0) {
      // First event has no previously processed fields
      return [];
    }
    
    const previouslyProcessedFields: Array<{previouslyProcessedField: string, previouslyProcessedFieldType: string}> = [];
    
    // Add all events that come before the current one
    for (let i = 0; i < currentEventIndex; i++) {
      const prevEvent = allEvents[i];
      const fieldName = this.decapitalize(prevEvent.event.name) + 's'; // pluralize
      const fieldType = prevEvent.contract.name + prevEvent.event.name;
      previouslyProcessedFields.push({
        previouslyProcessedField: fieldName,
        previouslyProcessedFieldType: fieldType
      });
    }
    
    return previouslyProcessedFields;
  }

  private async cleanupExistingFiles(): Promise<void> {
    console.log('Cleaning up existing generated files...');

    // Files that should always be preserved
    const preserveFiles = new Set([
      'createSquid.yaml'
    ]);

    // Directories that should always be preserved
    const preserveDirs = new Set([
      'abi'
    ]);

    // Get all files and directories in the output directory
    const getAllItems = async (dir: string, baseDir: string = dir): Promise<{files: string[], dirs: string[]}> => {
      const items = await fs.readdir(dir);
      const files: string[] = [];
      const dirs: string[] = [];
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(baseDir, fullPath);
        
        if ((await fs.stat(fullPath)).isDirectory()) {
          dirs.push(relativePath);
          const subItems = await getAllItems(fullPath, baseDir);
          files.push(...subItems.files);
          dirs.push(...subItems.dirs);
        } else {
          files.push(relativePath);
        }
      }
      
      return { files, dirs };
    };

    try {
      const { files: allFiles, dirs: allDirs } = await getAllItems(this.options.outputDir);
      
      // Remove files that are not preserved and not in generated files list
      for (const file of allFiles) {
        const filePath = path.join(this.options.outputDir, file);
        const relativePath = file;
        
        // Skip if it's a preserved file
        if (preserveFiles.has(relativePath)) {
          continue;
        }
        
        // Skip if it's in a preserved directory
        const isInPreservedDir = Array.from(preserveDirs).some(preservedDir => 
          relativePath.startsWith(preservedDir + path.sep)
        );
        if (isInPreservedDir) {
          continue;
        }
        
        // Skip if it will be generated
        if (this.generatedFiles.has(relativePath)) {
          continue;
        }
        
        // Remove the file
        if (await fs.pathExists(filePath)) {
          await fs.remove(filePath);
        }
      }
      
      // Remove empty directories that are not preserved
      for (const dir of allDirs) {
        const dirPath = path.join(this.options.outputDir, dir);
        
        // Skip if it's a preserved directory
        if (preserveDirs.has(dir)) {
          continue;
        }
        
        // Skip if this directory is generated or contains generated files
        const hasGeneratedFiles = Array.from(this.generatedFiles).some(generatedFile => 
          generatedFile.startsWith(dir + path.sep) || generatedFile === dir
        );
        if (hasGeneratedFiles) {
          continue;
        }
        
        // Remove the directory if it's empty
        if (await fs.pathExists(dirPath)) {
          try {
            const contents = await fs.readdir(dirPath);
            if (contents.length === 0) {
              await fs.remove(dirPath);
            }
          } catch (error) {
            // Directory might have been removed already or have permission issues
          }
        }
      }
    } catch (error) {
      console.warn('Warning: Could not scan directory for cleanup:', error);
    }
  }

  private async runCodeGeneration(): Promise<void> {
    console.log('Running code generation...');

    const srcDir = path.join(this.options.outputDir, 'src');
    const abiDir = path.join(this.options.outputDir, 'abi');

    // Remove existing generated directories
    const srcAbiDir = path.join(srcDir, 'abi');
    const modelDir = path.join(srcDir, 'model');
    
    if (await fs.pathExists(srcAbiDir)) {
      await fs.remove(srcAbiDir);
    }
    if (await fs.pathExists(modelDir)) {
      await fs.remove(modelDir);
    }

    // Generate ABI types
    const abiFiles = await glob('*.json', { cwd: abiDir });
    const abiGlob = abiFiles.map(file => `./abi/${file}`).join(' ');
    
    try {
      execSync(`npx @subsquid/evm-typegen ./src/abi ${abiGlob} --multicall`, {
        cwd: this.options.outputDir,
        stdio: 'inherit'
      });
      
      // Track the entire abi directory as generated
      this.generatedFiles.add('src/abi');
    } catch (error) {
      console.warn('Warning: Failed to run squid-evm-typegen:', error);
    }

    // Generate TypeORM models
    try {
      execSync('npx @subsquid/typeorm-codegen', {
        cwd: this.options.outputDir,
        stdio: 'inherit'
      });
      
      // Track the entire model directory as generated
      this.generatedFiles.add('src/model');
    } catch (error) {
      console.warn('Warning: Failed to run squid-typeorm-codegen:', error);
    }
  }

  private async installDependencies(): Promise<void> {
    console.log('Installing dependencies (may take a while)...');
    
    try {
      execSync('npm install --progress=false', {
        cwd: this.options.outputDir,
        stdio: 'inherit'
      });
      
      // Track files that might be generated by npm install
      const packageLockPath = path.join(this.options.outputDir, 'package-lock.json');
      if (await fs.pathExists(packageLockPath)) {
        this.generatedFiles.add('package-lock.json');
      }
      
      // Track node_modules directory
      const nodeModulesPath = path.join(this.options.outputDir, 'node_modules');
      if (await fs.pathExists(nodeModulesPath)) {
        this.generatedFiles.add('node_modules');
      }
    } catch (error) {
      console.warn('Warning: Failed to install dependencies:', error);
    }
  }
}
