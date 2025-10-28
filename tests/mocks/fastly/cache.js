/**
 * Mock for fastly:cache module
 */

class MockSimpleCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  static get(key) {
    const instance = MockSimpleCache.getInstance();
    const item = instance.cache.get(key);
    if (item && item.expiresAt > Date.now()) {
      return item.value;
    }
    // Clean up expired item
    if (item) {
      instance.cache.delete(key);
      if (instance.timers.has(key)) {
        clearTimeout(instance.timers.get(key));
        instance.timers.delete(key);
      }
    }
    return null;
  }

  static set(key, value, ttlSeconds = 3600) {
    const instance = MockSimpleCache.getInstance();
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    
    // Clear existing timer if any
    if (instance.timers.has(key)) {
      clearTimeout(instance.timers.get(key));
    }
    
    // Set the cache item
    instance.cache.set(key, { value, expiresAt });
    
    // Set expiration timer
    const timer = setTimeout(() => {
      instance.cache.delete(key);
      instance.timers.delete(key);
    }, ttlSeconds * 1000);
    
    instance.timers.set(key, timer);
  }

  static async getOrSet(key, callback, ttlSeconds = 3600) {
    const cached = MockSimpleCache.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const value = await callback();
    // Extract TTL from the callback result if it's an object with ttl property
    const actualTtl = (typeof value === 'object' && value.ttl) ? value.ttl : ttlSeconds;
    MockSimpleCache.set(key, value, actualTtl);
    return value;
  }

  static purge(key, options = {}) {
    const instance = MockSimpleCache.getInstance();
    if (instance.timers.has(key)) {
      clearTimeout(instance.timers.get(key));
      instance.timers.delete(key);
    }
    return instance.cache.delete(key);
  }

  static clear() {
    const instance = MockSimpleCache.getInstance();
    // Clear all timers
    for (const timer of instance.timers.values()) {
      clearTimeout(timer);
    }
    instance.cache.clear();
    instance.timers.clear();
  }

  static getInstance() {
    if (!MockSimpleCache.instance) {
      MockSimpleCache.instance = new MockSimpleCache();
    }
    return MockSimpleCache.instance;
  }
}

module.exports = { SimpleCache: MockSimpleCache };