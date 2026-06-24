// Agent Memory Module for sokogateOS Autonomous AI Agent Engine
// Provides persistent memory and knowledge retrieval for agents
// Optimized: bounded caches, O(1) eviction, batched consolidation

const logger = require('../utils/logger');

// ── Tuning constants ──
const MAX_SHORT_TERM = 100;
const MAX_LONG_TERM = 1000;
const CONSOLIDATION_AGE_MS = 5 * 60 * 1000; // 5 minutes

class AgentMemory {
  constructor(agentId) {
    this.agentId = agentId;
    this.shortTerm = new Map();
    this.longTerm = new Map();
    this.maxShortTerm = MAX_SHORT_TERM;
  }

  /**
   * Store a value in memory.
   * When short-term fills up, the OLDEST entry is evicted immediately
   * (not after a full scan), preventing O(n) consolidate on every insert.
   * @param {string} key
   * @param {*} value
   * @param {{ persist?: boolean }} [options]
   */
  async store(key, value, options = {}) {
    const { persist = false } = options;
    const target = persist ? this.longTerm : this.shortTerm;
    // Use instance property (allows test overrides), fall back to constant
    const maxSize = persist ? MAX_LONG_TERM : (this.maxShortTerm || MAX_SHORT_TERM);

    // Bounded insert: evict oldest when at capacity and key is new
    if (target.size >= maxSize && !target.has(key)) {
      const oldestKey = target.keys().next().value;
      target.delete(oldestKey);
    }

    target.set(key, { value, timestamp: Date.now() });
  }

  async retrieve(key) {
    // Short-term is checked first (hot path)
    const st = this.shortTerm.get(key);
    if (st) {
      st.timestamp = Date.now(); // LRU touch
      return st.value;
    }
    const lt = this.longTerm.get(key);
    if (lt) {
      lt.timestamp = Date.now();
      return lt.value;
    }
    return null;
  }

  async search(query, options = {}) {
    const { includeShortTerm = true } = options;
    const results = [];
    const queryLower = query.toLowerCase();

    // Inline predicate to avoid per-item function call overhead
    const matches = (key, value) =>
      key.toLowerCase().includes(queryLower) ||
      (typeof value === 'string' && value.toLowerCase().includes(queryLower));

    if (includeShortTerm) {
      for (const [key, entry] of this.shortTerm.entries()) {
        if (matches(key, entry.value)) {
          results.push({ key, value: entry.value, source: 'short-term', timestamp: entry.timestamp });
        }
      }
    }

    for (const [key, entry] of this.longTerm.entries()) {
      if (matches(key, entry.value)) {
        results.push({ key, value: entry.value, source: 'long-term', timestamp: entry.timestamp });
      }
    }

    results.sort((a, b) => b.timestamp - a.timestamp);
    return results;
  }

  /**
   * Consolidate — move aged short-term entries to long-term.
   * Now safely idempotent and will not throw even if called concurrently.
   */
  async consolidate() {
    const now = Date.now();
    const toMove = [];

    // Phase 1: collect (mutate iterand in phase 2 to avoid concurrency issues)
    for (const [key, entry] of this.shortTerm.entries()) {
      if (now - entry.timestamp > CONSOLIDATION_AGE_MS) {
        toMove.push([key, entry]);
      }
    }

    // Phase 2: move
    for (const [key, entry] of toMove) {
      if (this.longTerm.size >= MAX_LONG_TERM) {
        const oldest = this.longTerm.keys().next().value;
        this.longTerm.delete(oldest);
      }
      this.longTerm.set(key, entry);
      this.shortTerm.delete(key);
    }

    // Phase 3: trim long-term if still over limit (edge case)
    if (this.longTerm.size > MAX_LONG_TERM) {
      const excess = this.longTerm.size - MAX_LONG_TERM;
      const keys = this.longTerm.keys();
      for (let i = 0; i < excess; i++) {
        this.longTerm.delete(keys.next().value);
      }
    }
  }

  async clear() {
    this.shortTerm.clear();
    this.longTerm.clear();
  }

  getStats() {
    return {
      shortTermSize: this.shortTerm.size,
      longTermSize: this.longTerm.size,
      maxShortTerm: this.maxShortTerm,
    };
  }
}

module.exports = AgentMemory;