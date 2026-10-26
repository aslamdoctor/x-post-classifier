# X.com Post Type Classifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement automated, real-time post classification tags on x.com as the user scrolls, querying TypeSafe's Jev model via an isolated background service worker and rendering clean category pill badges in tweet headers.

**Architecture:** A content script tracks visible tweets on x.com using `IntersectionObserver` with a 350ms dwell threshold. When triggered, it extracts tweet metadata (status ID, author, text) and messages the extension background service worker. The background worker queries `https://api.typesafe.ai/v1/ask` with a TypeSafe Choice question, caches the result in `chrome.storage.local`, and returns the category to the content script for DOM badge injection.

**Tech Stack:** JavaScript (ES modules, Chrome Extension Manifest V3), Bun (bundling and testing), Happy-DOM (unit testing DOM elements), TypeSafe API (Jev System One model).

## Global Constraints

- Never hardcode `TYPESAFE_API_KEY` into content scripts or committed files.
- Manifest V3 compliant (no remote code execution, background service worker lifecycle aware).
- No blocking or disrupting native x.com UI or scroll performance.
- Handle virtualized list node recycling gracefully using `data-typesafe-tweet-id` deduplication.
- Bun CLI required for all commands (`bun test`, `bun build`).

---

### Task 1: TypeSafe Client Module & Tests

**Files:**
- Create: `src/x-classifier/typesafe-client.js`
- Test: `tests/x-typesafe-client.test.js`

**Interfaces:**
- Consumes: `apiKey` (string), `tweetState` (`{ author_handle: string, author_name: string, text: string }`)
- Produces: `classifyPost(apiKey, tweetState): Promise<{ category: string, label: string, confidence: number }>`

- [ ] **Step 1: Write failing unit test for TypeSafe payload builder and response parser**
```javascript
// tests/x-typesafe-client.test.js
import { describe, it, expect } from "bun:test";
import { buildTypeSafePayload, parseTypeSafeResponse } from "../src/x-classifier/typesafe-client.js";

describe("TypeSafe Client", () => {
  it("builds valid Choice question payload with post_type", () => {
    const payload = buildTypeSafePayload({
      author_handle: "@vishalsingh2972",
      author_name: "Vishal Singh",
      text: "there is so much gold on Chinese GitHub"
    });
    expect(payload.questions[0].id).toBe("post_type");
    expect(payload.questions[0].type).toBe("choice");
    expect(payload.questions[0].options.length).toBe(6);
  });

  it("parses top choice from TypeSafe response correctly", () => {
    const mockResponse = {
      answers: {
        post_type: {
          choice: {
            top: "insight_tutorial",
            probabilities: {
              insight_tutorial: 0.88,
              news_update: 0.08
            }
          }
        }
      }
    };
    const result = parseTypeSafeResponse(mockResponse);
    expect(result.category).toBe("insight_tutorial");
    expect(result.label).toBe("Insight");
    expect(result.confidence).toBe(0.88);
  });
});
```
- [ ] **Step 2: Run test to confirm failure**
Run: `bun test tests/x-typesafe-client.test.js`
- [ ] **Step 3: Implement `src/x-classifier/typesafe-client.js`**
Define `CATEGORY_MAP`, `buildTypeSafePayload`, `parseTypeSafeResponse`, and `classifyPost(apiKey, tweetState, fetchFn)`.
- [ ] **Step 4: Run test to ensure passing**
Run: `bun test tests/x-typesafe-client.test.js`
- [ ] **Step 5: Commit**
`git add src/x-classifier/typesafe-client.js tests/x-typesafe-client.test.js && git commit -m "feat(classifier): add typesafe client and response parsing"`

---

### Task 2: DOM Extractor Utility & Tests

**Files:**
- Create: `src/x-classifier/dom-extractor.js`
- Test: `tests/x-dom-extractor.test.js`

**Interfaces:**
- Consumes: `tweetElement` (`HTMLElement` representing `article[data-testid="tweet"]`)
- Produces: `extractTweetData(tweetElement): { tweetId: string | null, authorHandle: string, authorName: string, text: string } | null`

