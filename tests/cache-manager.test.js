import { describe, it, expect, beforeEach } from "bun:test";
import { CacheManager } from "../src/cache-manager.js";

describe("Cache Manager", () => {
  let mockStorage;
  let cache;

  beforeEach(() => {
    const store = {};
    mockStorage = {
      get: async (key) => ({ [key]: store[key] }),
      set: async (obj) => Object.assign(store, obj)
    };
    cache = new CacheManager(mockStorage);
  });

  it("returns null on cache miss", async () => {
    const res = await cache.get("non-existent");
    expect(res).toBeNull();
  });

  it("saves and retrieves classification", async () => {
    await cache.set("tweet-100", { category: "meme_humor", label: "Meme", confidence: 0.9 });
    const res = await cache.get("tweet-100");
    expect(res).not.toBeNull();
    expect(res.category).toBe("meme_humor");
    expect(res.label).toBe("Meme");
  });

  it("serves subsequent requests from in-memory cache without calling storage", async () => {
    await cache.set("tweet-200", { category: "news_update", label: "News", confidence: 0.85 });

    let storageReadCalled = false;
    mockStorage.get = async () => {
      storageReadCalled = true;
      return {};
    };

    const res = await cache.get("tweet-200");
    expect(storageReadCalled).toBe(false);
    expect(res.label).toBe("News");
  });

  it("falls back to storage when memory cache is empty", async () => {
    // Populate storage directly
    await mockStorage.set({
      typesafe_tweet_cache: {
        "tweet-300": { category: "insight_tutorial", label: "Insight", confidence: 0.95 }
      }
    });

    // Create fresh cache with empty memory
    const freshCache = new CacheManager(mockStorage);
    const res = await freshCache.get("tweet-300");
    expect(res).not.toBeNull();
    expect(res.label).toBe("Insight");
  });

  it("handles null or missing storage gracefully", async () => {
    const memoryOnlyCache = new CacheManager(null);
    await memoryOnlyCache.set("tweet-400", { category: "promo_sales", label: "Promo" });
    const res = await memoryOnlyCache.get("tweet-400");
    expect(res.label).toBe("Promo");
  });
});
