/**
 * Extracts structured tweet data from an X.com post element.
 *
 * @param {Element|null} tweetElement The root article element or child of the tweet
 * @returns {{ tweetId: string, authorHandle: string, authorName: string, text: string } | null}
 */
export function extractTweetData(tweetElement) {
  if (!tweetElement) {
    return null;
  }

  // Ensure we are working on the article element if nested
  const article = tweetElement.matches?.('article[data-testid="tweet"]')
    ? tweetElement
    : tweetElement.querySelector?.('article[data-testid="tweet"]') || tweetElement;

  // Extract status permalink to get the unique tweet ID
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

  // Extract tweet text
  const tweetTextEl = article.querySelector?.('[data-testid="tweetText"]');
  const text = tweetTextEl ? tweetTextEl.textContent.trim() : "";

  // Extract author info from User-Name section
  let authorHandle = "";
  let authorName = "";

  const userNameSection = article.querySelector?.('[data-testid="User-Name"]');
  if (userNameSection) {
    const links = Array.from(userNameSection.querySelectorAll("a"));

    // Find handle link (typically contains '@')
    for (const link of links) {
      const linkText = link.textContent.trim();
      if (linkText.startsWith("@")) {
        authorHandle = linkText;
        break;
      }
    }

    // Author name is usually the first link before the handle
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
