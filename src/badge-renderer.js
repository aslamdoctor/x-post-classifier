const CATEGORY_CLASS_MAP = {
  insight_tutorial: "typesafe-badge-insight",
  news_update: "typesafe-badge-news",
  engagement_bait: "typesafe-badge-bait",
  promo_sales: "typesafe-badge-promo",
  meme_humor: "typesafe-badge-meme",
  personal_opinion: "typesafe-badge-opinion"
};

/**
 * Creates a badge element for a given classification.
 *
 * @param {Document} doc
 * @param {{ category: string, label: string, confidence: number }} classification
 * @param {string} tweetId
 * @returns {HTMLElement}
 */
export function createBadgeElement(doc, classification, tweetId) {
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

/**
 * Injects or updates the badge into the tweet's header line.
 *
 * @param {Document} doc
 * @param {Element} tweetElement
 * @param {{ category: string, label: string, confidence: number }} classification
 * @param {string} tweetId
 * @returns {HTMLElement|null}
 */
export function mountBadge(doc, tweetElement, classification, tweetId) {
  if (!tweetElement || !tweetId) {
    return null;
  }

  if (classification?.category) {
    tweetElement.setAttribute("data-typesafe-category", classification.category);
  }

  const mountTarget = tweetElement.querySelector?.('[data-testid="User-Name"]') ||
                      tweetElement.querySelector?.('[data-testid="tweetText"]') ||
                      tweetElement;

  if (!mountTarget) {
    return null;
  }

  // Check for any existing badge in this tweet container
  const existingBadge = tweetElement.querySelector?.("[data-typesafe-tweet-id]");
  if (existingBadge) {
    const existingId = existingBadge.getAttribute("data-typesafe-tweet-id");
    if (existingId === tweetId) {
      // Already mounted for this exact tweet ID
      return existingBadge;
    }
    // Element recycled by virtual DOM: remove previous badge
    existingBadge.remove();
  }

  const badge = createBadgeElement(doc, classification, tweetId);
  mountTarget.appendChild(badge);

  return badge;
}
