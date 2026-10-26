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

export function initDimManager(
  doc = typeof document !== "undefined" ? document : null,
  storage = typeof chrome !== "undefined" ? chrome.storage : null
) {
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
