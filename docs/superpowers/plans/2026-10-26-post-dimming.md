# Post Dimming by Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable users to dim posts on X.com under selected categories via a Chrome toolbar popup, reducing post opacity to 0.25 with full opacity restored on mouse hover.

**Architecture:** Pure CSS dimming driven by document root classes (`html.typesafe-dim-<category>`) matching tweet containers tagged with `data-typesafe-category`. An extension action popup allows toggling categories and persists preferences to `chrome.storage.sync`. A content script dimming manager synchronizes storage changes with document root classes without DOM re-renders.

**Tech Stack:** JavaScript (ES modules), Chrome Extensions Manifest V3, Bun test runner, CSS3.

## Global Constraints

- No auto-commit or auto-push without explicit user confirmation.
- CLI substitutions: use `bun` (never npm/node), `rg` (never grep), `fd` (never find), `sd` (never sed), `jq` for JSON.
- Maintain existing coding style, test patterns, and project structure.

---

### Task 1: DOM Category Tagging on Tweet Elements

**Files:**
- Modify: `src/badge-renderer.js:43-72`
- Test: `tests/badge-renderer.test.js`

**Interfaces:**
- Consumes: `classification.category` (string, e.g. `"promo_sales"`)
- Produces: `tweetElement.getAttribute("data-typesafe-category")` returns category string

- [ ] **Step 1: Write failing test in `tests/badge-renderer.test.js`**

Add test verifying that `mountBadge` sets `data-typesafe-category` on `tweetElement`:

```javascript
test("sets data-typesafe-category attribute on tweetElement", () => {
  const tweetEl = document.createElement("article");
  tweetEl.setAttribute("data-testid", "tweet");
  const userNameEl = document.createElement("div");
  userNameEl.setAttribute("data-testid", "User-Name");
  tweetEl.appendChild(userNameEl);

  mountBadge(document, tweetEl, { category: "promo_sales", label: "Promo", confidence: 0.9 }, "12345");

  expect(tweetEl.getAttribute("data-typesafe-category")).toBe("promo_sales");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/badge-renderer.test.js`  
Expected: FAIL (`expected "promo_sales", got null`)

- [ ] **Step 3: Implement category attribute assignment in `src/badge-renderer.js`**

Update `mountBadge`:
```javascript
export function mountBadge(doc, tweetElement, classification, tweetId) {
  if (!tweetElement || !tweetId) {
    return null;
  }

  if (classification && classification.category) {
    tweetElement.setAttribute?.("data-typesafe-category", classification.category);
  }
  // rest of existing mountBadge logic...
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/badge-renderer.test.js`  
Expected: PASS

---

### Task 2: Dim Manager Module

**Files:**
- Create: `src/dim-manager.js`
- Test: `tests/dim-manager.test.js`

**Interfaces:**
- Consumes: `chrome.storage.sync` or `chrome.storage.local` API object, `Document`
- Produces:
  - `applyDimmedCategories(rootElement, categories)`: Updates `typesafe-dim-<category>` classes on element
  - `initDimManager(doc, storage)`: Initializes storage retrieval, listener, and returns controller `{ disconnect, getActiveCategories }`

- [ ] **Step 1: Write failing unit tests in `tests/dim-manager.test.js`**

```javascript
import { describe, test, expect, beforeEach } from "bun:test";
import { applyDimmedCategories, initDimManager, ALL_CATEGORIES } from "../src/dim-manager.js";

describe("Dim Manager", () => {
  let doc;

  beforeEach(() => {
    doc = {
      documentElement: {
        classList: new Set(),
      }
    };
    doc.documentElement.classList.add = (c) => doc.documentElement.classList.add_(c);
    doc.documentElement.classList.remove = (c) => doc.documentElement.classList.delete(c);
    doc.documentElement.classList.contains = (c) => doc.documentElement.classList.has(c);
  });

  test("applyDimmedCategories updates root classes accurately", () => {
    const root = document.createElement("html");
    applyDimmedCategories(root, ["promo_sales", "engagement_bait"]);

    expect(root.classList.contains("typesafe-dim-promo_sales")).toBe(true);
    expect(root.classList.contains("typesafe-dim-engagement_bait")).toBe(true);
    expect(root.classList.contains("typesafe-dim-insight_tutorial")).toBe(false);

    // Update with new set
    applyDimmedCategories(root, ["insight_tutorial"]);
    expect(root.classList.contains("typesafe-dim-promo_sales")).toBe(false);
    expect(root.classList.contains("typesafe-dim-insight_tutorial")).toBe(true);
  });

  test("initDimManager loads initial categories from storage and listens for changes", async () => {
    const root = document.createElement("html");
    const mockDoc = { documentElement: root };

    let changeListener = null;
    const mockStorage = {
      sync: {
        get: (key, cb) => cb({ dimmedCategories: ["meme_humor"] })
      },
      onChanged: {
        addListener: (fn) => { changeListener = fn; },
        removeListener: (fn) => { changeListener = null; }
      }
    };

    const manager = initDimManager(mockDoc, mockStorage);
    expect(root.classList.contains("typesafe-dim-meme_humor")).toBe(true);

    // Simulate storage change event
    changeListener({
      dimmedCategories: {
        newValue: ["news_update"]
      }
    }, "sync");

    expect(root.classList.contains("typesafe-dim-meme_humor")).toBe(false);
    expect(root.classList.contains("typesafe-dim-news_update")).toBe(true);

    manager.disconnect();
    expect(changeListener).toBe(null);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/dim-manager.test.js`  
