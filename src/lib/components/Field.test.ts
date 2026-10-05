import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Field from "./Field.svelte";

afterEach(() => cleanup());

/** app.css, cwd-relative: under jsdom `import.meta.url` is not a file: URL —
 *  see theme-contrast.test.ts. */
const CSS = readFileSync(resolve(process.cwd(), "src/app.css"), "utf8");

/** app.css's `@theme` block. */
const THEME_BODY = /@theme\s*\{([\s\S]*?)\n\}/.exec(CSS)?.[1] ?? "";

/** The theme's colours, read from app.css as #rrggbb: 3- and 6-digit hex,
 *  white/black, and the achromatic `oklch(L 0 H)` greys (linear sRGB is L³ on
 *  every channel — see theme-contrast.test.ts's achromaticOklch). */
const THEME: Record<string, string> = (() => {
  const out: Record<string, string> = {};
  for (const m of THEME_BODY.matchAll(
    /--color-([a-z0-9-]+):\s*(#[0-9a-f]{3}(?:[0-9a-f]{3})?|white|black)\s*;/gi,
  )) {
    const hex = m[2] === "white" ? "#ffffff" : m[2] === "black" ? "#000000" : m[2];
    out[m[1]] = hex.length === 4 ? hex.replace(/[0-9a-f]/gi, (c) => c + c) : hex;
  }
  for (const m of THEME_BODY.matchAll(
    /--color-([a-z0-9-]+):\s*oklch\(\s*([\d.]+)(%?)\s+0(?:\.0+)?%?\s+-?[\d.]+(?:deg)?\s*\)\s*;/gi,
  )) {
    const linear = (Number(m[2]) / (m[3] ? 100 : 1)) ** 3;
    const encoded = linear <= 0.0031308 ? 12.92 * linear : 1.055 * linear ** (1 / 2.4) - 0.055;
    const byte = Math.round(Math.min(1, Math.max(0, encoded)) * 255);
    out[m[1]] = `#${byte.toString(16).padStart(2, "0").repeat(3)}`;
  }
  return out;
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

describe("Field", () => {
  it("renders a label associated with the input", () => {
    const { getByLabelText } = render(Field, { name: "email", label: "Email" });
    const input = getByLabelText("Email") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.tagName).toBe("INPUT");
    expect(input.name).toBe("email");
  });

  it("marks required fields with aria + visible indicator", () => {
    const { getByLabelText, getByText } = render(Field, {
      name: "email",
      label: "Email",
      required: true,
    });
    const input = getByLabelText(/Email/) as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(getByText("(required)")).toBeTruthy();
  });

  it("links description via aria-describedby", () => {
    const { getByLabelText, getByText } = render(Field, {
      name: "email",
      label: "Email",
      description: "We never share it.",
    });
    const input = getByLabelText("Email") as HTMLInputElement;
    const description = getByText("We never share it.");
    expect(input.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("links error via aria-describedby and sets aria-invalid", () => {
    const { getByLabelText, getByRole } = render(Field, {
      name: "email",
      label: "Email",
      error: "Required",
    });
    const input = getByLabelText("Email") as HTMLInputElement;
    const alert = getByRole("alert");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
    expect(alert.textContent).toBe("Required");
  });

  it("renders a textarea when type=textarea", () => {
    const { getByLabelText } = render(Field, {
      name: "msg",
      label: "Message",
      type: "textarea",
    });
    const textarea = getByLabelText("Message") as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
  });
});

// The control's skin, which had two defects a class list cannot show you.
describe("Field styling", () => {
  it("draws a resting border that clears the 3:1 non-text minimum on every light ground", () => {
    // WCAG 1.4.11 wants 3:1 for a control's boundary. The first border was
    // `--color-light`, 1.24:1 on white: invisible boxes, and a visitor hunting
    // for where to type. So the border's token is MEASURED here against
    // app.css rather than named, on both controls.
    for (const type of ["text", "textarea"] as const) {
      const { getByLabelText, unmount } = render(Field, { name: "a", label: "A", type });
      const cls = getByLabelText("A").getAttribute("class") ?? "";
      unmount();
      const resting = cls.split(/\s+/).filter((c) => !c.includes(":"));
      const borders = resting
        .map((c) => /^border-([a-z][a-z0-9-]*)$/.exec(c)?.[1])
        .filter((token): token is string => !!token && token in THEME);
      expect(
        borders,
        `exactly one measurable resting border colour on the ${type} (#171: forms not yet read)`,
      ).toHaveLength(1);
      for (const ground of ["background", "white", "light"]) {
        expect(
          contrast(THEME[borders[0]], THEME[ground]),
          `${type}: border-${borders[0]} on bg-${ground}`,
        ).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("keeps the forced-colors outline fallback on focus (Tailwind v4)", () => {
    // In Tailwind v4 `outline-none` resolves to `outline-style: none` and takes
    // the forced-colors fallback with it; `outline-hidden` keeps the 2px
    // transparent outline the forced-colors palette repaints. Under forced
    // colours the ring is dropped by the engine, so that outline is the only
    // focus affordance left.
    for (const type of ["text", "textarea"] as const) {
      const { getByLabelText, unmount } = render(Field, { name: "a", label: "A", type });
      const cls = (getByLabelText("A").getAttribute("class") ?? "").split(/\s+/);
      unmount();
      expect(
        cls.filter((c) => /(^|:)outline-none$/.test(c)),
        type,
      ).toEqual([]);
    }
  });
});

// Modal.svelte finds its initial-focus target by `[autofocus]`; with none, the
// native dialog-focusing steps land on the first focusable child, which is the
// ✕ — the exit. Opt-in, and off by default so no page ever grabs focus on load
// by accident.
describe("Field autofocus", () => {
  it("carries no autofocus attribute unless asked", () => {
    const { getByLabelText } = render(Field, { name: "email", label: "Email" });
    expect((getByLabelText("Email") as HTMLInputElement).hasAttribute("autofocus")).toBe(false);
  });

  it("marks the control as the dialog's focus target when autofocus is set", () => {
    const { getByLabelText } = render(Field, {
      name: "name",
      label: "Name",
      autofocus: true,
    });
    expect((getByLabelText("Name") as HTMLInputElement).hasAttribute("autofocus")).toBe(true);
  });

  it("applies to the textarea as well as the input", () => {
    // The two controls are a standing source of one-sided fixes in this
    // component.
    const { getByLabelText } = render(Field, {
      name: "msg",
      label: "Message",
      type: "textarea",
      autofocus: true,
    });
    expect((getByLabelText("Message") as HTMLTextAreaElement).hasAttribute("autofocus")).toBe(true);
  });
});
