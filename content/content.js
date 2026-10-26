// src/dom-extractor.js
function extractTweetData(tweetElement) {
  if (!tweetElement) {
    return null;
  }
  const article = tweetElement.matches?.('article[data-testid="tweet"]') ? tweetElement : tweetElement.querySelector?.('article[data-testid="tweet"]') || tweetElement;
  const statusLink = article.querySelector?.('a[href*="/status/"]');
  if (!statusLink) {
    return null;
  }
  const href = statusLink.getAttribute("href") || "";
  const match = href.match(/\/status\/(\d+)/);
  if (!match || !match[1]) {
    return null;
  }
  const tweetId = match[1];
  const tweetTextEl = article.querySelector?.('[data-testid="tweetText"]');
  const text = tweetTextEl ? tweetTextEl.textContent.trim() : "";
  let authorHandle = "";
  let authorName = "";
  const userNameSection = article.querySelector?.('[data-testid="User-Name"]');
  if (userNameSection) {
    const links = Array.from(userNameSection.querySelectorAll("a"));
    for (const link of links) {
      const linkText = link.textContent.trim();
      if (linkText.startsWith("@")) {
        authorHandle = linkText;
        break;
      }
    }
    if (links.length > 0) {
      const firstText = links[0].textContent.trim();
      if (!firstText.startsWith("@")) {
        authorName = firstText;
      }
    }
  }
  return {
    tweetId,
    authorHandle,
    authorName,
    text
  };
}

// src/badge-renderer.js
var CATEGORY_CLASS_MAP = {
  insight_tutorial: "typesafe-badge-insight",
  news_update: "typesafe-badge-news",
  engagement_bait: "typesafe-badge-bait",
  promo_sales: "typesafe-badge-promo",
  meme_humor: "typesafe-badge-meme",
  personal_opinion: "typesafe-badge-opinion"
};
function createBadgeElement(doc, classification, tweetId) {
  const badge = doc.createElement("span");
  badge.className = "typesafe-post-badge";
  const catClass = CATEGORY_CLASS_MAP[classification.category] || "typesafe-badge-unknown";
  badge.classList.add(catClass);
  badge.setAttribute("data-typesafe-tweet-id", tweetId);
  badge.textContent = classification.label || "Classified";
  const pct = Math.round((classification.confidence || 0) * 100);
  badge.title = `${classification.label} (${pct}% confidence)`;
  return badge;
}
function mountBadge(doc, tweetElement, classification, tweetId) {
  if (!tweetElement || !tweetId) {
    return null;
  }
  if (classification?.category) {
    tweetElement.setAttribute("data-typesafe-category", classification.category);
  }
  const mountTarget = tweetElement.querySelector?.('[data-testid="User-Name"]') || tweetElement.querySelector?.('[data-testid="tweetText"]') || tweetElement;
  if (!mountTarget) {
    return null;
  }
  const existingBadge = tweetElement.querySelector?.("[data-typesafe-tweet-id]");
  if (existingBadge) {
    const existingId = existingBadge.getAttribute("data-typesafe-tweet-id");
    if (existingId === tweetId) {
      return existingBadge;
    }
    existingBadge.remove();
  }
  const badge = createBadgeElement(doc, classification, tweetId);
  mountTarget.appendChild(badge);
  return badge;
}

