# Post Dimming by Category Design

**Date:** 2026-10-26  
**Status:** Approved  
**Topic:** Dimming X.com posts under checked/selected classification categories

---

## 1. Objective

Allow users to dim posts on X.com categorized under specific types (e.g. Engagement Bait, Promo/Sales) by reducing post opacity to 0.25 so they are only partially visible, while restoring full opacity when hovering over the dimmed post.

---

## 2. Architecture & Data Flow

```
+-----------------------------------------------------------+
| Chrome Toolbar Action Popup (popup/popup.html, popup.js)   |
| - Checkbox toggle per category                             |
| - Reads & saves dimmed categories to chrome.storage.sync   |
+-----------------------------+-----------------------------+
                              |
                              v chrome.storage.onChanged
+-----------------------------------------------------------+
| Content Script (src/content-entry.js, src/dim-manager.js) |
| - Listens to storage changes                              |
| - Sets active dimming classes on document.documentElement |
|   e.g. html.typesafe-dim-promo_sales                      |
| - Tags each tweet container upon classification:          |
|   article[data-typesafe-category="promo_sales"]           |
+-----------------------------+-----------------------------+
                              |
                              v CSS Engine (src/badge.css)
+-----------------------------------------------------------+
| Pure CSS Rules:                                           |
| - Default: opacity 0.25 when category class matches       |
| - Hover: opacity 1 on mouse hover                         |
| - Smooth transition for opacity changes                   |
+-----------------------------------------------------------+
```

---

## 3. Storage & Configuration

- **Storage Location**: `chrome.storage.sync` with fallback to `chrome.storage.local`.
- **Key**: `dimmedCategories`
- **Value**: Array of category identifiers, e.g. `["engagement_bait", "promo_sales"]`.
- **Default**: `[]` (empty array, meaning no categories are dimmed initially).

Taxonomy categories:
- `insight_tutorial`: Insight
- `news_update`: News
- `engagement_bait`: Bait
- `promo_sales`: Promo
- `meme_humor`: Meme
- `personal_opinion`: Opinion

---

## 4. UI/UX Specifications

### 4.1 Toolbar Popup (`popup/popup.html`, `popup/popup.js`, `popup/popup.css`)
- Registered in `manifest.json` under `"action"`.
- Clean, compact popup styling matching modern dark/light system aesthetics.
- Includes a title header ("Dim Posts by Category") and explanatory helper text.
- Renders a checkbox list corresponding to the six taxonomy categories.
- Each list item displays a colored accent indicator matching the badge colors.
- Toggling any checkbox immediately updates `chrome.storage.sync`.

### 4.2 Content Script & DOM Tagging
- When `mountBadge` is called on a tweet element, it assigns `data-typesafe-category="<category>"` to `tweetElement`.
- `dim-manager.js` synchronizes the `dimmedCategories` array with CSS classes on `document.documentElement`:
  `typesafe-dim-<category>`.
- Reacts dynamically to `chrome.storage.onChanged` events so changes in the popup take effect immediately in all open tabs without a page refresh.

### 4.3 Styling & Hover Effect (`src/badge.css`)
- Base transition on classified tweets:
  `article[data-testid="tweet"][data-typesafe-category] { transition: opacity 0.2s ease; }`
- Matching rule for dimmed posts:
  `html.typesafe-dim-<category> article[data-testid="tweet"][data-typesafe-category="<category>"] { opacity: 0.25; }`
- Hover restoration:
  `html.typesafe-dim-<category> article[data-testid="tweet"][data-typesafe-category="<category>"]:hover { opacity: 1; }`

---

## 5. Testing & Verification

1. **Unit Tests (`bun test`)**:
   - `tests/dim-manager.test.js`: Validates document root class updating, storage loading, and storage change subscription handling.
   - `tests/badge-renderer.test.js`: Confirms `mountBadge` sets the `data-typesafe-category` attribute on tweet containers.
   - `tests/manifest.test.js` & `tests/e2e-structure.test.js`: Verifies `action` section in `manifest.json` and popup asset existence.
2. **Build Verification**:
   - `bun run build` generates updated bundle in `content/content.js` and copies `src/badge.css` to `content/badge.css`.
