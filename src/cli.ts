#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import { SquidGenerator } from './generator';
import { GeneratorOptions, CreateSquidConfig } from './types';

const program = new Command();

program
  .name('create-squid')
  .description('Generate blockchain indexer projects from configuration')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a squid project in an existing directory')
  .argument('<output>', 'Directory containing createSquid.yaml and ./abi folder')
  .option('-n, --name <name>', 'Project name (overrides config)')
  .option('-d, --description <description>', 'Project description (overrides config)')
  .option('--skip-install', 'Skip npm install', false)
  .option('--skip-codegen', 'Skip code generation', false)
  .action(async (outputDir: string, options: any) => {
    try {
      const resolvedOutputDir = path.resolve(outputDir);
      
      // Validate output directory exists
      if (!await fs.pathExists(resolvedOutputDir)) {
        console.error(chalk.red(`Directory does not exist: ${resolvedOutputDir}`));
        process.exit(1);
      }

      // Validate createSquid.yaml exists in the directory
      const configPath = path.join(resolvedOutputDir, 'createSquid.yaml');
      if (!await fs.pathExists(configPath)) {
        console.error(chalk.red(`createSquid.yaml not found in: ${resolvedOutputDir}`));
        process.exit(1);
      }

      // Validate abi directory exists
      const abiDir = path.join(resolvedOutputDir, 'abi');
      if (!await fs.pathExists(abiDir)) {
        console.error(chalk.red(`./abi directory not found in: ${resolvedOutputDir}`));
        process.exit(1);
      }

      // Load config to get default name and description
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent) as CreateSquidConfig;

      const generatorOptions: GeneratorOptions = {
        outputDir: resolvedOutputDir,
        projectName: options.name || config.name,
        projectDescription: options.description || config.description,
        skipInstall: options.skipInstall,
        skipCodegen: options.skipCodegen
      };

      console.log(chalk.blue('Generating squid project...'));
      console.log(chalk.gray(`Directory: ${resolvedOutputDir}`));
      console.log(chalk.gray(`Config: ${configPath}`));
      console.log(chalk.gray(`Name: ${generatorOptions.projectName}`));
      console.log(chalk.gray(`Description: ${generatorOptions.projectDescription}`));

      const generator = new SquidGenerator(configPath, generatorOptions);
      await generator.generate();

      console.log(chalk.green('Project generated successfully!'));
      console.log(chalk.blue('\nNext steps:'));
      console.log(chalk.gray(`  cd ${resolvedOutputDir}`));
      console.log(chalk.gray('  npm run build'));
      console.log(chalk.gray('  npm test'));

    } catch (error) {
      console.error(chalk.red('Error generating project:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create a sample createSquid.yaml configuration file')
  .argument('[output]', 'Output file path', 'createSquid.yaml')
  .action(async (outputPath: string) => {
    try {
      const sampleConfig = `name: my-squid
description: A blockchain indexer project
style: batchHandlers
target:
  type: postgres
contracts:
  - name: Tokens
    abi: ./abi/erc20.json
    instances:
      - address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
        name: usdc
        network: ethereum-mainnet
        range:
          from: 6082465
    events:
      - "Transfer(address,address,uint256)"
  - name: AavePool
    abi: ./abi/aave-pool.json
    instances:
      - address: "0x02D84abD89Ee9DB409572f19B6e1596c301F3c81"
        proxy: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9"
        name: main
        network: ethereum-mainnet
        range:
          from: 11362579
    events:
      - "LiquidationCall(address,address,address,uint256,uint256,address,bool)"
`;

      await fs.writeFile(outputPath, sampleConfig);
      console.log(chalk.green(`Sample configuration created: ${outputPath}`));
      console.log(chalk.blue('\nEdit the configuration file, add ABI files to ./abi folder, and then run:'));
      console.log(chalk.gray(`  create-squid generate .`));

    } catch (error) {
      console.error(chalk.red('Error creating sample config:'), error);
      process.exit(1);
    }
  });

program.parse();
