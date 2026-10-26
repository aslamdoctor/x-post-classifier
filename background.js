import { CacheManager } from "./src/cache-manager.js";
import { handleClassifyTweetMessage } from "./src/background-handler.js";
import { BUILTIN_TYPESAFE_KEY } from "./src/config.js";

const tweetCache = new CacheManager(chrome.storage?.local || null);

chrome.runtime.onMessage?.addListener((message, sender, sendResponse) => {
  if (message && message.type === "CLASSIFY_TWEET") {
    (async () => {
      let apiKey = BUILTIN_TYPESAFE_KEY;
      if (!apiKey && chrome.storage?.local) {
        const stored = await chrome.storage.local.get("typesafeApiKey");
        apiKey = stored.typesafeApiKey || "";
      }

      const response = await handleClassifyTweetMessage(message, {
        cacheManager: tweetCache,
        apiKey
      });
      sendResponse(response);
    })();
    return true; // Keep message channel open for async response
  }
});