- [ ] **Step 1: Write failing test using the provided X.com tweet HTML snippet**
```javascript
// tests/x-dom-extractor.test.js
import { describe, it, expect } from "bun:test";
import { Window } from "happy-dom";
import { extractTweetData } from "../src/x-classifier/dom-extractor.js";

describe("DOM Extractor", () => {
  it("extracts tweet ID, author handle, author name, and tweet text from X tweet element", () => {
    const window = new Window();
    const document = window.document;
    const container = document.createElement("div");
    container.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name">
          <a href="/vishalsingh2972"><span><span>Vishal Singh</span></span></a>
          <a href="/vishalsingh2972"><span>@vishalsingh2972</span></a>
          <a href="/vishalsingh2972/status/2114383418960265708"><time>15h</time></a>
        </div>
        <div data-testid="tweetText">
          <span>there is so much gold on the Chinese GitHub</span>
        </div>
      </article>
    `;
    const tweetEl = container.querySelector('article[data-testid="tweet"]');
    const data = extractTweetData(tweetEl);
    expect(data.tweetId).toBe("2114383418960265708");
    expect(data.authorHandle).toBe("@vishalsingh2972");
    expect(data.authorName).toBe("Vishal Singh");
    expect(data.text).toContain("Chinese GitHub");
  });

  it("returns null for sponsored/ad posts without status URL", () => {
    const window = new Window();
    const document = window.document;
    const container = document.createElement("div");
    container.innerHTML = `<article data-testid="tweet"><div>Ad</div></article>`;
    const tweetEl = container.querySelector('article[data-testid="tweet"]');
    expect(extractTweetData(tweetEl)).toBeNull();
  });
});
```
- [ ] **Step 2: Run test to confirm failure**
Run: `bun test tests/x-dom-extractor.test.js`
- [ ] **Step 3: Implement `src/x-classifier/dom-extractor.js`**
Extract status ID via `/status/([0-9]+)/?` regex from `a[href*="/status/"]`, handle name/handle parsing, and `div[data-testid="tweetText"]` text retrieval.
- [ ] **Step 4: Run test to ensure passing**
Run: `bun test tests/x-dom-extractor.test.js`
- [ ] **Step 5: Commit**
`git add src/x-classifier/dom-extractor.js tests/x-dom-extractor.test.js && git commit -m "feat(classifier): add tweet dom metadata extractor"`

---

### Task 3: Badge Renderer & Styling

**Files:**
- Create: `src/x-classifier/badge-renderer.js`
- Create: `src/x-classifier/badge.css`
- Test: `tests/x-badge-renderer.test.js`

**Interfaces:**
- Consumes: `tweetElement` (`HTMLElement`), `classification` (`{ category: string, label: string, confidence: number }`)
- Produces: `mountBadge(tweetElement, classification): HTMLElement | null`

- [ ] **Step 1: Write failing test for badge creation and injection**
```javascript
// tests/x-badge-renderer.test.js
import { describe, it, expect } from "bun:test";
import { Window } from "happy-dom";
import { mountBadge, createBadgeElement } from "../src/x-classifier/badge-renderer.js";

