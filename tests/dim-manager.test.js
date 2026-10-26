import { describe, it, expect, beforeEach } from "bun:test";
import { Window } from "happy-dom";
import { applyDimmedCategories, initDimManager, ALL_CATEGORIES } from "../src/dim-manager.js";

describe("Dim Manager Module", () => {
  let window;
  let document;

  beforeEach(() => {
    window = new Window();
    document = window.document;
  });

  describe("ALL_CATEGORIES", () => {
    it("contains all 6 taxonomy categories", () => {
      expect(ALL_CATEGORIES).toEqual([
        "insight_tutorial",
        "news_update",
        "engagement_bait",
        "promo_sales",
        "meme_humor",
        "personal_opinion"
      ]);
    });
  });

  describe("applyDimmedCategories", () => {
    it("adds typesafe-dim-<category> classes for specified categories", () => {
      const root = document.documentElement;
      applyDimmedCategories(root, ["promo_sales", "engagement_bait"]);

      expect(root.classList.contains("typesafe-dim-promo_sales")).toBe(true);
      expect(root.classList.contains("typesafe-dim-engagement_bait")).toBe(true);
      expect(root.classList.contains("typesafe-dim-insight_tutorial")).toBe(false);
      expect(root.classList.contains("typesafe-dim-news_update")).toBe(false);
      expect(root.classList.contains("typesafe-dim-meme_humor")).toBe(false);
      expect(root.classList.contains("typesafe-dim-personal_opinion")).toBe(false);
    });

    it("removes classes when categories are deselected in subsequent calls", () => {
      const root = document.documentElement;
      applyDimmedCategories(root, ["promo_sales", "engagement_bait"]);
      expect(root.classList.contains("typesafe-dim-promo_sales")).toBe(true);

      applyDimmedCategories(root, ["insight_tutorial"]);
      expect(root.classList.contains("typesafe-dim-promo_sales")).toBe(false);
      expect(root.classList.contains("typesafe-dim-engagement_bait")).toBe(false);
      expect(root.classList.contains("typesafe-dim-insight_tutorial")).toBe(true);
    });

    it("clears all dimming classes when passed empty array", () => {
      const root = document.documentElement;
      applyDimmedCategories(root, ["meme_humor", "news_update"]);
      applyDimmedCategories(root, []);

      for (const cat of ALL_CATEGORIES) {
        expect(root.classList.contains(`typesafe-dim-${cat}`)).toBe(false);
      }
    });

    it("handles null, undefined, or missing classList gracefully", () => {
      expect(() => applyDimmedCategories(null, ["promo_sales"])).not.toThrow();
      expect(() => applyDimmedCategories({}, ["promo_sales"])).not.toThrow();
      expect(() => applyDimmedCategories(document.documentElement, null)).not.toThrow();
      expect(() => applyDimmedCategories(document.documentElement, undefined)).not.toThrow();
    });
  });

  describe("initDimManager", () => {
    it("loads initial categories from storage.sync and applies them", () => {
      const root = document.documentElement;
      let changeListener = null;
      const mockStorage = {
        sync: {
          get: (key, cb) => {
            expect(key).toBe("dimmedCategories");
            cb({ dimmedCategories: ["meme_humor", "promo_sales"] });
          }
        },
        onChanged: {
          addListener: (fn) => { changeListener = fn; },
          removeListener: (fn) => { changeListener = null; }
        }
      };

      const manager = initDimManager(document, mockStorage);
      expect(root.classList.contains("typesafe-dim-meme_humor")).toBe(true);
      expect(root.classList.contains("typesafe-dim-promo_sales")).toBe(true);
      expect(manager.getActiveCategories()).toEqual(["meme_humor", "promo_sales"]);

      manager.disconnect();
      expect(changeListener).toBe(null);
    });

    it("falls back to storage.local when storage.sync is not present", () => {
      const root = document.documentElement;
      const mockStorage = {
        local: {
          get: (key, cb) => {
            cb({ dimmedCategories: ["news_update"] });
          }
        }
      };

      const manager = initDimManager(document, mockStorage);
      expect(root.classList.contains("typesafe-dim-news_update")).toBe(true);
      expect(manager.getActiveCategories()).toEqual(["news_update"]);
    });

    it("listens for storage.onChanged events and dynamically updates root classes", () => {
      const root = document.documentElement;
      let changeListener = null;
      const mockStorage = {
        sync: {
          get: (key, cb) => cb({ dimmedCategories: ["insight_tutorial"] })
        },
        onChanged: {
          addListener: (fn) => { changeListener = fn; },
          removeListener: (fn) => { changeListener = null; }
        }
      };

      const manager = initDimManager(document, mockStorage);
      expect(root.classList.contains("typesafe-dim-insight_tutorial")).toBe(true);
      expect(manager.getActiveCategories()).toEqual(["insight_tutorial"]);

      // Simulate onChanged event
      changeListener({
        dimmedCategories: {
          newValue: ["promo_sales", "personal_opinion"]
        }
      }, "sync");

      expect(root.classList.contains("typesafe-dim-insight_tutorial")).toBe(false);
      expect(root.classList.contains("typesafe-dim-promo_sales")).toBe(true);
      expect(root.classList.contains("typesafe-dim-personal_opinion")).toBe(true);
      expect(manager.getActiveCategories()).toEqual(["promo_sales", "personal_opinion"]);

      // Disconnect stops listening
      manager.disconnect();
      expect(changeListener).toBe(null);
    });

    it("ignores storage changes that do not contain dimmedCategories", () => {
      const root = document.documentElement;
      let changeListener = null;
      const mockStorage = {
        sync: {
          get: (key, cb) => cb({ dimmedCategories: ["news_update"] })
        },
        onChanged: {
          addListener: (fn) => { changeListener = fn; },
          removeListener: (fn) => { changeListener = null; }
        }
      };

      const manager = initDimManager(document, mockStorage);
      expect(manager.getActiveCategories()).toEqual(["news_update"]);

      // Unrelated change
      changeListener({
        otherSetting: { newValue: true }
      }, "sync");

      expect(manager.getActiveCategories()).toEqual(["news_update"]);
      expect(root.classList.contains("typesafe-dim-news_update")).toBe(true);
    });

    it("handles null or missing doc / storage safely without throwing", () => {
      const m1 = initDimManager(null, null);
      expect(m1.getActiveCategories()).toEqual([]);
      expect(() => m1.disconnect()).not.toThrow();

      const m2 = initDimManager(document, null);
      expect(m2.getActiveCategories()).toEqual([]);
      expect(() => m2.disconnect()).not.toThrow();

      const m3 = initDimManager({ documentElement: null }, {});
      expect(m3.getActiveCategories()).toEqual([]);
      expect(() => m3.disconnect()).not.toThrow();
    });
  });
});
