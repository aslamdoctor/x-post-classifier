import { classifyPost } from "./typesafe-client.js";

/**
 * Handles incoming runtime messages for tweet classification.
 *
 * @param {object} message
 * @param {{ cacheManager?: object, apiKey?: string, classifyFn?: Function }} deps
 * @returns {Promise<object|null>}
 */
export async function handleClassifyTweetMessage(message, deps = {}) {
  if (!message || message.type !== "CLASSIFY_TWEET") {
    return null;
  }

  const { tweetId, tweetState } = message;
  if (!tweetId) {
    return { success: false, error: "Missing tweetId" };
  }

  const cache = deps.cacheManager;

  // 1. Check cache first
  if (cache) {
    const cached = await cache.get(tweetId);
    if (cached) {
      return {
        success: true,
        classification: cached,
        fromCache: true
      };
    }
  }

  // 2. Query TypeSafe API
  const classify = deps.classifyFn || classifyPost;
  const apiKey = deps.apiKey || "";

  const result = await classify(apiKey, tweetState || {});

  if (result.category && result.category !== "unknown") {
    if (cache) {
      await cache.set(tweetId, result);
    }
    return {
      success: true,
      classification: result,
      fromCache: false
    };
  }

  return {
    success: false,
    classification: result,
    error: result.error || "Classification failed"
  };
}
