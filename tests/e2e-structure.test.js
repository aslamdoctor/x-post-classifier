import { describe, expect, test } from "bun:test";
import fs from "fs";
import path from "path";

describe("E2E Extension Structure & Bundle Verification", () => {
  const root = path.resolve(import.meta.dir, "..");

  test("Extension bundle has all required files for Chrome loading", () => {
    expect(fs.existsSync(path.join(root, "manifest.json"))).toBe(true);
    expect(fs.existsSync(path.join(root, "background.js"))).toBe(true);
    expect(fs.existsSync(path.join(root, "content/content.js"))).toBe(true);
    expect(fs.existsSync(path.join(root, "content/badge.css"))).toBe(true);
    expect(fs.existsSync(path.join(root, "icons/icon16.png"))).toBe(true);
    expect(fs.existsSync(path.join(root, "icons/icon48.png"))).toBe(true);
    expect(fs.existsSync(path.join(root, "icons/icon128.png"))).toBe(true);
    expect(fs.existsSync(path.join(root, "popup/popup.html"))).toBe(true);
    expect(fs.existsSync(path.join(root, "popup/popup.css"))).toBe(true);
    expect(fs.existsSync(path.join(root, "popup/popup.js"))).toBe(true);
  });

  test("Manifest matches content script files and action configuration", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.json"), "utf-8"));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.content_scripts[0].js).toContain("content/content.js");
    expect(manifest.content_scripts[0].css).toContain("content/badge.css");
    expect(manifest.permissions).toContain("storage");
    expect(manifest.action).toBeDefined();
    expect(manifest.action.default_popup).toBe("popup/popup.html");
  });

  test("content/content.js contains no top-level export statements", () => {
    const contentJs = fs.readFileSync(path.join(root, "content/content.js"), "utf-8");
    expect(contentJs.includes("export ")).toBe(false);
    expect(contentJs.includes("export{")).toBe(false);
    expect(contentJs.includes("export {")).toBe(false);
  });
});
