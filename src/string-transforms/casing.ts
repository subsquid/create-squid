/**
 * String manipulation utilities for case conversion and formatting
 */

/**
 * Converts the first character of a string to lowercase
 */
export function decapitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toLowerCase() + str.slice(1);
}

/**
 * Converts the first character of a string to uppercase
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function kebabToCamel(str: string): string {
  if (!str) return str;
  return str.replace(/-(.)/g, (match, letter) => letter.toUpperCase());
}

/**
 * Converts a camelCased, space separated, or snake_case string to kebab-case
 */
export function toKebabCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a camelCased, space separated, or snake_case string to PascalCase
 */
export function toPascalCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/(?:^|[-_\s]+)(\w)/g, (_, char) => char.toUpperCase())
    .replace(/[-_\s]+/g, '');
}

/**
 * Converts a camelCased, space separated, or snake_case string to snake_case
 */
export function toSnakeCase(str: string): string {
  if (!str) return str;
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')  // Add underscore before capital letters after lowercase
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')  // Add underscore between consecutive capitals followed by lowercase
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
}

/**
 * Converts a string to MACRO_CASE (UPPER_CASE with underscores)
 */
export function toMacroCase(str: string): string {
  if (!str) return str;
  return str
    .toUpperCase()
    .replace(/[^A-Z0-9À-ÿ]/g, '_') // Replace non-alphanumeric chars with underscore, preserving Unicode
    .replace(/_+/g, '_') // Replace consecutive underscores with single underscore
    .replace(/^_|_$/g, ''); // Remove leading and trailing underscores
}

/**
 * Converts a camelCased, space separated, or snake_case string to camelCase
 */
export function toCamelCase(str: string): string {
  if (!str) return str;
  return decapitalize(toPascalCase(str));
}

/**
 * Unified casing object that provides all common string casing variants
 * This allows templates to access any casing variant via object properties
 * 
 * Input must be in camelCase.
 * 
 * @example
 * const name = createCasingObject('myEventName');
 * // name.raw === 'myEventName'
 * // name.lower === 'myeventname'
 * // name.UPPER === 'MYEVENTNAME'
 * // name.Capitalized === 'MyEventName'
 * // name.sna_ke === 'my_event_name'
 * // name.MAC_RO === 'MY_EVENT_NAME'
 * // name.caMel === 'myEventName'
 * // name.PasCal === 'MyEventName'
 * // name['ke-bab'] === 'my-event-name'
 */
export interface CasingObject {
  raw: string;
  lower: string;
  UPPER: string;
  Capitalized: string;
  'sna_ke': string;
  'MAC_RO': string;
  caMel: string;
  PasCal: string;
  'ke-bab': string;
}

export function createCasingObject(str: string): CasingObject {
  return {
    raw: str,
    lower: str.toLowerCase(),
    UPPER: str.toUpperCase(),
    Capitalized: capitalize(str),
    'sna_ke': toSnakeCase(str),
    'MAC_RO': toMacroCase(str),
    caMel: toCamelCase(str),
    PasCal: toPascalCase(str),
    'ke-bab': toKebabCase(str)
  };
}
