import { extractEventName } from './event';

describe('String Transforms - Event', () => {
  describe('extractEventName', () => {
    it('should extract event name from valid signature', () => {
      expect(extractEventName('Transfer(address,address,uint256)')).toBe('Transfer');
      expect(extractEventName('Approval(address,address,uint256)')).toBe('Approval');
      expect(extractEventName('Mint(address,uint256)')).toBe('Mint');
      expect(extractEventName('Burn(address,uint256)')).toBe('Burn');
    });

    it('should handle events with no parameters', () => {
      expect(extractEventName('Pause()')).toBe('Pause');
      expect(extractEventName('Unpause()')).toBe('Unpause');
      expect(extractEventName('Initialize()')).toBe('Initialize');
    });

    it('should handle events with single parameter', () => {
      expect(extractEventName('OwnerChanged(address)')).toBe('OwnerChanged');
      expect(extractEventName('ValueSet(uint256)')).toBe('ValueSet');
      expect(extractEventName('NameSet(string)')).toBe('NameSet');
    });

    it('should handle events with complex parameter types', () => {
      expect(extractEventName('ComplexEvent(address[],uint256[2],bytes32)')).toBe('ComplexEvent');
      expect(extractEventName('StructEvent((uint256,address),bool)')).toBe('StructEvent');
      expect(extractEventName('ArrayEvent(uint256[],string[])')).toBe('ArrayEvent');
    });

    it('should handle events with nested types', () => {
      expect(extractEventName('NestedEvent((address,uint256)[],bool)')).toBe('NestedEvent');
      expect(extractEventName('DeepNestedEvent(((uint256,address),bool)[])')).toBe('DeepNestedEvent');
    });

    it('should handle events with numbers in names', () => {
      expect(extractEventName('Event2(address,uint256)')).toBe('Event2');
      expect(extractEventName('Test123Event(address,uint256)')).toBe('Test123Event');
      expect(extractEventName('Event_2_Test(address,uint256)')).toBe('Event_2_Test');
    });

    it('should handle events with underscores in names', () => {
      expect(extractEventName('transfer_event(address,uint256)')).toBe('transfer_event');
      expect(extractEventName('TRANSFER_EVENT(address,uint256)')).toBe('TRANSFER_EVENT');
      expect(extractEventName('Transfer_Event(address,uint256)')).toBe('Transfer_Event');
    });

    it('should throw error for invalid signature without parentheses', () => {
      expect(() => extractEventName('Transfer')).toThrow('Invalid event signature: Transfer');
      expect(() => extractEventName('Approval')).toThrow('Invalid event signature: Approval');
    });

    it('should throw error for signature with missing opening parenthesis', () => {
      expect(() => extractEventName('Transfer address,address,uint256)')).toThrow('Invalid event signature: Transfer address,address,uint256)');
    });

    it('should handle signature with missing closing parenthesis', () => {
      // The regex /^(\w+)\(/ matches even without closing parenthesis
      expect(extractEventName('Transfer(address,address,uint256')).toBe('Transfer');
    });

    it('should throw error for empty signature', () => {
      expect(() => extractEventName('')).toThrow('Invalid event signature: ');
    });

    it('should throw error for signature with only parentheses', () => {
      expect(() => extractEventName('()')).toThrow('Invalid event signature: ()');
    });

    it('should handle signature starting with non-word character', () => {
      // The regex /^(\w+)\(/ matches word characters, which includes numbers and underscores
      expect(extractEventName('123Event(address)')).toBe('123Event');
      expect(extractEventName('_Event(address)')).toBe('_Event');
      expect(() => extractEventName('-Event(address)')).toThrow('Invalid event signature: -Event(address)');
    });

    it('should throw error for signature with spaces before event name', () => {
      expect(() => extractEventName(' Transfer(address)')).toThrow('Invalid event signature:  Transfer(address)');
      expect(() => extractEventName('\tTransfer(address)')).toThrow('Invalid event signature: \tTransfer(address)');
    });

    it('should handle malformed signatures', () => {
      // The regex /^(\w+)\(/ matches even without closing parenthesis
      expect(extractEventName('Transfer(')).toBe('Transfer');
      expect(() => extractEventName('Transfer)')).toThrow('Invalid event signature: Transfer)');
      expect(() => extractEventName('(Transfer)')).toThrow('Invalid event signature: (Transfer)');
    });

    it('should handle edge cases with special characters', () => {
      // The regex /^(\w+)\(/ only matches word characters (letters, digits, underscore)
      expect(() => extractEventName('Event$Test(address)')).toThrow('Invalid event signature: Event$Test(address)');
      expect(() => extractEventName('Event#Test(address)')).toThrow('Invalid event signature: Event#Test(address)');
      expect(() => extractEventName('Event@Test(address)')).toThrow('Invalid event signature: Event@Test(address)');
    });

    it('should handle events with indexed parameters', () => {
      // Note: The function doesn't specifically handle indexed parameters,
      // but it should still extract the event name correctly
      expect(extractEventName('IndexedEvent(address indexed,uint256)')).toBe('IndexedEvent');
      expect(extractEventName('MultipleIndexedEvent(address indexed,uint256 indexed,string)')).toBe('MultipleIndexedEvent');
    });
  });
});
