import { describe, it, expect } from "bun:test";
import { Window } from "happy-dom";
import { extractTweetData } from "../src/dom-extractor.js";

describe("DOM Extractor Utility", () => {
  it("extracts tweet ID, handle, author name, and text from standard X tweet", () => {
    const window = new Window();
    const document = window.document;
    const container = document.createElement("div");

    container.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name">
          <a href="/vishalsingh2972">
            <span><span>Vishal Singh</span></span>
          </a>
          <a href="/vishalsingh2972">
            <span>@vishalsingh2972</span>
          </a>
          <a href="/vishalsingh2972/status/2114383418960265708">
            <time datetime="2026-10-25T15:47:45.000Z">15h</time>
          </a>
        </div>
        <div data-testid="tweetText">
          <span>there's so much gold on the Chinese GitHub 🔥</span>
        </div>
      </article>
    `;

    const tweetEl = container.querySelector('article[data-testid="tweet"]');
    const result = extractTweetData(tweetEl);

    expect(result).not.toBeNull();
    expect(result.tweetId).toBe("2114383418960265708");
    expect(result.authorHandle).toBe("@vishalsingh2972");
    expect(result.authorName).toBe("Vishal Singh");
    expect(result.text).toBe("there's so much gold on the Chinese GitHub 🔥");
  });

  it("handles media-only tweets without tweetText gracefully", () => {
    const window = new Window();
    const document = window.document;
    const container = document.createElement("div");

    container.innerHTML = `
      <article data-testid="tweet">
        <div data-testid="User-Name">
          <a href="/photographer"><span>Photo Master</span></a>
          <a href="/photographer"><span>@photographer</span></a>
          <a href="/photographer/status/987654321"><time>2m</time></a>
        </div>
      </article>
    `;

    const tweetEl = container.querySelector('article[data-testid="tweet"]');
    const result = extractTweetData(tweetEl);

    expect(result).not.toBeNull();
    expect(result.tweetId).toBe("987654321");
    expect(result.text).toBe("");
  });

  it("returns null when status permalink is missing", () => {
    const window = new Window();
    const document = window.document;
    const container = document.createElement("div");

    container.innerHTML = `
      <article data-testid="tweet">
        <div>Promoted Ad content</div>
      </article>
    `;

    const tweetEl = container.querySelector('article[data-testid="tweet"]');
    const result = extractTweetData(tweetEl);
    expect(result).toBeNull();
  });

  it("returns null when passed null or empty element", () => {
    expect(extractTweetData(null)).toBeNull();
  });
});
