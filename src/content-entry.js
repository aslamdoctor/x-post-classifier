import { extractTweetData } from "./dom-extractor.js";
import { mountBadge } from "./badge-renderer.js";
import { TweetDwellObserver } from "./scroll-observer.js";
import { initDimManager } from "./dim-manager.js";

/**
 * Initializes X.com post classification tracking.
 *
 * @param {Document} doc
 * @param {object} runtime Chrome runtime API (chrome.runtime)
 * @param {object} storage Chrome storage API (chrome.storage)
 */
function initXClassifier(
  doc = document,
  runtime = (typeof chrome !== "undefined" ? chrome.runtime : null),
  storage = (typeof chrome !== "undefined" ? chrome.storage : null)
) {
  if (!doc || !runtime) {
    return null;
  }

  const dimManager = initDimManager(doc, storage);

  console.log("[TypeSafe X] Post classifier initialized on x.com");

  const observedElements = new WeakSet();
  const inFlightIds = new Set();

  const dwellObserver = new TweetDwellObserver({
    dwellMs: 350,
    threshold: 0.1,
    onDwell: (tweetEl) => {
      const data = extractTweetData(tweetEl);
      if (!data || !data.tweetId) {
        return;
      }

      // If already mounted or request is in-flight, skip
      if (tweetEl.querySelector(`[data-typesafe-tweet-id="${data.tweetId}"]`)) {
        return;
      }
      if (inFlightIds.has(data.tweetId)) {
        return;
      }

      inFlightIds.add(data.tweetId);
      console.log("[TypeSafe X] Analyzing post:", data.tweetId, data.authorHandle);

      runtime.sendMessage(
        {
          type: "CLASSIFY_TWEET",
          tweetId: data.tweetId,
          tweetState: {
            author_handle: data.authorHandle,
            author_name: data.authorName,
            text: data.text
          }
        },
        (response) => {
          inFlightIds.delete(data.tweetId);
          if (response && response.success && response.classification) {
            console.log("[TypeSafe X] Tagged post", data.tweetId, "->", response.classification.label);
            mountBadge(doc, tweetEl, response.classification, data.tweetId);
          } else {
            console.warn("[TypeSafe X] Classification not available for post", data.tweetId, response?.error || "");
          }
        }
      );
    }
  });

  function processTweetNode(node) {
    if (!node || node.nodeType !== 1) {
      return;
    }

    if (node.matches?.('article[data-testid="tweet"]')) {
      if (!observedElements.has(node)) {
        observedElements.add(node);
        dwellObserver.observe(node);
      }
      return;
    }

    const tweets = node.querySelectorAll?.('article[data-testid="tweet"]');
    if (tweets && tweets.length > 0) {
      for (const tweet of tweets) {
        if (!observedElements.has(tweet)) {
          observedElements.add(tweet);
          dwellObserver.observe(tweet);
        }
      }
    }
  }

  function scanExistingPosts() {
    const existingTweets = doc.querySelectorAll('article[data-testid="tweet"]');
    for (const tweet of existingTweets) {
      if (!observedElements.has(tweet)) {
        observedElements.add(tweet);
        dwellObserver.observe(tweet);
      }
    }
  }

  // Scan immediately and after common SPAs render delay
  scanExistingPosts();
  setTimeout(scanExistingPosts, 500);
  setTimeout(scanExistingPosts, 1500);
  setTimeout(scanExistingPosts, 3000);

  // Watch for dynamic DOM additions as user scrolls
  const mutationObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        processTweetNode(node);
      }
    }
  });

  if (doc.body) {
    mutationObserver.observe(doc.body, {
      childList: true,
      subtree: true
    });
  }

  return {
    dwellObserver,
    mutationObserver,
    dimManager,
    disconnect: () => {
      dwellObserver.disconnect();
      mutationObserver.disconnect();
      dimManager.disconnect();
    }
  };
}

// Auto-run in browser content script context
if (typeof window !== "undefined" && typeof document !== "undefined") {
  initXClassifier();
}