// src/scroll-observer.js
class TweetDwellObserver {
  constructor(options = {}) {
    this.dwellMs = options.dwellMs ?? 350;
    this.onDwell = options.onDwell || (() => {});
    this.timers = new Map;
    const ObserverClass = options.ObserverClass || (typeof IntersectionObserver !== "undefined" ? IntersectionObserver : null);
    if (ObserverClass) {
      this.observer = new ObserverClass(this.handleIntersection.bind(this), {
        root: options.root || null,
        rootMargin: options.rootMargin || "0px",
        threshold: options.threshold ?? 0.1
      });
    } else {
      this.observer = null;
    }
  }
  handleIntersection(entries) {
    for (const entry of entries) {
      const el = entry.target;
      if (entry.isIntersecting) {
        if (!this.timers.has(el)) {
          const timerId = setTimeout(() => {
            this.timers.delete(el);
            this.onDwell(el);
          }, this.dwellMs);
          this.timers.set(el, timerId);
        }
      } else {
        if (this.timers.has(el)) {
          clearTimeout(this.timers.get(el));
          this.timers.delete(el);
        }
      }
    }
  }
  observe(element) {
    if (!element || !this.observer) {
      return;
    }
    this.observer.observe(element);
  }
  unobserve(element) {
    if (!element) {
      return;
    }
    if (this.timers.has(element)) {
      clearTimeout(this.timers.get(element));
      this.timers.delete(element);
    }
    if (this.observer) {
      this.observer.unobserve(element);
    }
  }
  disconnect() {
    for (const timerId of this.timers.values()) {
      clearTimeout(timerId);
    }
    this.timers.clear();
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// src/dim-manager.js
var ALL_CATEGORIES = [
  "insight_tutorial",
  "news_update",
  "engagement_bait",
  "promo_sales",
  "meme_humor",
  "personal_opinion"
];
function applyDimmedCategories(rootElement, categories = []) {
  if (!rootElement || !rootElement.classList) {
    return;
  }
  const categorySet = new Set(Array.isArray(categories) ? categories : []);
  for (const cat of ALL_CATEGORIES) {
    const className = `typesafe-dim-${cat}`;
    if (categorySet.has(cat)) {
      rootElement.classList.add(className);
    } else {
      rootElement.classList.remove(className);
    }
  }
}
function initDimManager(doc = typeof document !== "undefined" ? document : null, storage = typeof chrome !== "undefined" ? chrome.storage : null) {
  if (!doc || !doc.documentElement) {
    return { disconnect: () => {}, getActiveCategories: () => [] };
  }
  let activeCategories = [];
  const root = doc.documentElement;
  const storageArea = storage?.sync || storage?.local || null;
  function update(categories) {
    activeCategories = Array.isArray(categories) ? categories : [];
    applyDimmedCategories(root, activeCategories);
  }
  if (storageArea && typeof storageArea.get === "function") {
    storageArea.get("dimmedCategories", (result) => {
      if (result && Array.isArray(result.dimmedCategories)) {
        update(result.dimmedCategories);
      }
    });
  }
  const storageChangeHandler = (changes, areaName) => {
    if (changes && changes.dimmedCategories) {
      update(changes.dimmedCategories.newValue);
    }
  };
  if (storage?.onChanged?.addListener) {
    storage.onChanged.addListener(storageChangeHandler);
  }
  return {
    getActiveCategories: () => [...activeCategories],
    disconnect: () => {
      if (storage?.onChanged?.removeListener) {
        storage.onChanged.removeListener(storageChangeHandler);
      }
    }
  };
}

// src/content-entry.js
function initXClassifier(doc = document, runtime = typeof chrome !== "undefined" ? chrome.runtime : null, storage = typeof chrome !== "undefined" ? chrome.storage : null) {
  if (!doc || !runtime) {
    return null;
  }
  const dimManager = initDimManager(doc, storage);
  console.log("[TypeSafe X] Post classifier initialized on x.com");
  const observedElements = new WeakSet;
  const inFlightIds = new Set;
  const dwellObserver = new TweetDwellObserver({
    dwellMs: 350,
    threshold: 0.1,
    onDwell: (tweetEl) => {
      const data = extractTweetData(tweetEl);
      if (!data || !data.tweetId) {
        return;
      }
      if (tweetEl.querySelector(`[data-typesafe-tweet-id="${data.tweetId}"]`)) {
        return;
      }
      if (inFlightIds.has(data.tweetId)) {
        return;
      }
      inFlightIds.add(data.tweetId);
      console.log("[TypeSafe X] Analyzing post:", data.tweetId, data.authorHandle);
      runtime.sendMessage({
        type: "CLASSIFY_TWEET",
        tweetId: data.tweetId,
        tweetState: {
          author_handle: data.authorHandle,
          author_name: data.authorName,
          text: data.text
        }
      }, (response) => {
        inFlightIds.delete(data.tweetId);
        if (response && response.success && response.classification) {
          console.log("[TypeSafe X] Tagged post", data.tweetId, "->", response.classification.label);
          mountBadge(doc, tweetEl, response.classification, data.tweetId);
        } else {
          console.warn("[TypeSafe X] Classification not available for post", data.tweetId, response?.error || "");
        }
      });
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
  scanExistingPosts();
  setTimeout(scanExistingPosts, 500);
  setTimeout(scanExistingPosts, 1500);
  setTimeout(scanExistingPosts, 3000);
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
if (typeof window !== "undefined" && typeof document !== "undefined") {
  initXClassifier();
}
