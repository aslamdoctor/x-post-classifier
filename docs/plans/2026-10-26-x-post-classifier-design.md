# X.com Post Type Classifier Design

**Date:** 2026-10-26  
**Status:** Approved  
**Topic:** Automated Post Intent/Type Classification on X.com via TypeSafe (Jev)

---

## 1. Objective

Provide automated classification tags for posts on x.com as the user scrolls their feed. The extension reviews visible posts, queries TypeSafe's Jev model using structured Choice questions, and renders an unobtrusive badge in the post header identifying the content type (e.g. Insight, News, Engagement Bait, Promo, Meme, Personal).

---

## 2. Architecture

```
[Content Script (x.com)]
  ├── MutationObserver: Detects new `article[data-testid="tweet"]` elements
  ├── IntersectionObserver: Identifies tweets dwelling in viewport >= 350ms
  ├── DOM Parser: Extracts tweet ID, author handle, and text
  └── UI Injector: Mounts category badge pill beside author handle and timestamp
          │
          ▼ chrome.runtime.sendMessage
[Background Service Worker (background.js)]
  ├── Cache Manager: In-memory Map + chrome.storage.local (keyed by tweet ID)
  ├── Rate Limiter / Debouncer: Prevents spamming API requests
  └── TypeSafe Client: HTTP POST to https://api.typesafe.ai/v1/ask using TYPESAFE_API_KEY
```

---

## 3. TypeSafe Question & Taxonomy

### State Structure
```json
{
  "author_handle": "@vishalsingh2972",
  "author_name": "Vishal Singh",
  "text": "there's so much gold on the Chinese GitHub..."
}
```

### Choice Question Spec
- **Question ID**: `post_type`
- **Type**: `choice`
- **Question**: `"What is the primary intent or type of this post?"`
- **Options**:
  - `insight_tutorial`: Actionable knowledge, technical breakdown, coding tips, or educational guides.
  - `news_update`: Reporting releases, events, company announcements, or current affairs.
  - `engagement_bait`: Generic questions, controversial hooks, or follower traps designed to drive replies.
  - `promo_sales`: Selling or promoting a product, course, newsletter, waitlist, or paid service.
  - `meme_humor`: Jokes, satire, shitposts, funny observations, or comedic images.
  - `personal_opinion`: Personal life updates, thoughts, commentary, or unverified reflections.

---

## 4. UI/UX Specifications

- **Location**: Injected directly into the `div[data-testid="User-Name"]` container, beside the dot separator and timestamp link.
- **Badge Anatomy**:
  - Small pill container with border radius, subtle background tint, and contrasting text.
  - Category labels:
    - `insight_tutorial` -> "Insight" (Blue accent)
    - `news_update` -> "News" (Green accent)
    - `engagement_bait` -> "Bait" (Red/Orange accent)
    - `promo_sales` -> "Promo" (Amber accent)
    - `meme_humor` -> "Meme" (Purple accent)
    - `personal_opinion` -> "Opinion" (Gray accent)
- **Virtualized DOM Handling**: Badges carry a `data-typesafe-tweet-id` attribute. When X recycles virtualized nodes, observers disconnect cleanly and re-render only if needed.

---

## 5. Security & Error Handling

- **API Key Protection**: Key stays in extension background script / environment configuration, not injected into page scripts.
- **Fail-safe**: Network errors or API rate limits (429) fail silently without throwing console spam or breaking native tweet elements.
- **Cache Persistence**: Results are saved to `chrome.storage.local` to prevent repeated calls across sessions or feed reloads.

---

## 6. Testing Strategy

1. **Unit tests (`bun test`)**:
   - Extractors: Test HTML parsing on sample X tweet DOM structure.
   - TypeSafe payload & response formatting.
   - Cache resolution logic.
2. **Integration / Manual verification**:
   - Test in Chrome with unpacked extension on active x.com feeds.
