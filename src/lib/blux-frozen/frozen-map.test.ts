import { describe, it, expect } from "vitest";
import { frozenArtifacts } from "./artifacts";
import type { FrozenMapConfig } from "./frozen-map";

// Integrity gate for committed map artifacts: the hydrator trusts this shape
// (produced by the freeze from the export's initMap config), so a malformed
// artifact should fail here, not silently on the live page. The starter
// template commits none (the glob is empty and every assertion loops over
// nothing); a frozen site's `<uid>.map.json` files are all validated —
// unmodified, in both repos.
const mods = import.meta.glob("./frozen/*.map.json", { eager: true }) as Record<
  string,
  { default: FrozenMapConfig }
>;
const configs: [uid: string, config: FrozenMapConfig][] = Object.entries(mods).map(
  ([path, mod]) => [path.slice(path.lastIndexOf("/") + 1, -9), mod.default],
);

describe("frozen map artifacts", () => {
  // Reverse presence: the freeze bakes `data-kml-mid` onto every KML map
  // placeholder AND emits the matching <uid>.map.json — so a template carrying
  // the placeholder without its committed config is a broken partial copy
  // (the live page would ship a permanently-inert placeholder, green CI).
  it("every template with a KML map placeholder has its committed map.json", () => {
    const withConfig = new Set(configs.map(([uid]) => uid));
    for (const [uid, artifact] of Object.entries(frozenArtifacts)) {
      if (artifact.template.includes("data-kml-mid")) {
        expect(
          withConfig.has(uid),
          `frozen/${uid}.map.json is missing but the template has a map placeholder`,
        ).toBe(true);
      }
    }
  });

  it("each targets a mount that exists in its page's frozen template", () => {
    for (const [uid, config] of configs) {
      expect(config.mid).toMatch(/^[\w-]{10,}$/);
      expect(frozenArtifacts[uid]?.template).toContain(`id="${config.mountId}"`);
    }
  });

  it("each carries complete lid-scoped layers, at least one seeding the viewport", () => {
    for (const [, config] of configs) {
      expect(config.layers.length).toBeGreaterThan(0);
      for (const l of config.layers) {
        expect(l.name).toBeTruthy();
        expect(l.lid).toBeTruthy();
      }
      // Without a viewport-seeding layer the map opens on a default world view.
      const seeds = config.layers.filter((l) => l.initiallyVisible && l.preserveViewport === false);
      expect(seeds.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("toggles reference only real layers and the default toggle is in range", () => {
    for (const [, config] of configs) {
      const names = new Set(config.layers.map((l) => l.name));
      for (const t of config.toggles) {
        expect(t.label).toBeTruthy();
        for (const n of t.layers) expect(names.has(n)).toBe(true);
      }
      const def = config.defaultToggle ?? 0;
      if (config.toggles.length > 0) {
        expect(def).toBeGreaterThanOrEqual(0);
        expect(def).toBeLessThan(config.toggles.length);
      }
      expect(Array.isArray(config.styles)).toBe(true);
    }
  });
});