describe("Badge Renderer", () => {
  it("creates badge element with appropriate category class and text", () => {
    const window = new Window();
    const document = window.document;
    const badge = createBadgeElement(document, {
      category: "insight_tutorial",
      label: "Insight",
      confidence: 0.92
    }, "12345");
    expect(badge.textContent).toBe("Insight");
    expect(badge.getAttribute("data-typesafe-tweet-id")).toBe("12345");
    expect(badge.classList.contains("typesafe-badge-insight")).toBe(true);
  });

  it("mounts badge into User-Name header container", () => {
    const window = new Window();
    const document = window.document;
    const container = document.createElement("div");
    container.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name">
          <a href="/user"><span>User</span></a>
          <a href="/user/status/12345"><time>1h</time></a>
        </div>
      </article>
    `;
    const tweetEl = container.querySelector('article[data-testid="tweet"]');
    mountBadge(document, tweetEl, {
      category: "news_update",
      label: "News",
      confidence: 0.85
    }, "12345");
    const mounted = tweetEl.querySelector('[data-typesafe-tweet-id="12345"]');
    expect(mounted).not.toBeNull();
    expect(mounted.textContent).toBe("News");
  });

  it("does not insert duplicate badge if badge for tweet ID already exists", () => {
    const window = new Window();
    const document = window.document;
    const container = document.createElement("div");
    container.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name">
          <span data-typesafe-tweet-id="12345">Insight</span>
        </div>
      </article>
    `;
    const tweetEl = container.querySelector('article[data-testid="tweet"]');
    mountBadge(document, tweetEl, { category: "insight_tutorial", label: "Insight", confidence: 0.9 }, "12345");
    const badges = tweetEl.querySelectorAll('[data-typesafe-tweet-id="12345"]');
    expect(badges.length).toBe(1);
  });
});
```
- [ ] **Step 2: Run test to confirm failure**
Run: `bun test tests/x-badge-renderer.test.js`
- [ ] **Step 3: Implement `src/x-classifier/badge-renderer.js` and `badge.css`**
- [ ] **Step 4: Run test to ensure passing**
Run: `bun test tests/x-badge-renderer.test.js`
- [ ] **Step 5: Commit**
`git add src/x-classifier/badge-renderer.js src/x-classifier/badge.css tests/x-badge-renderer.test.js && git commit -m "feat(classifier): add badge renderer and css styles"`

---

### Task 4: Cache Manager & Storage Layer

**Files:**
- Create: `src/x-classifier/cache-manager.js`
- Test: `tests/x-cache-manager.test.js`

**Interfaces:**
- Consumes: `tweetId` (string), `chrome.storage.local`
- Produces: `getCachedClassification(tweetId): Promise<object | null>`, `setCachedClassification(tweetId, data): Promise<void>`

- [ ] **Step 1: Write failing test for cache resolution and storage fallback**
```javascript
// tests/x-cache-manager.test.js
import { describe, it, expect, beforeEach } from "bun:test";
import { CacheManager } from "../src/x-classifier/cache-manager.js";

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
    await cache.set("tweet-100", { category: "meme_humor", label: "Meme" });
    const res = await cache.get("tweet-100");
    expect(res.label).toBe("Meme");
  });

  it("serves subsequent requests from memory without hitting storage", async () => {
    await cache.set("tweet-200", { category: "news_update", label: "News" });
    mockStorage.get = () => { throw new Error("Should not call storage"); };
    const res = await cache.get("tweet-200");
    expect(res.label).toBe("News");
  });
});
```
- [ ] **Step 2: Run test to confirm failure**
Run: `bun test tests/x-cache-manager.test.js`
- [ ] **Step 3: Implement `src/x-classifier/cache-manager.js`**
In-memory `Map` LRU cache backed by `chrome.storage.local` with namespace key `typesafe_tweet_cache`.
- [ ] **Step 4: Run test to ensure passing**
Run: `bun test tests/x-cache-manager.test.js`
- [ ] **Step 5: Commit**
`git add src/x-classifier/cache-manager.js tests/x-cache-manager.test.js && git commit -m "feat(classifier): add in-memory and local storage cache manager"`

---

### Task 5: Background Service Worker Integration & Build Config

**Files:**
- Modify: `background.js`
- Modify: `manifest.json`
- Modify: `package.json`
- Test: `tests/x-background-handler.test.js`

**Interfaces:**
- Consumes: `chrome.runtime.onMessage` with type `"CLASSIFY_TWEET"`
- Produces: sends response `{ success: true, classification: { category, label, confidence } }`

- [ ] **Step 1: Write test for background message handling**
- [ ] **Step 2: Update `background.js` with `CLASSIFY_TWEET` listener**
- [ ] **Step 3: Update `manifest.json`**
Add `"*://*.x.com/*"`, `"*://*.twitter.com/*"`, `"https://api.typesafe.ai/*"` to host permissions and content scripts.
- [ ] **Step 4: Update `package.json` build script**
Add build pipeline for x-content: `bun build src/x-classifier/content-entry.js --outfile content/x-content.js`.
- [ ] **Step 5: Run tests and verify build**
Run: `bun run build && bun test`
- [ ] **Step 6: Commit**
`git add background.js manifest.json package.json tests/x-background-handler.test.js && git commit -m "feat(classifier): integrate background worker message routing and build configuration"`

---

### Task 6: Content Script Orchestrator & Viewport Dwell Observer

**Files:**
- Create: `src/x-classifier/scroll-observer.js`
- Create: `src/x-classifier/content-entry.js`
- Test: `tests/x-scroll-observer.test.js`

**Interfaces:**
- Consumes: DOM window on `x.com`
- Produces: Observes `article[data-testid="tweet"]`, manages 350ms dwell timer, coordinates cache and classification requests.

- [ ] **Step 1: Write test for dwell observer queue logic**
- [ ] **Step 2: Implement `src/x-classifier/scroll-observer.js` and `src/x-classifier/content-entry.js`**
- [ ] **Step 3: Run full test suite and verify build bundle**
Run: `bun test && bun run build`
- [ ] **Step 4: Verify manual loading package structure**
Check `content/x-content.js`, `manifest.json`, and background registration.
- [ ] **Step 5: Commit**
`git add src/x-classifier/scroll-observer.js src/x-classifier/content-entry.js tests/x-scroll-observer.test.js content/ && git commit -m "feat(classifier): add scroll dwell observer and bundle content script"`
