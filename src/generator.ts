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
  GeneratorOptions
} from './types';
import { parseAbiFile, findEventByName, generateEventSignature, mapSolidityTypeToGraphQL } from './abi-parser';
import { NETWORK_CONFIGS } from './network-configs';

export class SquidGenerator {
  private config: CreateSquidConfig;
  private configPath: string;
  private options: GeneratorOptions;
  private templatesDir: string;

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
    console.log('🚀 Starting squid project generation...');

    // Ensure output directory exists (should already exist with createSquid.yaml and ./abi)
    if (!await fs.pathExists(this.options.outputDir)) {
      throw new Error(`Output directory does not exist: ${this.options.outputDir}`);
    }

    // Clean up existing generated files
    await this.cleanupExistingFiles();

    // Process the configuration
    const project = await this.processConfig();

    // Generate files from templates
    await this.generateFromTemplates(project);

    // ABI files are already in the target directory, no need to copy

    // Run external code generation tools
    if (!this.options.skipCodegen) {
      await this.runCodeGeneration();
    }

    // Install dependencies
    if (!this.options.skipInstall) {
      await this.installDependencies();
    }

    console.log('✅ Squid project generated successfully!');
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
        const eventName = this.extractEventName(eventSignature);
        const abiEvent = findEventByName(abi, eventName);
        
        if (!abiEvent) {
          throw new Error(`Event ${eventName} not found in ABI ${contract.abi}`);
        }

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
      name: this.options.projectName,
      description: this.options.projectDescription,
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

  private async generateFromTemplates(project: GeneratedProject): Promise<void> {
    const templateFiles = await glob('**/*.mustache', { cwd: this.templatesDir });

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
    const templateData = this.prepareTemplateData(project);
    
    // Generate templates for each contract and event
    for (const contract of project.contracts) {
      for (const event of contract.events) {
        const contractNameLower = contract.name.toLowerCase();
        const eventNameLower = event.name.toLowerCase();
        
        // Replace placeholders in filename
        let outputFileName = templateFile
          .replace('{{contractNameLower}}', contractNameLower)
          .replace('{{eventNameLower}}', eventNameLower)
          .replace('.mustache', '');
        
        const outputPath = path.join(this.options.outputDir, outputFileName);
        
        // Prepare specific template data for this contract/event
        const specificTemplateData = {
          ...templateData,
          contractName: contract.name,
          contractNameLower,
          eventName: event.name,
          eventNameLower,
          eventFields: event.abiEvent.inputs.map((input: any) => ({
            fieldName: input.name,
            fieldType: mapSolidityTypeToGraphQL(input.type)
          }))
        };
        
        await this.renderTemplateWithData(templatePath, outputPath, specificTemplateData);
      }
    }
  }

  private async renderTemplate(templatePath: string, outputPath: string, project: GeneratedProject): Promise<void> {
    const template = await fs.readFile(templatePath, 'utf8');
    
    // Prepare template data
    const templateData = this.prepareTemplateData(project);
    
    await this.renderTemplateWithData(templatePath, outputPath, templateData);
  }

  private async renderTemplateWithData(templatePath: string, outputPath: string, templateData: any): Promise<void> {
    const template = await fs.readFile(templatePath, 'utf8');
    
    const rendered = mustache.render(template, templateData);
    
    // Ensure output directory exists
    await fs.ensureDir(path.dirname(outputPath));
    
    await fs.writeFile(outputPath, rendered);
  }

  private prepareTemplateData(project: GeneratedProject): any {
    const networks = project.networks.map(networkName => {
      const networkConfig = NETWORK_CONFIGS[networkName];
      if (!networkConfig) {
        throw new Error(`Unknown network: ${networkName}`);
      }
      
      const contracts = project.contracts.map(contract => {
        const contractNameLower = contract.name.toLowerCase();
        
        const events = contract.events.map(event => {
          const eventNameLower = event.name.toLowerCase();
          
          const eventFields = event.abiEvent.inputs.map((input: any) => ({
            fieldName: input.name,
            fieldType: mapSolidityTypeToGraphQL(input.type)
          }));

          return {
            name: event.name,
            eventNameLower,
            contractNameLower,
            eventFields
          };
        });

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
          name: contract.name,
          contractNameLower,
          events,
          instances,
          hasInstancesOnNetwork
        };
      });

      return {
        ...networkConfig,
        name: networkName,
        contracts
      };
    });

