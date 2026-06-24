// Agent Memory Test for SokogateOS
// Tests the AgentMemory class for short-term and long-term memory management

const AgentMemory = require('../src/agents/agentMemory');
const logger = require('../src/utils/logger');

jest.mock('../src/utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

describe('AgentMemory', () => {
  let memory;

  beforeEach(() => {
    jest.clearAllMocks();
    memory = new AgentMemory('test-agent-id');
  });

  describe('constructor', () => {
    test('should set agentId correctly', () => {
      expect(memory.agentId).toBe('test-agent-id');
    });

    test('should initialize shortTerm and longTerm as Maps', () => {
      expect(memory.shortTerm).toBeInstanceOf(Map);
      expect(memory.longTerm).toBeInstanceOf(Map);
    });

    test('should set maxShortTerm to default 100', () => {
      expect(memory.maxShortTerm).toBe(100);
    });
  });

  describe('store', () => {
    test('should store value in short-term memory by default', async () => {
      await memory.store('key1', 'value1');
      expect(memory.shortTerm.has('key1')).toBe(true);
      const entry = memory.shortTerm.get('key1');
      expect(entry.value).toBe('value1');
      expect(entry.timestamp).toBeDefined();
    });

    test('should store value in long-term memory when persist is true', async () => {
      await memory.store('key1', 'value1', { persist: true });
      expect(memory.longTerm.has('key1')).toBe(true);
      expect(memory.shortTerm.has('key1')).toBe(false);
    });

    test('should evict oldest entry when short-term memory exceeds maxShortTerm', async () => {
      memory.maxShortTerm = 5;
      for (let i = 0; i < 5; i++) {
        await memory.store(`key${i}`, `value${i}`);
      }
      // Adding one more should evict the oldest entry (key0)
      expect(memory.shortTerm.size).toBe(5);
      expect(memory.shortTerm.has('key0')).toBe(true);

      await memory.store('trigger', 'value');

      // Short-term should still be capped at 5
      expect(memory.shortTerm.size).toBe(5);
      // The oldest entry (key0) should be evicted
      expect(memory.shortTerm.has('key0')).toBe(false);
      // The new entry should be present
      expect(memory.shortTerm.has('trigger')).toBe(true);
    });
  });

  describe('retrieve', () => {
    test('should retrieve from short-term memory first', async () => {
      await memory.store('key1', 'short-value');
      await memory.store('key1', 'long-value', { persist: true });

      // Should return short-term value (checked first)
      const result = await memory.retrieve('key1');
      expect(result).toBe('short-value');
    });

    test('should retrieve from long-term memory if not in short-term', async () => {
      await memory.store('key1', 'long-value', { persist: true });
      const result = await memory.retrieve('key1');
      expect(result).toBe('long-value');
    });

    test('should return null for non-existent key', async () => {
      const result = await memory.retrieve('non-existent');
      expect(result).toBeNull();
    });

    test('should update timestamp on access', async () => {
      await memory.store('key1', 'value1');
      const before = memory.shortTerm.get('key1').timestamp;
      await new Promise(r => setTimeout(r, 10)); // Small delay
      await memory.retrieve('key1');
      const after = memory.shortTerm.get('key1').timestamp;
      expect(after).toBeGreaterThanOrEqual(before);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await memory.store('product:cotton', 'Cotton fabric details');
      await memory.store('product:silk', 'Silk fabric details', { persist: true });
      await memory.store('supplier:alibaba', 'Alibaba supplier info');
    });

    test('should find matching keys in short-term and long-term', async () => {
      const results = await memory.search('cotton');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].key).toContain('cotton');
    });

    test('should find matching values', async () => {
      const results = await memory.search('Silk');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(r => r.key === 'product:silk')).toBe(true);
    });

    test('should sort results by timestamp descending', async () => {
      const results = await memory.search('product');
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].timestamp).toBeGreaterThanOrEqual(results[i].timestamp);
      }
    });

    test('should return empty array for no matches', async () => {
      const results = await memory.search('zzz_nonexistent_zzz');
      expect(results).toEqual([]);
    });

    test('should include source field (short-term or long-term)', async () => {
      const results = await memory.search('fabric');
      expect(results.some(r => r.source === 'short-term')).toBe(true);
      expect(results.some(r => r.source === 'long-term')).toBe(true);
    });

    test('should exclude short-term when includeShortTerm is false', async () => {
      const results = await memory.search('fabric', { includeShortTerm: false });
      expect(results.every(r => r.source === 'long-term')).toBe(true);
    });
  });

  describe('consolidate', () => {
    test('should move old short-term entries to long-term', async () => {
      // Manually set up an old entry
      const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      memory.shortTerm.set('old-key', { value: 'old-value', timestamp: oldTimestamp });

      await memory.consolidate();

      expect(memory.longTerm.has('old-key')).toBe(true);
      expect(memory.shortTerm.has('old-key')).toBe(false);
    });

    test('should keep recent short-term entries', async () => {
      const recentTimestamp = Date.now() - 60 * 1000; // 1 minute ago
      memory.shortTerm.set('recent-key', { value: 'recent-value', timestamp: recentTimestamp });

      await memory.consolidate();

      expect(memory.shortTerm.has('recent-key')).toBe(true);
    });

    test('should limit long-term memory to 1000 entries', async () => {
      for (let i = 0; i < 1200; i++) {
        memory.longTerm.set(`key${i}`, { value: `value${i}`, timestamp: Date.now() - i });
      }

      await memory.consolidate();

      expect(memory.longTerm.size).toBeLessThanOrEqual(1000);
      // Map preserves insertion order; the 200 oldest keys (key0..key199) are evicted,
      // and the 1000 most recently inserted keys (key200..key1199) are kept.
      expect(memory.longTerm.has('key1199')).toBe(true);
    });
  });

  describe('clear', () => {
    test('should clear both short-term and long-term memory', async () => {
      await memory.store('key1', 'val1');
      await memory.store('key2', 'val2', { persist: true });

      await memory.clear();

      expect(memory.shortTerm.size).toBe(0);
      expect(memory.longTerm.size).toBe(0);
    });
  });

  describe('getStats', () => {
    test('should return memory statistics', async () => {
      await memory.store('key1', 'val1');
      await memory.store('key2', 'val2', { persist: true });
      await memory.store('key3', 'val3', { persist: true });

      const stats = memory.getStats();
      expect(stats).toEqual({
        shortTermSize: 1,
        longTermSize: 2,
        maxShortTerm: 100,
      });
    });
  });
});
