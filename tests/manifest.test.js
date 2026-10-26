import { describe, expect, test } from "bun:test";
import fs from "fs";
import path from "path";

describe("Extension Manifest & Assets", () => {
  const manifestPath = path.resolve(import.meta.dir, "../manifest.json");

  test("manifest.json exists and is valid MV3 JSON", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(content);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("X Post Type Classifier");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.permissions).toContain("storage");
    expect(manifest.host_permissions).toContain("*://*.x.com/*");
    expect(manifest.host_permissions).toContain("https://api.typesafe.ai/*");
  });

  test("referenced background script exists", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const bgScript = path.resolve(import.meta.dir, "../", manifest.background.service_worker);
    expect(fs.existsSync(bgScript)).toBe(true);
  });

  test("referenced icons exist with non-zero size", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    for (const [size, relPath] of Object.entries(manifest.icons)) {
      const fullPath = path.resolve(import.meta.dir, "../", relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const stat = fs.statSync(fullPath);
      expect(stat.size).toBeGreaterThan(0);
    }
  });

  test("action defines default_popup and default_icon pointing to valid files", () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifest.action).toBeDefined();
    expect(manifest.action.default_popup).toBe("popup/popup.html");

    const popupHtml = path.resolve(import.meta.dir, "../", manifest.action.default_popup);
    expect(fs.existsSync(popupHtml)).toBe(true);
    expect(fs.statSync(popupHtml).size).toBeGreaterThan(0);

    expect(manifest.action.default_icon).toBeDefined();
    for (const [size, relPath] of Object.entries(manifest.action.default_icon)) {
      const fullPath = path.resolve(import.meta.dir, "../", relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      expect(fs.statSync(fullPath).size).toBeGreaterThan(0);
    }
  });
});
