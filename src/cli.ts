#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import chalk from 'chalk';
import { SquidGenerator } from './generator';
import { GeneratorOptions } from './types';

const program = new Command();

program
  .name('create-squid')
  .description('Generate blockchain indexer projects from configuration')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a new squid project')
  .argument('<config>', 'Path to createSquid.yaml configuration file')
  .argument('<output>', 'Output directory for the generated project')
  .option('-n, --name <name>', 'Project name', 'my-squid')
  .option('-d, --description <description>', 'Project description', 'A blockchain indexer project')
  .option('--skip-install', 'Skip npm install', false)
  .option('--skip-codegen', 'Skip code generation', false)
  .action(async (configPath: string, outputDir: string, options: any) => {
    try {
      // Validate config file exists
      if (!await fs.pathExists(configPath)) {
        console.error(chalk.red(`❌ Configuration file not found: ${configPath}`));
        process.exit(1);
      }

      // Validate output directory
      const resolvedOutputDir = path.resolve(outputDir);
      
      if (await fs.pathExists(resolvedOutputDir)) {
        const contents = await fs.readdir(resolvedOutputDir);
        if (contents.length > 0) {
          console.error(chalk.red(`❌ Output directory is not empty: ${resolvedOutputDir}`));
          process.exit(1);
        }
      }

      const generatorOptions: GeneratorOptions = {
        outputDir: resolvedOutputDir,
        projectName: options.name,
        projectDescription: options.description,
        skipInstall: options.skipInstall,
        skipCodegen: options.skipCodegen
      };

      console.log(chalk.blue('🚀 Creating squid project...'));
      console.log(chalk.gray(`Config: ${configPath}`));
      console.log(chalk.gray(`Output: ${resolvedOutputDir}`));
      console.log(chalk.gray(`Name: ${options.name}`));
      console.log(chalk.gray(`Description: ${options.description}`));

      const generator = new SquidGenerator(configPath, generatorOptions);
      await generator.generate();

      console.log(chalk.green('✅ Project generated successfully!'));
      console.log(chalk.blue('\nNext steps:'));
      console.log(chalk.gray(`  cd ${resolvedOutputDir}`));
      console.log(chalk.gray('  npm run build'));
      console.log(chalk.gray('  npm test'));

    } catch (error) {
      console.error(chalk.red('❌ Error generating project:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Create a sample createSquid.yaml configuration file')
  .argument('[output]', 'Output file path', 'createSquid.yaml')
  .action(async (outputPath: string) => {
    try {
      const sampleConfig = `style: batchHandlers
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
      console.log(chalk.green(`✅ Sample configuration created: ${outputPath}`));
      console.log(chalk.blue('\nEdit the configuration file and then run:'));
      console.log(chalk.gray(`  create-squid generate ${outputPath} ./my-squid`));

    } catch (error) {
      console.error(chalk.red('❌ Error creating sample config:'), error);
      process.exit(1);
    }
  });

program.parse();
