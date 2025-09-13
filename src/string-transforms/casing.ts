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
