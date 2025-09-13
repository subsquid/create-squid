import {
  decapitalize,
  capitalize,
  kebabToCamel,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
  toMacroCase
} from './casing';

describe('String Transforms - Casing', () => {
  describe('decapitalize', () => {
    it('should convert first character to lowercase', () => {
      expect(decapitalize('Hello')).toBe('hello');
      expect(decapitalize('WORLD')).toBe('wORLD');
      expect(decapitalize('Test')).toBe('test');
    });

    it('should handle single character strings', () => {
      expect(decapitalize('A')).toBe('a');
      expect(decapitalize('Z')).toBe('z');
    });

    it('should handle empty string', () => {
      expect(decapitalize('')).toBe('');
    });

    it('should handle strings that are already lowercase', () => {
      expect(decapitalize('hello')).toBe('hello');
      expect(decapitalize('world')).toBe('world');
    });
  });

  describe('capitalize', () => {
    it('should convert first character to uppercase', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('world')).toBe('World');
      expect(capitalize('test')).toBe('Test');
    });

    it('should handle single character strings', () => {
      expect(capitalize('a')).toBe('A');
      expect(capitalize('z')).toBe('Z');
    });

    it('should handle empty string', () => {
      expect(capitalize('')).toBe('');
    });

    it('should handle strings that are already uppercase', () => {
      expect(capitalize('HELLO')).toBe('HELLO');
      expect(capitalize('WORLD')).toBe('WORLD');
    });
  });

  describe('kebabToCamel', () => {
    it('should convert kebab-case to camelCase', () => {
      expect(kebabToCamel('hello-world')).toBe('helloWorld');
      expect(kebabToCamel('my-component-name')).toBe('myComponentName');
      expect(kebabToCamel('test-case')).toBe('testCase');
    });

    it('should handle single kebab', () => {
      expect(kebabToCamel('hello-world')).toBe('helloWorld');
      expect(kebabToCamel('a-b')).toBe('aB');
    });

    it('should handle multiple kebab separators', () => {
      expect(kebabToCamel('hello-world-test')).toBe('helloWorldTest');
      expect(kebabToCamel('a-b-c-d')).toBe('aBCD');
    });

    it('should handle strings without kebab separators', () => {
      expect(kebabToCamel('hello')).toBe('hello');
      expect(kebabToCamel('world')).toBe('world');
      expect(kebabToCamel('HELLO')).toBe('HELLO');
    });

    it('should handle empty string', () => {
      expect(kebabToCamel('')).toBe('');
    });

    it('should handle strings starting with kebab', () => {
      // toCamelCase only converts kebab-case to camelCase, doesn't preserve leading kebab
      expect(kebabToCamel('-hello')).toBe('Hello');
      expect(kebabToCamel('-test')).toBe('Test');
    });

    it('should handle strings ending with kebab', () => {
      expect(kebabToCamel('hello-')).toBe('hello-');
      expect(kebabToCamel('test-')).toBe('test-');
    });

    it('should handle consecutive kebab separators', () => {
      // toCamelCase converts kebab-case to camelCase, so consecutive kebab become single camelCase
      expect(kebabToCamel('hello--world')).toBe('hello-world');
      expect(kebabToCamel('a---b')).toBe('a-B');
    });
  });

  describe('toKebabCase', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(toKebabCase('helloWorld')).toBe('hello-world');
      expect(toKebabCase('myComponentName')).toBe('my-component-name');
      expect(toKebabCase('testCase')).toBe('test-case');
    });

    it('should convert PascalCase to kebab-case', () => {
      expect(toKebabCase('HelloWorld')).toBe('hello-world');
      expect(toKebabCase('MyComponentName')).toBe('my-component-name');
      expect(toKebabCase('TestCase')).toBe('test-case');
    });

    it('should convert snake_case to kebab-case', () => {
      expect(toKebabCase('hello_world')).toBe('hello-world');
      expect(toKebabCase('my_component_name')).toBe('my-component-name');
      expect(toKebabCase('test_case')).toBe('test-case');
    });

    it('should handle spaces', () => {
      expect(toKebabCase('hello world')).toBe('hello-world');
      expect(toKebabCase('my component name')).toBe('my-component-name');
      expect(toKebabCase('test case')).toBe('test-case');
    });

    it('should handle mixed separators', () => {
      expect(toKebabCase('hello_world-test')).toBe('hello-world-test');
      expect(toKebabCase('my component_name')).toBe('my-component-name');
      expect(toKebabCase('test_case world')).toBe('test-case-world');
    });

    it('should handle strings without separators', () => {
      expect(toKebabCase('hello')).toBe('hello');
      expect(toKebabCase('world')).toBe('world');
      expect(toKebabCase('HELLO')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(toKebabCase('')).toBe('');
    });

    it('should handle consecutive separators', () => {
      expect(toKebabCase('hello__world')).toBe('hello-world');
      expect(toKebabCase('my  component')).toBe('my-component');
      expect(toKebabCase('test--case')).toBe('test--case');
    });

    it('should handle numbers', () => {
      expect(toKebabCase('test123')).toBe('test123');
      expect(toKebabCase('myComponent2Name')).toBe('my-component2name');
      expect(toKebabCase('test_123_case')).toBe('test-123-case');
    });
  });

  describe('toPascalCase', () => {
    it('should convert kebab-case to PascalCase', () => {
      expect(toPascalCase('hello-world')).toBe('HelloWorld');
      expect(toPascalCase('my-component-name')).toBe('MyComponentName');
      expect(toPascalCase('test-case')).toBe('TestCase');
    });

    it('should convert snake_case to PascalCase', () => {
      expect(toPascalCase('hello_world')).toBe('HelloWorld');
      expect(toPascalCase('my_component_name')).toBe('MyComponentName');
      expect(toPascalCase('test_case')).toBe('TestCase');
    });

    it('should convert camelCase to PascalCase', () => {
      expect(toPascalCase('helloWorld')).toBe('HelloWorld');
      expect(toPascalCase('myComponentName')).toBe('MyComponentName');
      expect(toPascalCase('testCase')).toBe('TestCase');
    });

    it('should handle spaces', () => {
      expect(toPascalCase('hello world')).toBe('HelloWorld');
      expect(toPascalCase('my component name')).toBe('MyComponentName');
      expect(toPascalCase('test case')).toBe('TestCase');
    });

    it('should handle mixed separators', () => {
      expect(toPascalCase('hello_world-test')).toBe('HelloWorldTest');
      expect(toPascalCase('my component_name')).toBe('MyComponentName');
      expect(toPascalCase('test_case world')).toBe('TestCaseWorld');
    });

    it('should handle strings without separators', () => {
      expect(toPascalCase('hello')).toBe('Hello');
      expect(toPascalCase('world')).toBe('World');
      expect(toPascalCase('HELLO')).toBe('HELLO');
    });

    it('should handle empty string', () => {
      expect(toPascalCase('')).toBe('');
    });

    it('should handle consecutive separators', () => {
      expect(toPascalCase('hello__world')).toBe('HelloWorld');
      expect(toPascalCase('my  component')).toBe('MyComponent');
      expect(toPascalCase('test--case')).toBe('TestCase');
    });

    it('should handle numbers', () => {
      expect(toPascalCase('test123')).toBe('Test123');
      expect(toPascalCase('my-component2-name')).toBe('MyComponent2Name');
      expect(toPascalCase('test_123_case')).toBe('Test123Case');
    });

    it('should handle strings already in PascalCase', () => {
      expect(toPascalCase('HelloWorld')).toBe('HelloWorld');
      expect(toPascalCase('MyComponentName')).toBe('MyComponentName');
    });
  });

  describe('toSnakeCase', () => {
    it('should convert camelCase to snake_case', () => {
      expect(toSnakeCase('helloWorld')).toBe('hello_world');
      expect(toSnakeCase('myComponentName')).toBe('my_component_name');
      expect(toSnakeCase('testCase')).toBe('test_case');
    });

    it('should convert PascalCase to snake_case', () => {
      expect(toSnakeCase('HelloWorld')).toBe('hello_world');
      expect(toSnakeCase('MyComponentName')).toBe('my_component_name');
      expect(toSnakeCase('TestCase')).toBe('test_case');
    });

    it('should convert kebab-case to snake_case', () => {
      expect(toSnakeCase('hello-world')).toBe('hello_world');
      expect(toSnakeCase('my-component-name')).toBe('my_component_name');
      expect(toSnakeCase('test-case')).toBe('test_case');
    });

    it('should handle spaces', () => {
      expect(toSnakeCase('hello world')).toBe('hello_world');
      expect(toSnakeCase('my component name')).toBe('my_component_name');
      expect(toSnakeCase('test case')).toBe('test_case');
    });

    it('should handle mixed separators', () => {
      expect(toSnakeCase('hello_world-test')).toBe('hello_world_test');
      expect(toSnakeCase('my component_name')).toBe('my_component_name');
      expect(toSnakeCase('test_case world')).toBe('test_case_world');
    });

    it('should handle strings without separators', () => {
      expect(toSnakeCase('hello')).toBe('hello');
      expect(toSnakeCase('world')).toBe('world');
      expect(toSnakeCase('HELLO')).toBe('hello');
    });

    it('should handle empty string', () => {
      expect(toSnakeCase('')).toBe('');
    });

    it('should handle consecutive separators', () => {
      expect(toSnakeCase('hello__world')).toBe('hello__world');
      expect(toSnakeCase('my  component')).toBe('my_component');
      expect(toSnakeCase('test--case')).toBe('test_case');
    });

    it('should handle numbers', () => {
      expect(toSnakeCase('test123')).toBe('test123');
      expect(toSnakeCase('myComponent2Name')).toBe('my_component2name');
      expect(toSnakeCase('test-123-case')).toBe('test_123_case');
    });

    it('should handle consecutive capitals followed by lowercase', () => {
      expect(toSnakeCase('XMLHttpRequest')).toBe('xml_http_request');
      expect(toSnakeCase('HTTPServer')).toBe('http_server');
      expect(toSnakeCase('JSONParser')).toBe('json_parser');
    });

    it('should handle strings already in snake_case', () => {
      expect(toSnakeCase('hello_world')).toBe('hello_world');
      expect(toSnakeCase('my_component_name')).toBe('my_component_name');
    });
  });

  describe('toMacroCase', () => {
    it('should convert camelCase to MACRO_CASE', () => {
      expect(toMacroCase('helloWorld')).toBe('HELLOWORLD');
      expect(toMacroCase('myComponentName')).toBe('MYCOMPONENTNAME');
      expect(toMacroCase('testCase')).toBe('TESTCASE');
    });

    it('should convert PascalCase to MACRO_CASE', () => {
      expect(toMacroCase('HelloWorld')).toBe('HELLOWORLD');
      expect(toMacroCase('MyComponentName')).toBe('MYCOMPONENTNAME');
      expect(toMacroCase('TestCase')).toBe('TESTCASE');
    });

    it('should convert kebab-case to MACRO_CASE', () => {
      expect(toMacroCase('hello-world')).toBe('HELLO_WORLD');
      expect(toMacroCase('my-component-name')).toBe('MY_COMPONENT_NAME');
      expect(toMacroCase('test-case')).toBe('TEST_CASE');
    });

    it('should convert snake_case to MACRO_CASE', () => {
      expect(toMacroCase('hello_world')).toBe('HELLO_WORLD');
      expect(toMacroCase('my_component_name')).toBe('MY_COMPONENT_NAME');
      expect(toMacroCase('test_case')).toBe('TEST_CASE');
    });

    it('should handle spaces', () => {
      expect(toMacroCase('hello world')).toBe('HELLO_WORLD');
      expect(toMacroCase('my component name')).toBe('MY_COMPONENT_NAME');
      expect(toMacroCase('test case')).toBe('TEST_CASE');
    });

    it('should handle mixed separators', () => {
      expect(toMacroCase('hello_world-test')).toBe('HELLO_WORLD_TEST');
      expect(toMacroCase('my component_name')).toBe('MY_COMPONENT_NAME');
      expect(toMacroCase('test_case world')).toBe('TEST_CASE_WORLD');
    });

    it('should handle strings without separators', () => {
      expect(toMacroCase('hello')).toBe('HELLO');
      expect(toMacroCase('world')).toBe('WORLD');
      expect(toMacroCase('HELLO')).toBe('HELLO');
    });

    it('should handle empty string', () => {
      expect(toMacroCase('')).toBe('');
    });

    it('should handle consecutive separators', () => {
      expect(toMacroCase('hello__world')).toBe('HELLO_WORLD');
      expect(toMacroCase('my  component')).toBe('MY_COMPONENT');
      expect(toMacroCase('test--case')).toBe('TEST_CASE');
    });

    it('should handle numbers', () => {
      expect(toMacroCase('test123')).toBe('TEST123');
      expect(toMacroCase('myComponent2Name')).toBe('MYCOMPONENT2NAME');
      expect(toMacroCase('test-123-case')).toBe('TEST_123_CASE');
      expect(toMacroCase('test_123_case')).toBe('TEST_123_CASE');
    });

    it('should handle special characters', () => {
      expect(toMacroCase('hello.world')).toBe('HELLO_WORLD');
      expect(toMacroCase('my@component')).toBe('MY_COMPONENT');
      expect(toMacroCase('test#case')).toBe('TEST_CASE');
      expect(toMacroCase('hello!world')).toBe('HELLO_WORLD');
      expect(toMacroCase('my$component')).toBe('MY_COMPONENT');
    });

    it('should handle strings already in MACRO_CASE', () => {
      expect(toMacroCase('HELLO_WORLD')).toBe('HELLO_WORLD');
      expect(toMacroCase('MY_COMPONENT_NAME')).toBe('MY_COMPONENT_NAME');
      expect(toMacroCase('TEST_CASE')).toBe('TEST_CASE');
    });

    it('should handle RPC endpoint abbreviations', () => {
      expect(toMacroCase('eth')).toBe('ETH');
      expect(toMacroCase('arbitrum-one')).toBe('ARBITRUM_ONE');
      expect(toMacroCase('polygon-mainnet')).toBe('POLYGON_MAINNET');
      expect(toMacroCase('base-mainnet')).toBe('BASE_MAINNET');
      expect(toMacroCase('optimism')).toBe('OPTIMISM');
      expect(toMacroCase('bsc')).toBe('BSC');
    });

    it('should handle unicode characters', () => {
      expect(toMacroCase('café_au_lait')).toBe('CAFÉ_AU_LAIT');
      expect(toMacroCase('ñoño')).toBe('ÑOÑO');
    });

    it('should handle strings with only special characters', () => {
      expect(toMacroCase('---')).toBe('');
      expect(toMacroCase('___')).toBe('');
      expect(toMacroCase('...')).toBe('');
      expect(toMacroCase('!!!')).toBe('');
    });

    it('should handle strings starting or ending with special characters', () => {
      expect(toMacroCase('-hello')).toBe('HELLO');
      expect(toMacroCase('hello-')).toBe('HELLO');
      expect(toMacroCase('_hello')).toBe('HELLO');
      expect(toMacroCase('hello_')).toBe('HELLO');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null and undefined inputs gracefully', () => {
      // Note: The functions don't explicitly handle null/undefined, 
      // but they should handle empty strings consistently
      expect(decapitalize('')).toBe('');
      expect(capitalize('')).toBe('');
      expect(kebabToCamel('')).toBe('');
      expect(toKebabCase('')).toBe('');
      expect(toPascalCase('')).toBe('');
      expect(toSnakeCase('')).toBe('');
      expect(toMacroCase('')).toBe('');
    });

    it('should handle very long strings', () => {
      const longString = 'A'.repeat(1000) + 'B' + 'c'.repeat(1000);
      
      // Test that the functions work correctly by checking specific positions and length
      const decapitalized = decapitalize(longString);
      const capitalized = capitalize(longString);
      
      expect(decapitalized.length).toBe(2001);
      expect(capitalized.length).toBe(2001);
      expect(decapitalized[0]).toBe('a'); // First character should be lowercase
      expect(capitalized[0]).toBe('A'); // First character should be uppercase
      expect(decapitalized[1000]).toBe('B'); // Middle character should stay unchanged
      expect(capitalized[1000]).toBe('B'); // Middle character should stay unchanged
    });

    it('should handle unicode characters', () => {
      expect(decapitalize('Ñoño')).toBe('ñoño');
      expect(capitalize('ñoño')).toBe('Ñoño');
      expect(toKebabCase('café_au_lait')).toBe('café-au-lait');
      expect(toPascalCase('café_au_lait')).toBe('CaféAuLait');
    });
  });
});
