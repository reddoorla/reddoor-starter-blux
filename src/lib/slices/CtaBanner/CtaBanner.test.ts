import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import CtaBanner from "./index.svelte";

afterEach(() => cleanup());

/** A theme colour as #rrggbb: hex, white/black, or `oklch()` through OKLab to
 *  sRGB. Anything else (an alpha, a `var()`) stays unmeasured. */
function toHex(value: string): string | undefined {
  const v = value.trim().toLowerCase();
  if (v === "white" || v === "black") return v === "white" ? "#ffffff" : "#000000";
  if (/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/.test(v)) {
    return v.length === 4 ? v.replace(/[0-9a-f]/g, (c) => c + c) : v;
  }
  const m = /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+|none)\s+(-?[\d.]+|none)(?:deg)?\s*\)$/.exec(v);
  if (!m) return undefined;
  const L = Number(m[1]) / (m[2] ? 100 : 1);
  const C = m[3] === "none" ? 0 : Number(m[3]);
  const h = ((m[4] === "none" ? 0 : Number(m[4])) * Math.PI) / 180;
  const [a, b] = [C * Math.cos(h), C * Math.sin(h)];
  const [l, md, s] = [
    L + 0.3963377774 * a + 0.2158037573 * b,
    L - 0.1055613458 * a - 0.0638541728 * b,
    L - 0.0894841775 * a - 1.291485548 * b,
  ].map((x) => x ** 3);
  const linear = [
    4.0767416621 * l - 3.3077115913 * md + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * md - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * md + 1.707614701 * s,
  ];
  return `#${linear
    .map((c) => {
      const lin = Math.min(1, Math.max(0, c));
      const encoded = lin <= 0.0031308 ? 12.92 * lin : 1.055 * lin ** (1 / 2.4) - 0.055;
      return Math.round(encoded * 255)
        .toString(16)
        .padStart(2, "0");
    })
    .join("")}`;
}

/** The theme's colours in Tailwind's order: its default palette, then the
 *  Blux theme, then app.css's own `@theme`, each later value winning
 *  (cwd-relative: under jsdom `import.meta.url` is not a file: URL). */
const THEME: Record<string, string> = (() => {
  const out = new Map<string, string>();
  for (const file of ["node_modules/tailwindcss/theme.css", "src/blux-theme.css", "src/app.css"]) {
    const css = readFileSync(resolve(process.cwd(), file), "utf8");
    for (const [, body] of css.matchAll(/@theme(?:\s+[a-z]+)*\s*\{([\s\S]*?)\n\}/g)) {
      for (const [, token, value] of body.matchAll(/--color-([a-z0-9-]+|\*):\s*([^;]+);/gi)) {
        const hex = toHex(value);
        if (token === "*") out.clear();
        else if (hex) out.set(token, hex);
        else out.delete(token);
      }
    }
  }
  return Object.fromEntries(out);
})();

