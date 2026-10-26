import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { Window } from "happy-dom";
import { TweetDwellObserver } from "../src/scroll-observer.js";

describe("Tweet Dwell Observer", () => {
  let window;
  let document;

  beforeEach(() => {
    window = new Window();
    document = window.document;
  });

  it("triggers callback when element dwells in viewport past threshold", async () => {
    let dwelledElements = [];

    // Mock IntersectionObserver
    let observerCallback = null;
    class MockIntersectionObserver {
      constructor(cb) {
        observerCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    const dwellObserver = new TweetDwellObserver({
      dwellMs: 50,
      onDwell: (el) => {
        dwelledElements.push(el);
      },
      ObserverClass: MockIntersectionObserver
    });

    const el = document.createElement("article");
    dwellObserver.observe(el);

    // Simulate entering viewport
    observerCallback([{ target: el, isIntersecting: true }]);

    // Before dwell timeout
    expect(dwelledElements.length).toBe(0);

    // Wait past dwell timeout
    await new Promise((r) => setTimeout(r, 70));

    expect(dwelledElements.length).toBe(1);
    expect(dwelledElements[0]).toBe(el);

    dwellObserver.disconnect();
  });

  it("cancels callback if element exits viewport before dwell threshold", async () => {
    let dwelledElements = [];
    let observerCallback = null;

    class MockIntersectionObserver {
      constructor(cb) {
        observerCallback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    const dwellObserver = new TweetDwellObserver({
      dwellMs: 60,
      onDwell: (el) => {
        dwelledElements.push(el);
      },
      ObserverClass: MockIntersectionObserver
    });

    const el = document.createElement("article");
    dwellObserver.observe(el);

    // Enters viewport
    observerCallback([{ target: el, isIntersecting: true }]);

    // Exits viewport before 60ms
    await new Promise((r) => setTimeout(r, 20));
    observerCallback([{ target: el, isIntersecting: false }]);

    // Wait past the original 60ms
    await new Promise((r) => setTimeout(r, 60));

    expect(dwelledElements.length).toBe(0);
    dwellObserver.disconnect();
  });
});
