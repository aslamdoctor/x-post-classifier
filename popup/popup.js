export const TAXONOMY = [
  { id: "insight_tutorial", label: "Insight", color: "#1d9bf0" },
  { id: "news_update", label: "News", color: "#00ba7c" },
  { id: "engagement_bait", label: "Engagement Bait", color: "#f91880" },
  { id: "promo_sales", label: "Promo / Sales", color: "#ff7a00" },
  { id: "meme_humor", label: "Meme / Humor", color: "#7856ff" },
  { id: "personal_opinion", label: "Personal Opinion", color: "#71767b" }
];

export function setupPopup(
  root = typeof document !== "undefined" ? document : null,
  storage = typeof chrome !== "undefined" ? chrome.storage : null
) {
  if (!root || typeof root.querySelectorAll !== "function") {
    return;
  }

  const storageArea = storage?.sync || storage?.local || null;
  const checkboxes = root.querySelectorAll('input[type="checkbox"][data-category], input[type="checkbox"][value]');

  const getCategory = (cb) => {
    return cb.getAttribute("data-category") || (cb.value && cb.value !== "on" ? cb.value : null) || cb.id?.replace(/^cat-/, "");
  };

  if (storageArea && typeof storageArea.get === "function") {
    storageArea.get("dimmedCategories", (result) => {
      const active = new Set(result?.dimmedCategories || []);
      for (const cb of checkboxes) {
        const cat = getCategory(cb);
        if (cat) {
          cb.checked = active.has(cat);
        }
      }
    });
  }

  function saveChanges() {
    const selected = [];
    for (const cb of checkboxes) {
      const cat = getCategory(cb);
      if (cb.checked && cat && !selected.includes(cat)) {
        selected.push(cat);
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

if (typeof window !== "undefined" && typeof document !== "undefined") {
  const init = () => {
    if (document.querySelector(".typesafe-popup-container")) {
      setupPopup(document);
    }
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}
