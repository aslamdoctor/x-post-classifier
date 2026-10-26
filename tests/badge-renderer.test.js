import { describe, it, expect } from "bun:test";
import { Window } from "happy-dom";
import { mountBadge, createBadgeElement } from "../src/badge-renderer.js";

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
    expect(badge.classList.contains("typesafe-post-badge")).toBe(true);
    expect(badge.classList.contains("typesafe-badge-insight")).toBe(true);
    expect(badge.title).toContain("92%");
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
    const mounted = mountBadge(document, tweetEl, {
      category: "news_update",
      label: "News",
      confidence: 0.85
    }, "12345");

    expect(mounted).not.toBeNull();
    const found = tweetEl.querySelector('[data-typesafe-tweet-id="12345"]');
    expect(found).not.toBeNull();
    expect(found.textContent).toBe("News");
    expect(found.classList.contains("typesafe-badge-news")).toBe(true);
  });

  it("does not insert duplicate badge if badge for tweet ID already exists", () => {
    const window = new Window();
    const document = window.document;
    const container = document.createElement("div");

    container.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name">
          <span class="typesafe-post-badge" data-typesafe-tweet-id="12345">Insight</span>
        </div>
      </article>
    `;

    const tweetEl = container.querySelector('article[data-testid="tweet"]');
    mountBadge(document, tweetEl, {
      category: "insight_tutorial",
      label: "Insight",
      confidence: 0.9
    }, "12345");

    const badges = tweetEl.querySelectorAll('[data-typesafe-tweet-id="12345"]');
    expect(badges.length).toBe(1);
  });

  it("updates existing badge if recycled virtual DOM element has different tweet ID", () => {
    const window = new Window();
    const document = window.document;
    const container = document.createElement("div");

    container.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name">
          <span class="typesafe-post-badge typesafe-badge-insight" data-typesafe-tweet-id="old-999">Insight</span>
        </div>
      </article>
    `;

    const tweetEl = container.querySelector('article[data-testid="tweet"]');
    mountBadge(document, tweetEl, {
      category: "meme_humor",
      label: "Meme",
      confidence: 0.95
    }, "new-100");

    const oldBadge = tweetEl.querySelector('[data-typesafe-tweet-id="old-999"]');
    const newBadge = tweetEl.querySelector('[data-typesafe-tweet-id="new-100"]');

    expect(oldBadge).toBeNull();
    expect(newBadge).not.toBeNull();
    expect(newBadge.textContent).toBe("Meme");
    expect(newBadge.classList.contains("typesafe-badge-meme")).toBe(true);
  });

  it("sets data-typesafe-category attribute on tweetElement", () => {
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
      category: "promo_sales",
      label: "Promo",
      confidence: 0.88
    }, "12345");

    expect(tweetEl.getAttribute("data-typesafe-category")).toBe("promo_sales");
  });
});
