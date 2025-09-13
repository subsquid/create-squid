/**
 * Event-related utility functions
 */

/**
 * Extracts the event name from an event signature
 * @param eventSignature - The event signature (e.g., "Transfer(address,address,uint256)")
 * @returns The event name (e.g., "Transfer")
 * @throws Error if the signature format is invalid
 */
export function extractEventName(eventSignature: string): string {
  const match = eventSignature.match(/^(\w+)\(/);
  if (!match) {
    throw new Error(`Invalid event signature: ${eventSignature}`);
  }
  return match[1];
}
