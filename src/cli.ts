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
  .option('--skip-external-codegens', 'Skip external code generators such as those used for ABI helpers, ORM code etc', false)
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
        skipCodegen: options.skipExternalCodegens
      };

      console.log(chalk.blue('Generating squid project...'));
      console.log(chalk.gray(`Directory: ${cwd}`));
      console.log(chalk.gray(`Config: ${configPath}`));
      console.log(chalk.gray(`Name: ${generatorOptions.projectName}`));
      console.log(chalk.gray(`Description: ${generatorOptions.projectDescription}`));

      const generator = new SquidGenerator(configPath, generatorOptions);
      const remainingActions = await generator.generate();

      console.log(chalk.green('Squid generated successfully! Next steps:'));
      
      if (remainingActions.length > 0) {
        console.log(chalk.blue('\nComplete the skipped code generation steps:'));
        for (let step of remainingActions) {
          console.log(chalk.gray(`  ${step}`))
        }
      }
      
      console.log(chalk.blue('\nBuild the project'));
      console.log(chalk.gray('  npm run build'));
      
      console.log(chalk.blue('\nPrepare the database'));
      console.log(chalk.gray('  docker compose up -d'));
      console.log(chalk.gray('  npx squid-typeorm-migration generate'));
      console.log(chalk.gray('  npx squid-typeorm-migration apply'));
      
      console.log(chalk.blue('\nRun tests'));
      console.log(chalk.gray('  npm test'));

      console.log(chalk.blue('\nStart the indexer'));
      console.log(chalk.gray('  npm i -g @subsquid/cli'));
      console.log(chalk.gray('  sqd run .'))
      console.log(chalk.blue('Note: you _can_ run the indexer without installing @subsquid/cli, but you\'ll need to run one command per network + one for the GraphQL server, all in separate terminals. See "sqd process*" and "sqd serve" commands definitions at commands.json'))
    } catch (error) {
      console.error(chalk.red('Error generating project:'), error);
      process.exit(1);
    }
  });

program.parse();
