import { SquidGenerator } from '../generator';
import { GeneratorOptions } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';

describe('SquidGenerator', () => {
  const testConfigPath = path.join(__dirname, '..', '..', 'tests', 'event-tables', 'createSquid.yaml');
  const testOutputDir = path.join(__dirname, '..', '..', 'test-output');

  const options: GeneratorOptions = {
    outputDir: testOutputDir,
    projectName: 'test-squid',
    projectDescription: 'Test squid project',
    skipInstall: true,
    skipCodegen: true
  };

  beforeAll(async () => {
    // Clean up test output directory
    if (await fs.pathExists(testOutputDir)) {
      await fs.remove(testOutputDir);
    }
  });

  afterAll(async () => {
    // Clean up test output directory
    if (await fs.pathExists(testOutputDir)) {
      await fs.remove(testOutputDir);
    }
  });

  describe('constructor', () => {
    it('should create generator with valid config', () => {
      expect(() => new SquidGenerator(testConfigPath, options)).not.toThrow();
    });

    it('should throw error for invalid config path', () => {
      expect(() => new SquidGenerator('nonexistent.yaml', options)).toThrow();
    });
  });

  describe('generate', () => {
    it('should generate project files', async () => {
      const generator = new SquidGenerator(testConfigPath, options);
      
      await generator.generate();

      // Check that output directory was created
      expect(await fs.pathExists(testOutputDir)).toBe(true);

      // Check that key files were generated
      expect(await fs.pathExists(path.join(testOutputDir, 'package.json'))).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'tsconfig.json'))).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'squid.yaml'))).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'schema.graphql'))).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'src', 'main.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'src', 'processor.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'src', 'config.ts'))).toBe(true);

      // Check that ABI files were copied
      expect(await fs.pathExists(path.join(testOutputDir, 'abi', 'erc20.json'))).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'abi', 'aave-pool.json'))).toBe(true);
    });

    it('should generate correct package.json content', async () => {
      const generator = new SquidGenerator(testConfigPath, options);
      await generator.generate();

      const packageJsonPath = path.join(testOutputDir, 'package.json');
      const packageJson = await fs.readJson(packageJsonPath);

      expect(packageJson.name).toBe('test-squid');
      expect(packageJson.dependencies).toBeDefined();
      expect(packageJson.devDependencies).toBeDefined();
    });

    it('should generate correct squid.yaml content', async () => {
      const generator = new SquidGenerator(testConfigPath, options);
      await generator.generate();

      const squidYamlPath = path.join(testOutputDir, 'squid.yaml');
      const squidYaml = yaml.load(await fs.readFile(squidYamlPath, 'utf8')) as any;

      expect(squidYaml.name).toBe('test-squid');
      expect(squidYaml.description).toBe('Test squid project');
      expect(squidYaml.deploy.addons.rpc).toContain('ethereum-mainnet.http');
      expect(squidYaml.deploy.addons.rpc).toContain('arbitrum-one.http');
    });

    it('should generate batch handlers for each event', async () => {
      const generator = new SquidGenerator(testConfigPath, options);
      await generator.generate();

      // Check for Transfer handler
      expect(await fs.pathExists(path.join(testOutputDir, 'src', 'batchHandlers', 'tokens', 'transfer.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'src', 'batchHandlers', 'tokens', 'transfer.int.test.ts'))).toBe(true);

      // Check for LiquidationCall handler
      expect(await fs.pathExists(path.join(testOutputDir, 'src', 'batchHandlers', 'aavepool', 'liquidationcall.ts'))).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'src', 'batchHandlers', 'aavepool', 'liquidationcall.int.test.ts'))).toBe(true);
    });
  });
});
