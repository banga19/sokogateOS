// Agent Memory Module for sokogateOS Autonomous AI Agent Engine
// Provides persistent memory and knowledge retrieval for agents

const logger = require('../utils/logger');

class AgentMemory {
  constructor(agentId) {
    this.agentId = agentId;
    this.shortTerm = new Map();
    this.longTerm = new Map();
    this.maxShortTerm = 100;
  }

  async store(key, value, options = {}) {
    const { persist = false } = options;
    if (persist) {
      this.longTerm.set(key, { value, timestamp: Date.now() });
    } else {
      this.shortTerm.set(key, { value, timestamp: Date.now() });
      if (this.shortTerm.size >= this.maxShortTerm) {
        await this.consolidate();
      }
    }
  }

  async retrieve(key) {
    if (this.shortTerm.has(key)) {
      const entry = this.shortTerm.get(key);
      entry.timestamp = Date.now();
      return entry.value;
    }
    if (this.longTerm.has(key)) {
      const entry = this.longTerm.get(key);
      entry.timestamp = Date.now();
      return entry.value;
    }
    return null;
  }

  async search(query, options = {}) {
    const { includeShortTerm = true } = options;
    const results = [];
    const queryLower = query.toLowerCase();

    const searchMap = (map, source) => {
      for (const [key, entry] of map.entries()) {
        if (key.toLowerCase().includes(queryLower) ||
            (typeof entry.value === 'string' && entry.value.toLowerCase().includes(queryLower))) {
          results.push({ key, value: entry.value, source, timestamp: entry.timestamp });
        }
      }
    };

    if (includeShortTerm) searchMap(this.shortTerm, 'short-term');
    searchMap(this.longTerm, 'long-term');

    return results.sort((a, b) => b.timestamp - a.timestamp);
  }

  async consolidate() {
    const now = Date.now();
    for (const [key, entry] of this.shortTerm.entries()) {
      if (now - entry.timestamp > 5 * 60 * 1000) {
        this.longTerm.set(key, entry);
        this.shortTerm.delete(key);
      }
    }
    if (this.longTerm.size > 1000) {
      const sorted = [...this.longTerm.entries()].sort((a, b) => b[1].timestamp - a[1].timestamp);
      this.longTerm = new Map(sorted.slice(0, 1000));
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
      maxShortTerm: this.maxShortTerm
    };
  }
}

module.exports = AgentMemory;