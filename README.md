# X Post Type Classifier

Chrome Extension (Manifest V3) that automatically categorizes posts on [x.com](https://x.com) as you scroll your feed, powered by [TypeSafe's](https://typesafe.ai) System One decision model (Jev).

---

## Features

- **Automated Viewport Dwell Detection**: Classifies posts that stay in view for at least 350ms, avoiding unnecessary API calls when scrolling past quickly.
- **Calibrated Intent Classification**: Uses TypeSafe's Jev Choice question primitive to identify post types:
  - **Insight**: Actionable technical knowledge, coding tutorials, guides
  - **News**: Releases, events, announcements
  - **Bait**: Engagement farming, rhetorical questions, controversial hooks
  - **Promo**: Product sales, waitlists, newsletter plugs
  - **Meme**: Satire, jokes, comedic observations
  - **Opinion**: Personal reflections and everyday commentary
- **Unobtrusive Header Badges**: Mounts a compact pill badge directly next to the author handle and timestamp.
- **Two-Tier Caching**: Uses an in-memory LRU cache plus persistent `chrome.storage.local` to prevent redundant classifications across virtualized DOM recycling and feed reloads.

---

## Setup & Development

### 1. Prerequisites
- [Bun](https://bun.sh) (v1.1+)

### 2. Configure Environment
Add your TypeSafe API key to `.env` in the project root:
```bash
TYPESAFE_API_KEY=your_typesafe_api_key_here
```

### 3. Install & Build
```bash
bun install
bun run build
```

### 4. Run Tests
```bash
bun test
```

---

## Load in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select this directory (`x-post-classifier`).
4. Open [x.com](https://x.com) and scroll your feed.
