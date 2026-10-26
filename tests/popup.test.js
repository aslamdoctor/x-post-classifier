import { describe, it, expect, beforeEach } from "bun:test";
import { Window } from "happy-dom";
import { setupPopup, TAXONOMY } from "../popup/popup.js";

describe("Popup Settings UI", () => {
  let window;
  let document;

  beforeEach(() => {
    window = new Window();
    document = window.document;
  });

  describe("TAXONOMY", () => {
    it("exports all 6 categories with expected ids and colors", () => {
      expect(TAXONOMY).toBeArray();
      expect(TAXONOMY.length).toBe(6);

      const expected = {
        insight_tutorial: "#1d9bf0",
        news_update: "#00ba7c",
        engagement_bait: "#f91880",
        promo_sales: "#ff7a00",
        meme_humor: "#7856ff",
        personal_opinion: "#71767b"
      };

      for (const item of TAXONOMY) {
        expect(expected[item.id]).toBeDefined();
        expect(item.color.toLowerCase()).toBe(expected[item.id].toLowerCase());
        expect(typeof item.label).toBe("string");
      }
    });
  });

  describe("setupPopup", () => {
    it("initializes checkboxes according to stored categories from storage.sync", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <input type="checkbox" id="cat-insight_tutorial" data-category="insight_tutorial" value="insight_tutorial">
        <input type="checkbox" id="cat-promo_sales" data-category="promo_sales" value="promo_sales">
        <input type="checkbox" id="cat-meme_humor" data-category="meme_humor" value="meme_humor">
      `;

      const mockStorage = {
        sync: {
          get: (key, cb) => cb({ dimmedCategories: ["promo_sales", "meme_humor"] }),
          set: () => {}
        }
      };

      setupPopup(container, mockStorage);

      const insight = container.querySelector("#cat-insight_tutorial");
      const promo = container.querySelector("#cat-promo_sales");
      const meme = container.querySelector("#cat-meme_humor");

      expect(insight.checked).toBe(false);
      expect(promo.checked).toBe(true);
      expect(meme.checked).toBe(true);
    });

    it("falls back to storage.local when storage.sync is not present", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <input type="checkbox" id="cat-news_update" data-category="news_update">
      `;

      const mockStorage = {
        local: {
          get: (key, cb) => cb({ dimmedCategories: ["news_update"] }),
          set: () => {}
        }
      };

      setupPopup(container, mockStorage);

      const news = container.querySelector("#cat-news_update");
      expect(news.checked).toBe(true);
    });

    it("handles empty or missing dimmedCategories in storage", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <input type="checkbox" id="cat-insight_tutorial" data-category="insight_tutorial" checked>
      `;

      const mockStorage = {
        sync: {
          get: (key, cb) => cb({}),
          set: () => {}
        }
      };

      setupPopup(container, mockStorage);

      const insight = container.querySelector("#cat-insight_tutorial");
      expect(insight.checked).toBe(false);
    });

    it("saves selected categories on checkbox change", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <input type="checkbox" id="cat-insight_tutorial" data-category="insight_tutorial">
        <input type="checkbox" id="cat-promo_sales" data-category="promo_sales">
      `;

      let savedData = null;
      const mockStorage = {
        sync: {
          get: (key, cb) => cb({ dimmedCategories: [] }),
          set: (data) => {
            savedData = data;
          }
        }
      };

      setupPopup(container, mockStorage);

      const promo = container.querySelector("#cat-promo_sales");
      promo.checked = true;
      promo.dispatchEvent(new window.Event("change", { bubbles: true }));

      expect(savedData).toEqual({ dimmedCategories: ["promo_sales"] });

      const insight = container.querySelector("#cat-insight_tutorial");
      insight.checked = true;
      insight.dispatchEvent(new window.Event("change", { bubbles: true }));

      expect(savedData).toEqual({ dimmedCategories: ["insight_tutorial", "promo_sales"] });
    });

    it("works when checkboxes only have value attribute instead of data-category", () => {
      const container = document.createElement("div");
      container.innerHTML = `
        <input type="checkbox" id="cat-insight_tutorial" value="insight_tutorial">
        <input type="checkbox" id="cat-promo_sales" value="promo_sales">
      `;

      let savedData = null;
      const mockStorage = {
        sync: {
          get: (key, cb) => cb({ dimmedCategories: ["promo_sales"] }),
          set: (data) => {
            savedData = data;
          }
        }
      };

      setupPopup(container, mockStorage);

      const insight = container.querySelector("#cat-insight_tutorial");
      const promo = container.querySelector("#cat-promo_sales");
      expect(insight.checked).toBe(false);
      expect(promo.checked).toBe(true);

      insight.checked = true;
      insight.dispatchEvent(new window.Event("change", { bubbles: true }));

      expect(savedData.dimmedCategories).toContain("insight_tutorial");
      expect(savedData.dimmedCategories).toContain("promo_sales");
    });

    it("handles null root or missing storage gracefully", () => {
      expect(() => setupPopup(null, null)).not.toThrow();
      expect(() => setupPopup(document.createElement("div"), null)).not.toThrow();
    });
  });
});
