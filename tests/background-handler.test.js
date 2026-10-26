import { describe, it, expect, beforeEach } from "bun:test";
import { handleClassifyTweetMessage } from "../src/background-handler.js";
import { CacheManager } from "../src/cache-manager.js";

describe("Background Message Handler", () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager(null);
  });

  it("ignores messages with non-matching types", async () => {
    const res = await handleClassifyTweetMessage({ type: "OTHER_ACTION" }, { cacheManager: cache });
    expect(res).toBeNull();
  });

  it("returns cached classification if present without calling classifyFn", async () => {
    await cache.set("t-123", { category: "insight_tutorial", label: "Insight", confidence: 0.9 });

    let classifyCalled = false;
    const mockClassify = async () => {
      classifyCalled = true;
      return null;
    };

    const res = await handleClassifyTweetMessage(
      { type: "CLASSIFY_TWEET", tweetId: "t-123" },
      { cacheManager: cache, classifyFn: mockClassify }
    );

    expect(classifyCalled).toBe(false);
    expect(res.success).toBe(true);
    expect(res.fromCache).toBe(true);
    expect(res.classification.label).toBe("Insight");
  });

  it("calls classifyFn on cache miss, caches the result, and returns classification", async () => {
    const mockClassify = async (key, state) => ({
      category: "news_update",
      label: "News",
      confidence: 0.88
    });

    const res = await handleClassifyTweetMessage(
      {
        type: "CLASSIFY_TWEET",
        tweetId: "t-456",
        tweetState: { text: "Breaking release news" }
      },
      {
        cacheManager: cache,
        apiKey: "test-api-key",
        classifyFn: mockClassify
      }
    );

    expect(res.success).toBe(true);
    expect(res.fromCache).toBe(false);
    expect(res.classification.label).toBe("News");

    // Check that it is now cached
    const cached = await cache.get("t-456");
    expect(cached).not.toBeNull();
    expect(cached.label).toBe("News");
  });

  it("handles failure from classifyFn without throwing", async () => {
    const mockClassify = async () => ({
      category: "unknown",
      label: "Unknown",
      confidence: 0,
      error: "API error"
    });

    const res = await handleClassifyTweetMessage(
      {
        type: "CLASSIFY_TWEET",
        tweetId: "t-789",
        tweetState: { text: "Some text" }
      },
      {
        cacheManager: cache,
        apiKey: "test-api-key",
        classifyFn: mockClassify
      }
    );

    expect(res.success).toBe(false);
    expect(res.error).toBe("API error");
  });
});