    // For schema.graphql and other templates that need all contracts
    const allContracts = project.contracts.map(contract => {
      const contractNameLower = contract.name.toLowerCase();
      
      const events = contract.events.map(event => {
        const eventNameLower = event.name.toLowerCase();
        
        const eventFields = event.abiEvent.inputs.map((input: any) => ({
          fieldName: input.name,
          fieldType: mapSolidityTypeToGraphQL(input.type)
        }));

        return {
          name: event.name,
          eventNameLower,
          contractNameLower,
          contractName: contract.name,
          eventFields
        };
      });

      return {
        name: contract.name,
        contractNameLower,
        events
      };
    });

    // Add last flags for mustache templates
    const networksWithLast = networks.map((network, index) => ({
      ...network,
      last: index === networks.length - 1
    }));

    const contractsWithLast = allContracts.map((contract, index) => ({
      ...contract,
      last: index === allContracts.length - 1
    }));

    return {
      projectName: project.name,
      projectDescription: project.description,
      networks: networksWithLast,
      contracts: contractsWithLast
    };
  }

  private async cleanupExistingFiles(): Promise<void> {
    console.log('🧹 Cleaning up existing generated files...');

    // Files and directories that should be removed/cleaned
    const filesToRemove = [
      'package.json',
      'tsconfig.json',
      'jest.config.js',
      'schema.graphql',
      'squid.yaml'
    ];

    const dirsToClean = [
      'src',
      'lib',
      'db/migrations'
    ];

    // Remove individual files
    for (const file of filesToRemove) {
      const filePath = path.join(this.options.outputDir, file);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }
    }

    // Clean directories (but preserve abi directory and its contents)
    for (const dir of dirsToClean) {
      const dirPath = path.join(this.options.outputDir, dir);
      if (await fs.pathExists(dirPath)) {
        await fs.remove(dirPath);
      }
    }

    // Remove generated files that might exist in src/abi (from squid-evm-typegen)
    const srcAbiDir = path.join(this.options.outputDir, 'src', 'abi');
    if (await fs.pathExists(srcAbiDir)) {
      await fs.remove(srcAbiDir);
    }

    // Remove generated model files (from squid-typeorm-codegen)
    const modelDir = path.join(this.options.outputDir, 'src', 'model');
    if (await fs.pathExists(modelDir)) {
      await fs.remove(modelDir);
    }
  }

  private async runCodeGeneration(): Promise<void> {
    console.log('🔧 Running code generation...');

    const srcDir = path.join(this.options.outputDir, 'src');
    const abiDir = path.join(this.options.outputDir, 'abi');

    // Generate ABI types
    const abiFiles = await glob('*.json', { cwd: abiDir });
    const abiGlob = abiFiles.map(file => `./abi/${file}`).join(' ');
    
    try {
      execSync(`npx squid-evm-typegen ./src/abi ${abiGlob} --multicall`, {
        cwd: this.options.outputDir,
        stdio: 'inherit'
      });
    } catch (error) {
      console.warn('⚠️  Warning: Failed to run squid-evm-typegen:', error);
    }

    // Generate TypeORM models
    try {
      execSync('npx squid-typeorm-codegen', {
        cwd: this.options.outputDir,
        stdio: 'inherit'
      });
    } catch (error) {
      console.warn('⚠️  Warning: Failed to run squid-typeorm-codegen:', error);
    }
  }

  private async installDependencies(): Promise<void> {
    console.log('📦 Installing dependencies...');
    
    try {
      execSync('npm install', {
        cwd: this.options.outputDir,
        stdio: 'inherit'
      });
    } catch (error) {
      console.warn('⚠️  Warning: Failed to install dependencies:', error);
    }
  }
}
