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
  .version('0.0.0')
  .option('--skip-install', 'Skip npm install', false)
  .option('--skip-codegen', 'Skip code generation', false)
  .action(async (options: any) => {
    try {
      const cwd = process.cwd();

      // Validate createSquid.yaml exists in CWD
      const configPath = path.join(cwd, 'createSquid.yaml');
      if (!await fs.pathExists(configPath)) {
        console.error(chalk.red(`createSquid.yaml not found in current directory: ${cwd}`));
        process.exit(1);
      }

      // Load config to get name and description
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = yaml.load(configContent) as CreateSquidConfig;

      // Validate all ABI files mentioned in config exist
      if (config.contracts) {
        for (const contract of config.contracts) {
          const abiPath = path.resolve(cwd, contract.abi);
          if (!await fs.pathExists(abiPath)) {
            console.error(chalk.red(`ABI file not found: ${contract.abi} (resolved to: ${abiPath})`));
            process.exit(1);
          }
        }
      }

      const generatorOptions: GeneratorOptions = {
        outputDir: cwd,
        projectName: config.name,
        projectDescription: config.description,
        skipInstall: options.skipInstall,
        skipCodegen: options.skipCodegen
      };

      console.log(chalk.blue('Generating squid project...'));
      console.log(chalk.gray(`Directory: ${cwd}`));
      console.log(chalk.gray(`Config: ${configPath}`));
      console.log(chalk.gray(`Name: ${generatorOptions.projectName}`));
      console.log(chalk.gray(`Description: ${generatorOptions.projectDescription}`));

      const generator = new SquidGenerator(configPath, generatorOptions);
      await generator.generate();

      console.log(chalk.green('Project generated successfully!'));
      console.log(chalk.blue('\nNext steps:'));
      console.log(chalk.gray('  npm run build'));
      console.log(chalk.gray('  npm test'));

    } catch (error) {
      console.error(chalk.red('Error generating project:'), error);
      process.exit(1);
    }
  });

program.parse();