Expected: FAIL (`Cannot find module ../src/dim-manager.js`)

- [ ] **Step 3: Implement `src/dim-manager.js`**

```javascript
export const ALL_CATEGORIES = [
  "insight_tutorial",
  "news_update",
  "engagement_bait",
  "promo_sales",
  "meme_humor",
  "personal_opinion"
];

export function applyDimmedCategories(rootElement, categories = []) {
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

export function initDimManager(doc = document, storage = (typeof chrome !== "undefined" ? chrome.storage : null)) {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test tests/dim-manager.test.js`  
Expected: PASS

---

### Task 3: Dimming CSS Rules

**Files:**
- Modify: `src/badge.css`

**Interfaces:**
- Produces: CSS selectors for dimming and hover states on `article[data-testid="tweet"]`

- [ ] **Step 1: Add dimming CSS rules to `src/badge.css`**

Add at the bottom of `src/badge.css`:
```css
/* Post Dimming Styles */
article[data-testid="tweet"][data-typesafe-category] {
  transition: opacity 0.2s ease;
}

html.typesafe-dim-insight_tutorial article[data-testid="tweet"][data-typesafe-category="insight_tutorial"],
html.typesafe-dim-news_update article[data-testid="tweet"][data-typesafe-category="news_update"],
html.typesafe-dim-engagement_bait article[data-testid="tweet"][data-typesafe-category="engagement_bait"],
html.typesafe-dim-promo_sales article[data-testid="tweet"][data-typesafe-category="promo_sales"],
html.typesafe-dim-meme_humor article[data-testid="tweet"][data-typesafe-category="meme_humor"],
html.typesafe-dim-personal_opinion article[data-testid="tweet"][data-typesafe-category="personal_opinion"] {
  opacity: 0.25;
}

html.typesafe-dim-insight_tutorial article[data-testid="tweet"][data-typesafe-category="insight_tutorial"]:hover,
html.typesafe-dim-news_update article[data-testid="tweet"][data-typesafe-category="news_update"]:hover,
html.typesafe-dim-engagement_bait article[data-testid="tweet"][data-typesafe-category="engagement_bait"]:hover,
html.typesafe-dim-promo_sales article[data-testid="tweet"][data-typesafe-category="promo_sales"]:hover,
html.typesafe-dim-meme_humor article[data-testid="tweet"][data-typesafe-category="meme_humor"]:hover,
html.typesafe-dim-personal_opinion article[data-testid="tweet"][data-typesafe-category="personal_opinion"]:hover {
  opacity: 1;
}
```

- [ ] **Step 2: Verify existing tests and bundle copy**

Run: `bun run build`  
Expected: `cp src/badge.css content/badge.css` succeeds without errors.

---

### Task 4: Content Script Integration

**Files:**
- Modify: `src/content-entry.js`

**Interfaces:**
- Consumes: `initDimManager` from `./dim-manager.js`
- Produces: Connected dimming manager initialized when `initXClassifier` is invoked

- [ ] **Step 1: Update `src/content-entry.js` to initialize dim manager**

Import `initDimManager` at top of `src/content-entry.js`:
```javascript
import { initDimManager } from "./dim-manager.js";
```
Inside `initXClassifier(doc, runtime, storage = (typeof chrome !== "undefined" ? chrome.storage : null))`:
Initialize:
```javascript
const dimManager = initDimManager(doc, storage);
```
Add `dimManager` and its disconnect to returned controller:
```javascript
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
```

- [ ] **Step 2: Run all unit and structure tests**

Run: `bun test`  
Expected: PASS

---

### Task 5: Toolbar Popup UI and Manifest Configuration

