import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Focus styling in this template is opt-in per component: the buttons on the
// fixtures page carry their own rings and everything else falls back to the
// UA's 1px hairline, which is invisible on a dark nav or over a photo hero
// (WCAG 2.4.7). There was no floor at all — `grep -a "focus-visible" src/app.css`
// returned nothing. This asserts the floor exists and is legible, since a CSS
// cascade rule is not reachable from jsdom, which resolves no stylesheets.
// Resolved from the project root, not `import.meta.url`: under the jsdom
// environment vite serves this module over http, so `new URL(..., import.meta.url)`
// is not a file: URL and readFileSync rejects it.
const css = readFileSync(resolve(process.cwd(), "src/app.css"), "utf-8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

const theme = (() => {
  const body = /@theme\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? "";
  const out: Record<string, string> = { white: "#ffffff", black: "#000000" };
  for (const m of body.matchAll(/--color-([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
})();
const NAMED: Record<string, string> = { white: "#ffffff", black: "#000000" };
const luminance = (value: string) => {
  const raw = (NAMED[value] ?? value).replace("#", "");
  const h = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw;
  expect(h, `cannot measure ${value}`).toMatch(/^[0-9a-f]{6}$/i);
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(theme[a]), luminance(theme[b])].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// What docs/accessibility.md promises the floor reaches.
const REACHED = [
  '<a href="/">x</a>',
  "<button>x</button>",
  "<summary>x</summary>",
  '<div tabindex="0">x</div>',
];
const reaches = (selector: string, html: string) => {
  const host = document.createElement("div");
  host.innerHTML = html;
  try {
    return host.firstElementChild!.matches(selector || "*");
  } catch {
    return false;
  }
};

describe("the keyboard-focus floor", () => {
  // Light grounds only: the same ring on the template's dark bands is
  // reddoor-starter#170.
  it("gives every link, button, summary and tabbable element a visible outline at 3:1 or better on the page ground", () => {
    // Chosen by what each rule reaches, not by its place in the file, and
    // read in source order so a later rule's outline wins as it does in the
    // cascade.
    const floor = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, prelude]) => prelude.includes(":focus-visible"))
      .filter(([, prelude]) =>
        REACHED.every((html) => reaches(prelude.replace(/:focus-visible/g, "").trim(), html)),
      )
      .map(([, , body]) => body)
      .join(";");
    expect(
      floor,
      "no :focus-visible rule reaches a link, a button, a summary and a tabbable element",
    ).not.toBe("");
    const style = [
      ...floor.matchAll(
        /(?<![\w-])outline(?:-style)?:[^;]*?\b(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset|auto)\b/g,
      ),
    ].pop()?.[1];
    expect(style, "the floor's outline has no style, so it draws nothing").toBeDefined();
    expect(["none", "hidden"]).not.toContain(style);
    const ring = [
      ...floor.matchAll(/(?<![\w-])outline(?:-color)?:[^;]*var\(--color-([a-z0-9-]+)\)/g),
    ].pop()?.[1];
    expect(ring, "the floor's outline colour is not a var(--color-*) theme token").toBeDefined();
    for (const ground of ["background", "white"]) {
      expect(contrast(ring!, ground), `${ring} ring on ${ground}`).toBeGreaterThanOrEqual(3);
    }
  });
});
