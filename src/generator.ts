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
import {
  parseAbiFile,
  findEventByName,
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
      // Run external code generation tools
      if (!this.options.skipCodegen) {
        await this.runCodeGeneration();
      }
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
        const contractNameLower = this.decapitalize(contract.name);
        const eventNameLower = this.decapitalize(event.name);
        
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
    
    // Track this file as generated
    const relativePath = path.relative(this.options.outputDir, outputPath);
    this.generatedFiles.add(relativePath);
  }

  private prepareTemplateData(project: GeneratedProject): any {
    const networks = project.networks.map(networkName => {
      const networkConfig = NETWORK_CONFIGS[networkName];
      if (!networkConfig) {
        throw new Error(`Unknown network: ${networkName}`);
      }
      
      const contracts = project.contracts.map(contract => {
        const contractNameLower = this.decapitalize(contract.name);
        
        const events = contract.events.map(event => {
          const eventNameLower = this.decapitalize(event.name);
          
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
      const contractNameLower = this.decapitalize(contract.name);
      
      const events = contract.events.map(event => {
        const eventNameLower = this.decapitalize(event.name);
        
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
    console.log('Installing dependencies...');
    
    try {
      execSync('npm install', {
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