**Files:**
- Create: `popup/popup.html`
- Create: `popup/popup.css`
- Create: `popup/popup.js`
- Modify: `manifest.json`
- Test: `tests/popup.test.js`, `tests/manifest.test.js`

**Interfaces:**
- Consumes: `chrome.storage.sync` (or `chrome.storage.local`)
- Produces: Interactive settings popup allowing toggle of 6 categories

- [ ] **Step 1: Write unit tests in `tests/popup.test.js`**

Test logic that initializes checkbox states from storage and saves checked categories on change:
```javascript
import { describe, test, expect } from "bun:test";
import { setupPopup } from "../popup/popup.js";

describe("Popup Settings UI", () => {
  test("initializes checkboxes according to stored categories", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <input type="checkbox" id="cat-insight_tutorial" value="insight_tutorial">
      <input type="checkbox" id="cat-promo_sales" value="promo_sales">
    `;

    const mockStorage = {
      sync: {
        get: (key, cb) => cb({ dimmedCategories: ["promo_sales"] }),
        set: () => {}
      }
    };

    setupPopup(container, mockStorage);

    const insight = container.querySelector("#cat-insight_tutorial");
    const promo = container.querySelector("#cat-promo_sales");
    expect(insight.checked).toBe(false);
    expect(promo.checked).toBe(true);
  });

  test("saves selected categories on checkbox change", () => {
    const container = document.createElement("div");
    container.innerHTML = `
      <input type="checkbox" id="cat-insight_tutorial" value="insight_tutorial">
      <input type="checkbox" id="cat-promo_sales" value="promo_sales">
    `;

    let savedData = null;
    const mockStorage = {
      sync: {
        get: (key, cb) => cb({ dimmedCategories: [] }),
        set: (data) => { savedData = data; }
      }
    };

    setupPopup(container, mockStorage);

    const promo = container.querySelector("#cat-promo_sales");
    promo.checked = true;
    promo.dispatchEvent(new Event("change"));

    expect(savedData).toEqual({ dimmedCategories: ["promo_sales"] });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test tests/popup.test.js`  
Expected: FAIL (`Cannot find module ../popup/popup.js`)

- [ ] **Step 3: Create `popup/popup.js`, `popup/popup.html`, `popup/popup.css`**

Implement `popup/popup.js`:
```javascript
export const TAXONOMY = [
  { id: "insight_tutorial", label: "Insight", color: "#1d9bf0" },
  { id: "news_update", label: "News", color: "#00ba7c" },
  { id: "engagement_bait", label: "Engagement Bait", color: "#f91880" },
  { id: "promo_sales", label: "Promo / Sales", color: "#ff7a00" },
  { id: "meme_humor", label: "Meme / Humor", color: "#7856ff" },
  { id: "personal_opinion", label: "Personal Opinion", color: "#71767b" }
];

export function setupPopup(root = document, storage = (typeof chrome !== "undefined" ? chrome.storage : null)) {
  const storageArea = storage?.sync || storage?.local || null;
  const checkboxes = root.querySelectorAll('input[type="checkbox"][data-category]');

  if (storageArea && typeof storageArea.get === "function") {
    storageArea.get("dimmedCategories", (result) => {
      const active = new Set(result?.dimmedCategories || []);
      for (const cb of checkboxes) {
        cb.checked = active.has(cb.getAttribute("data-category"));
      }
    });
  }

  function saveChanges() {
    const selected = [];
    for (const cb of checkboxes) {
      if (cb.checked) {
        selected.push(cb.getAttribute("data-category"));
      }
    }
    if (storageArea && typeof storageArea.set === "function") {
      storageArea.set({ dimmedCategories: selected });
    }
  }

  for (const cb of checkboxes) {
    cb.addEventListener("change", saveChanges);
  }
}

if (typeof window !== "undefined" && typeof document !== "undefined" && document.querySelector(".typesafe-popup-container")) {
  setupPopup(document);
}
```

Implement `popup/popup.html` and `popup/popup.css`.

- [ ] **Step 4: Update `manifest.json` to register `"action"`**

Add `"action"` field in `manifest.json`:
```json
"action": {
  "default_popup": "popup/popup.html",
  "default_icon": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

- [ ] **Step 5: Run tests and manifest checks**

Run: `bun test`  
Expected: PASS

---

### Task 6: Full Build and E2E Verification

**Files:**
- Test: `tests/e2e-structure.test.js`

- [ ] **Step 1: Verify bundle build**

Run: `bun run build`  
Expected: Build succeeds, bundle written to `content/content.js`.

- [ ] **Step 2: Run complete test suite**

Run: `bun test`  
Expected: All tests pass.
