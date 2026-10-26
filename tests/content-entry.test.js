import { describe, expect, test } from "bun:test";
import fs from "fs";
import path from "path";
import { Window } from "happy-dom";

describe("Content Script Entry Integration", () => {
  const root = path.resolve(import.meta.dir, "..");
  const contentJs = fs.readFileSync(path.join(root, "content/content.js"), "utf-8");

  function getInitXClassifier(window, doc) {
    const fn = new Function(
      "document",
      "chrome",
      "window",
      "MutationObserver",
      `${contentJs}; return initXClassifier;`
    );
    return fn(doc, {}, window, window.MutationObserver);
  }

  test("bundles initDimManager into content.js", () => {
    expect(contentJs.includes("initDimManager")).toBe(true);
    expect(contentJs.includes("dimManager.disconnect()")).toBe(true);
  });

  test("initXClassifier initializes dimManager and applies initial categories", () => {
    const window = new Window();
    const doc = window.document;

    const mockStorage = {
      sync: {
        get: (key, cb) => cb({ dimmedCategories: ["promo_sales", "meme_humor"] })
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {}
      }
    };
    const mockRuntime = {
      sendMessage: () => {}
    };

    const initXClassifier = getInitXClassifier(window, doc);
    const classifier = initXClassifier(doc, mockRuntime, mockStorage);

    expect(classifier).toBeDefined();
    expect(classifier.dimManager).toBeDefined();
    expect(classifier.dimManager.getActiveCategories()).toEqual(["promo_sales", "meme_humor"]);
    expect(doc.documentElement.classList.contains("typesafe-dim-promo_sales")).toBe(true);
    expect(doc.documentElement.classList.contains("typesafe-dim-meme_humor")).toBe(true);
    expect(doc.documentElement.classList.contains("typesafe-dim-insight_tutorial")).toBe(false);

    classifier.disconnect();
  });

  test("initXClassifier disconnect cleans up dimManager and observers", () => {
    const window = new Window();
    const doc = window.document;

    let removedListener = false;
    const mockStorage = {
      sync: {
        get: (key, cb) => cb({ dimmedCategories: ["engagement_bait"] })
      },
      onChanged: {
        addListener: () => {},
        removeListener: () => {
          removedListener = true;
        }
      }
    };
    const mockRuntime = {
      sendMessage: () => {}
    };

    const initXClassifier = getInitXClassifier(window, doc);
    const classifier = initXClassifier(doc, mockRuntime, mockStorage);

    let dwellDisconnected = false;
    let mutationDisconnected = false;
    classifier.dwellObserver.disconnect = () => {
      dwellDisconnected = true;
    };
    classifier.mutationObserver.disconnect = () => {
      mutationDisconnected = true;
    };

    classifier.disconnect();

    expect(dwellDisconnected).toBe(true);
    expect(mutationDisconnected).toBe(true);
    expect(removedListener).toBe(true);
  });
});
