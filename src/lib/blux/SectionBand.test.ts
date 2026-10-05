import { describe, expect, it, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import SectionBand from "./SectionBand.svelte";
import { animateIn } from "$lib/actions/animateIn";

// jsdom has no matchMedia; Media queries prefers-reduced-motion for videos.
beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }));
});

afterEach(() => cleanup());
const children = () => createRawSnippet(() => ({ render: () => "<p>content</p>" }));
/** The band and every element in it that an inline style holds at opacity 0. */
const hiddenIn = (section: HTMLElement) =>
  [section, ...section.querySelectorAll<HTMLElement>("*")].filter((el) => el.style.opacity === "0");

describe("SectionBand", () => {
  it("applies the style record inline and renders children", () => {
    const { container } = render(SectionBand, {
      props: {
        band: {
          style: { "background-color": "rgb(1, 2, 3)", "min-height": "50vh" },
        },
        children: children(),
      },
    });
    const section = container.querySelector("section");
    expect(section?.style.backgroundColor).toBe("rgb(1, 2, 3)");
    expect(section?.style.minHeight).toBe("50vh");
    expect(section?.textContent).toContain("content");
  });

  it("renders a background video behind the content when band.background is a video", () => {
    const { container } = render(SectionBand, {
      props: {
        band: { background: { kind: "video", url: "https://cdn/bg.mp4" } },
        children: children(),
      },
    });
    expect(container.querySelector("video")?.getAttribute("src")).toBe("https://cdn/bg.mp4");
    // Decorative background media must stay out of the a11y tree.
    expect(container.querySelector("[aria-hidden='true'] video")).not.toBeNull();
  });

  it("passes eager loading to the background image when eagerBackground is set", () => {
    const { container } = render(SectionBand, {
      props: {
        band: { background: { kind: "image", url: "https://cdn/bg.jpg" } },
        eagerBackground: true,
        children: children(),
      },
    });
    expect(container.querySelector("img")?.getAttribute("loading")).toBe("eager");
  });

  it("background image stays lazy by default", () => {
    const { container } = render(SectionBand, {
      props: {
        band: { background: { kind: "image", url: "https://cdn/bg.jpg" } },
        children: children(),
      },
    });
    expect(container.querySelector("img")?.getAttribute("loading")).toBe("lazy");
  });

  it("carries slice identity data-attrs when given, omits them when not", () => {
    const withAttrs = render(SectionBand, {
      props: {
        band: null,
        sliceType: "grid_band",
        sliceVariation: "default",
        children: children(),
      },
    });
    const section = withAttrs.container.querySelector("section");
    expect(section?.getAttribute("data-slice-type")).toBe("grid_band");
    expect(section?.getAttribute("data-slice-variation")).toBe("default");

    const bare = render(SectionBand, {
      props: { band: null, children: children() },
    });
    const bareSection = bare.container.querySelector("section");
    expect(bareSection?.hasAttribute("data-slice-type")).toBe(false);
    expect(bareSection?.hasAttribute("data-slice-variation")).toBe(false);
  });

  it("renders a bare section with no media when band is null", () => {
    const { container } = render(SectionBand, {
      props: { band: null, children: children() },
    });
    expect(container.querySelector("section")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("video")).toBeNull();
  });

  it("hiddenIn sees what animateIn hides", () => {
    const probe = document.createElement("div");
    const { destroy } = animateIn(probe);
    expect(hiddenIn(probe)).toEqual([probe]);
    destroy();
  });

  it("renders the hero band content immediately (no reveal gate) when eagerBackground", () => {
    const { container } = render(SectionBand, {
      props: {
        band: { style: {} },
        eagerBackground: true,
        children: children(),
      },
    });
    const section = container.querySelector("section") as HTMLElement;
    // The hero is above the fold and the LCP — it must not start hidden.
    expect(hiddenIn(section)).toHaveLength(0);
    expect(section.textContent).toContain("content");
  });

  it("does not hide content under prefers-reduced-motion", () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      onchange: null,
      dispatchEvent: () => false,
    }));
    const { container } = render(SectionBand, {
      props: { band: { style: {} }, children: children() },
    });
    const section = container.querySelector("section") as HTMLElement;
    // Wrapper still renders, but animateIn early-returns → no opacity gate.
    expect(hiddenIn(section)).toHaveLength(0);
    expect(section.textContent).toContain("content");
  });
});
