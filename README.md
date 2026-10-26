# X Post Type Classifier

Chrome Extension (Manifest V3) that categorizes posts on [x.com](https://x.com) as you scroll your feed, powered by [TypeSafe's](https://typesafe.ai) System One decision model (Jev).

https://github.com/user-attachments/assets/7d6fa6d4-3b94-4454-a312-5d9b7f8e86bf

---

## Features

- **Automated Viewport Dwell Detection**: Classifies posts that dwell in view for at least 350ms, avoiding unnecessary API calls when scrolling past quickly.
- **Intent Classification**: Uses TypeSafe's Jev Choice question primitive to identify post types:
  - **Insight**: Actionable technical knowledge, coding tutorials, guides
  - **News**: Releases, events, announcements
  - **Bait**: Engagement farming, rhetorical questions, controversial hooks
  - **Promo**: Product sales, waitlists, newsletter plugs
  - **Meme**: Satire, jokes, comedic observations
  - **Opinion**: Personal reflections and everyday commentary
- **Header Badges**: Mounts a compact pill badge directly next to the author handle and timestamp.
- **Two-Tier Caching**: Uses an in-memory cache plus persistent `chrome.storage.local` to prevent redundant classifications across virtualized DOM recycling and feed reloads.
- **Post Dimming by Category**: Dims posts under selected categories (e.g. Engagement Bait, Promo) to 0.25 opacity. Hovering over a dimmed post restores full opacity.
- **Toolbar Settings Popup**: Select which categories to dim directly from the Chrome toolbar action popup. Selections apply immediately to open tabs through `chrome.storage.sync`.

---

## Setup & Development

### 1. Prerequisites
- [Bun](https://bun.sh) (v1.1+)

### 2. Configure Environment
Copy `.env.example` to `.env` and add your TypeSafe API key:
```bash
cp .env.example .env
```
Then edit `.env`:
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
2. Enable **Developer mode** using the top right toggle.
3. Click **Load unpacked** and select this directory (`x-post-classifier`).
4. Open [x.com](https://x.com) and scroll your feed.
5. Click the extension icon in the Chrome toolbar to choose which categories to dim.
