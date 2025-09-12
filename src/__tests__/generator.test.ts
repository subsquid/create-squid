import { SquidGenerator } from '../generator';
import { GeneratorOptions } from '../types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';

describe('SquidGenerator', () => {
  const testOutputDir = path.join(__dirname, '..', '..', 'test-output');
  const testConfigPath = path.join(testOutputDir, 'createSquid.yaml');

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

    // Create test directory structure
    await fs.ensureDir(testOutputDir);
    await fs.ensureDir(path.join(testOutputDir, 'abi'));

    // Copy test config file
    const sourceConfigPath = path.join(__dirname, '..', '..', 'tests', 'event-tables', 'createSquid.yaml');
    await fs.copy(sourceConfigPath, testConfigPath);

    // Copy test ABI files
    const sourceAbiDir = path.join(__dirname, '..', '..', 'tests', 'event-tables', 'abi');
    const targetAbiDir = path.join(testOutputDir, 'abi');
    await fs.copy(sourceAbiDir, targetAbiDir);
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

      // Check that ABI files are present (they should already be there from setup)
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

    it('should clean up existing generated files before generating new ones', async () => {
      // First generate files
      const generator = new SquidGenerator(testConfigPath, options);
      await generator.generate();

      // Verify files exist
      expect(await fs.pathExists(path.join(testOutputDir, 'package.json'))).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'src', 'main.ts'))).toBe(true);

      // Modify a file to simulate existing generated content
      await fs.writeFile(path.join(testOutputDir, 'package.json'), '{"name": "old-project"}');

      // Generate again
      await generator.generate();

      // Verify the file was regenerated (not the old content)
      const packageJson = await fs.readJson(path.join(testOutputDir, 'package.json'));
      expect(packageJson.name).toBe('test-squid');
    });

    it('should preserve createSquid.yaml and abi directory during cleanup', async () => {
      const generator = new SquidGenerator(testConfigPath, options);
      await generator.generate();

      // Verify that createSquid.yaml and abi directory are preserved
      expect(await fs.pathExists(testConfigPath)).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'abi'))).toBe(true);
      expect(await fs.pathExists(path.join(testOutputDir, 'abi', 'erc20.json'))).toBe(true);
    });
  });
});