/** WCAG 2.x contrast between two #rrggbb values. */
function contrast(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The theme token of an element's own resting `<prefix>-<token>` class. */
const own = (el: Element, prefix: string) =>
  (el.getAttribute("class") ?? "")
    .split(/\s+/)
    .map((c) => new RegExp(`^${prefix}-([a-z0-9-]+)$`).exec(c)?.[1])
    .find((token) => token !== undefined && token in THEME);

/** The nearest such token on the element or an ancestor: what it is painted in. */
const painted = (el: Element | null, prefix: string): string | undefined =>
  el ? (own(el, prefix) ?? painted(el.parentElement, prefix)) : undefined;

const heading = [{ type: "heading2", text: "Ready to start your project?", spans: [] }];
const link = { link_type: "Web", url: "https://example.com" };

const makeSlice = (primary: Record<string, unknown> = {}) =>
  ({
    slice_type: "cta_banner",
    variation: "default",
    primary: {
      heading,
      buttonLabel: "Talk with us",
      buttonLink: link,
      background: "light",
      band: null,
      ...primary,
    },
    items: [],
  }) as never;

describe("CtaBanner slice", () => {
  it("renders the heading and the CTA as an anchor", () => {
    const { container, getByRole } = render(CtaBanner, {
      props: { slice: makeSlice(), context: {} },
    });

    expect(getByRole("heading", { level: 2 }).textContent).toContain(
      "Ready to start your project?",
    );
    const cta = getByRole("link", { name: "Talk with us" });
    expect(cta.tagName).toBe("A");
    expect(cta.getAttribute("href")).toBe("https://example.com");
    // A navigating CTA is an <a>, never a <button> nested inside one.
    expect(cta.querySelector("button")).toBeNull();
    expect(container.querySelector('[data-slice-type="cta_banner"]')).not.toBeNull();
  });

  it("paints the selected ground, and keeps the heading and the CTA legible on each", () => {
    const grounds: Record<string, string | undefined> = {};
    for (const background of ["light", "dark", "white"]) {
      const { getByRole, unmount } = render(CtaBanner, {
        props: { slice: makeSlice({ background }), context: {} },
      });
      const heading = getByRole("heading", { level: 2 });
      const cta = getByRole("link", { name: "Talk with us" });
      const ground = painted(cta.parentElement, "bg");
      grounds[background] = ground;
      const pairs: [string, string | undefined, string | undefined, number][] = [
        ["heading", painted(heading, "text"), painted(heading, "bg"), 4.5],
        ["CTA label", painted(cta, "text"), painted(cta, "bg"), 4.5],
      ];
      // WCAG 1.4.11: the outline, or the CTA's own fill, is what draws the
      // button. With neither it is a text link, and its label is the measure.
      const outline =
        own(cta, "border") ??
        (cta.classList.contains("border-current") ? painted(cta, "text") : own(cta, "bg"));
      if (outline) pairs.push(["CTA outline", outline, ground, 3]);
      for (const [what, fg, bg, floor] of pairs) {
        expect(fg && bg, `${what} on the ${background} ground is unmeasured`).toBeTruthy();
        expect(
          contrast(THEME[fg!], THEME[bg!]),
          `${what} on the ${background} ground: ${fg} on ${bg}`,
        ).toBeGreaterThanOrEqual(floor);
      }
      unmount();
    }
    expect(grounds.dark).not.toBe(grounds.light);
  });

  it("omits the CTA when the link or the label is missing", () => {
    const { container: noLabel } = render(CtaBanner, {
      props: { slice: makeSlice({ buttonLabel: "" }), context: {} },
    });
    expect(noLabel.querySelector(`a[href="${link.url}"]`)).toBeNull();
    cleanup();

    const { container: noLink } = render(CtaBanner, {
      props: { slice: makeSlice({ buttonLink: null }), context: {} },
    });
    expect(noLink.textContent).not.toContain("Talk with us");
  });

  it("stands its own ground down inside a Blux band", () => {
    const presentation = {
      bands: { "0": { style: { "background-color": "#123456" } } },
    };
    const skins: Record<string, [string, string]> = {};
    for (const background of ["dark", "light"]) {
      const { container, getByRole, unmount } = render(CtaBanner, {
        props: {
          slice: makeSlice({ band: 0, background }),
          context: { presentation } as never,
        },
      });
      const cta = getByRole("link", { name: "Talk with us" });
      // The band's <section> owns the ground, and no theme ground is stacked
      // between it and the CTA.
      const bandSection = container.querySelector("section");
      expect(bandSection?.style.backgroundColor).toBe("rgb(18, 52, 86)");
      expect(bandSection?.contains(cta)).toBe(true);
      expect(painted(cta.parentElement, "bg")).toBeUndefined();
      skins[background] = [cta.closest("section")?.className ?? "", cta.className];
      unmount();
    }
    // …so the background select changes nothing inside a band.
    expect(skins.dark).toEqual(skins.light);
  });
});
