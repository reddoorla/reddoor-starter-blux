import { describe, it, expect } from "vitest";
import pkg from "../../../package.json";
import { frozenArtifacts } from "./artifacts";

// Both-worlds contract — this file must pass UNMODIFIED in both repos:
// - starter template: ./frozen ships empty (just .gitkeep), the map is `{}` and
//   every frozen gate stays off, so non-Blux repos are unaffected;
// - frozen Blux site: the repo commits its `<uid>.*` artifacts and each entry
//   must load (tokenized template + parsed font links).
//
// styleCss is intentionally NOT content-asserted: it is a `?raw` import of a
// `.css` file, which Vite's CSS pipeline returns EMPTY under vitest (only) —
// the real build injects the full <style> block, so the extracted CSS is
// verified by the build/fidelity gate, not this unit.
describe("frozenArtifacts", () => {
  // Scaffolding renames package.json, so the template name identifies the
  // starter itself: an artifact committed HERE would flip isFrozenSite for
  // every site scaffolded afterwards.
  it.runIf(pkg.name === "sveltekit-prismic-starter-blux")(
    "the starter template ships no artifacts (Blux-only scoping gate)",
    () => {
      expect(Object.keys(frozenArtifacts)).toHaveLength(0);
    },
  );

  it("keys only lowercase uids — Prismic rejects uppercase on migrate", () => {
    for (const uid of Object.keys(frozenArtifacts)) {
      expect(uid).toMatch(/^[a-z0-9][a-z0-9-]*$/);
    }
  });

  it("every committed artifact loads: tokenized template + font links", () => {
    for (const artifact of Object.values(frozenArtifacts)) {
      expect(artifact.template).toMatch(/⟦[ti]:/);
      expect(Array.isArray(artifact.fontLinks)).toBe(true);
      expect(typeof artifact.styleCss).toBe("string");
    }
  });

  // collect() DEFAULTS a missing sibling (styleCss "" / fontLinks []), and the
  // vitest ?raw-css quirk rules out content assertions — but glob KEYS come
  // from the filesystem regardless, so file presence is still checkable. The
  // freeze emits all three files per uid unconditionally: an absent sibling
  // always means a broken partial copy (an unstyled page shipping green).
  const styleKeys = Object.keys(import.meta.glob("./frozen/*.style.css"));
  const fontKeys = Object.keys(import.meta.glob("./frozen/*.fonts.json"));
  it("no partial copies: every template has its .style.css and .fonts.json siblings", () => {
    for (const uid of Object.keys(frozenArtifacts)) {
      expect(styleKeys, `frozen/${uid}.style.css is missing`).toContain(
        `./frozen/${uid}.style.css`,
      );
      expect(fontKeys, `frozen/${uid}.fonts.json is missing`).toContain(
        `./frozen/${uid}.fonts.json`,
      );
    }
  });
});
