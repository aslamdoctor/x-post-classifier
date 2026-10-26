export const STORAGE_CACHE_KEY = "typesafe_tweet_cache";

/**
 * CacheManager provides two-tier caching:
 * 1. Fast in-memory Map for instantaneous synchronous/asynchronous lookup.
 * 2. chrome.storage.local persistence to preserve classifications across tab reloads.
 */
export class CacheManager {
  /**
   * @param {object|null} storageArea Storage adapter (e.g., chrome.storage.local)
   * @param {number} maxMemoryEntries Max entries in RAM before LRU pruning
   */
  constructor(storageArea = null, maxMemoryEntries = 500) {
    this.storage = storageArea;
    this.maxMemoryEntries = maxMemoryEntries;
    this.memoryCache = new Map();
  }

  /**
   * Retrieves classification for a tweet ID from memory or storage.
   *
   * @param {string} tweetId
   * @returns {Promise<object|null>}
   */
  async get(tweetId) {
    if (!tweetId) {
      return null;
    }

    // 1. Check in-memory map
    if (this.memoryCache.has(tweetId)) {
      const val = this.memoryCache.get(tweetId);
      // Re-insert to refresh LRU order
      this.memoryCache.delete(tweetId);
      this.memoryCache.set(tweetId, val);
      return val;
    }

    // 2. Check storage layer if available
    if (this.storage && typeof this.storage.get === "function") {
      try {
        const stored = await this.storage.get(STORAGE_CACHE_KEY);
        const map = stored && stored[STORAGE_CACHE_KEY] ? stored[STORAGE_CACHE_KEY] : {};
        if (map[tweetId]) {
          const val = map[tweetId];
          this.memoryCache.set(tweetId, val);
          return val;
        }
      } catch {
        // Fall back gracefully if storage is unavailable or fails
      }
    }

    return null;
  }

  /**
   * Saves classification data to memory and storage.
   *
   * @param {string} tweetId
   * @param {object} data
   * @returns {Promise<void>}
   */
  async set(tweetId, data) {
    if (!tweetId || !data) {
      return;
    }

    // Enforce in-memory LRU limit
    if (this.memoryCache.size >= this.maxMemoryEntries) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    this.memoryCache.set(tweetId, data);

    if (this.storage && typeof this.storage.set === "function") {
      try {
        const stored = await this.storage.get(STORAGE_CACHE_KEY);
        const existing = stored && stored[STORAGE_CACHE_KEY] ? stored[STORAGE_CACHE_KEY] : {};
        existing[tweetId] = data;
        await this.storage.set({ [STORAGE_CACHE_KEY]: existing });
      } catch {
        // Fail quietly if storage write fails
      }
    }
  }

  /**
   * Clears the in-memory map.
   */
  clearMemory() {
    this.memoryCache.clear();
  }
}
