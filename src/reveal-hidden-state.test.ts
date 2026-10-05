import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { animateIn } from "$lib/actions/animateIn";

// The scroll reveal's hidden state has two halves that have to agree, and the
// CSS half is not reachable from jsdom (which resolves no stylesheets):
//
//   1. app.css hides `[data-reveal]` under `prefers-reduced-motion:
//      no-preference`, so server-rendered markup is hidden at FIRST PAINT
//      rather than yanked to opacity 0 at hydration.
//   2. animateIn's inline write has to be byte-identical to (1), or hydration
//      is a visible state change instead of the no-op it is meant to be.
//
// That the hidden state is in force at first paint, and that app.html's
// <noscript> style lets a scripting-off browser out of it, is measured in a
// browser by tests/interaction/reveal-no-js.spec.ts. What a browser trace of
// opacity cannot see is the two halves hiding at different distances.
//
// Resolved from the project root, not `import.meta.url`: under the jsdom
// environment vite serves this module over http, so `new URL(..., import.meta.url)`
// is not a file: URL and readFileSync rejects it.
const css = readFileSync(resolve(process.cwd(), "src/app.css"), "utf-8");

/** The body of the `[data-reveal]` rule in `source`, or null unless it sits
 *  inside a `prefers-reduced-motion: no-preference` block. Located by string
 *  and sliced to the closing brace rather than matched by regex: a selector
 *  regex with `[^)]*` in it stops at a nested `)` and matches nothing however
 *  good the CSS is, which is how a check that can only ever fail gets written. */
function gatedRule(source: string) {
  const bare = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const at = bare.indexOf("[data-reveal] {");
  if (at === -1) return null;
  const gate = bare.lastIndexOf("@media", at);
  if (gate === -1) return null;
  const between = bare.slice(gate, at);
  const depth = between.split("{").length - between.split("}").length;
  if (depth < 1 || !between.startsWith("@media (prefers-reduced-motion: no-preference)")) {
    return null;
  }
  return bare.slice(at, bare.indexOf("}", at) + 1);
}

/** The declaration `property` sets in `rule`, if any. */
const declared = (rule: string | null, property: string) =>
  new RegExp(`(?<![\\w-])${property}:\\s*([^;}]+)`).exec(rule ?? "")?.[1]?.trim();

/** What animateIn writes on an element it hides with its default options. */
const hiddenByAction = (() => {
  const node = document.createElement("div");
  const { destroy } = animateIn(node);
  const state = { opacity: node.style.opacity, transform: node.style.transform };
  destroy();
  return state;
})();

const DEFAULT_TRAVEL = /^translateY\((.+)\)$/.exec(hiddenByAction.transform)?.[1]?.trim();

describe("the scroll reveal's first-paint hidden state", () => {
  // If the CSS hides an element 50% down and the action reveals it from 24px,
  // hydration is a jump rather than the byte-identical no-op the whole design
  // rests on. The two are asserted against each other so they cannot drift.
  it("hides [data-reveal] in app.css exactly as animateIn does, gated on no-preference", () => {
    const rule = gatedRule(css);
    expect(rule, "no [data-reveal] rule inside a no-preference block").not.toBeNull();
    expect(DEFAULT_TRAVEL, "animateIn wrote no translateY when hiding").toBeTruthy();
    expect(declared(rule, "opacity")).toBe(hiddenByAction.opacity);
    expect(declared(rule, "transform")).toBe(hiddenByAction.transform);
  });
});
