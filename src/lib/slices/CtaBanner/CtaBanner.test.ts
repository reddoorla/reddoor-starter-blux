import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import CtaBanner from "./index.svelte";

afterEach(() => cleanup());

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
    expect(container.querySelector("button")).toBeNull();
    expect(container.querySelector('[data-slice-type="cta_banner"]')).not.toBeNull();
  });

  it("paints the selected ground and inverts the button on the dark one", () => {
    const { container } = render(CtaBanner, {
      props: { slice: makeSlice({ background: "dark" }), context: {} },
    });
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-dark");
    expect(section?.className).toContain("text-white");
    const cta = container.querySelector("a");
    expect(cta?.className).toContain("border-white");
    expect(cta?.className).not.toContain("border-dark");
  });

  it("omits the CTA when the link or the label is missing", () => {
    const { container: noLabel } = render(CtaBanner, {
      props: { slice: makeSlice({ buttonLabel: "" }), context: {} },
    });
    expect(noLabel.querySelector("a")).toBeNull();
    cleanup();

    const { container: noLink } = render(CtaBanner, {
      props: { slice: makeSlice({ buttonLink: null }), context: {} },
    });
    expect(noLink.querySelector("a")).toBeNull();
  });

  it("stands its own ground down inside a Blux band", () => {
    const presentation = {
      bands: { "0": { style: { "background-color": "#123456" } } },
    };
    const { container } = render(CtaBanner, {
      props: {
        slice: makeSlice({ band: 0, background: "dark" }),
        context: { presentation } as never,
      },
    });
    // The band's <section> owns the ground; the inner band carries none.
    const sections = container.querySelectorAll("section");
    expect(sections.length).toBe(2);
    expect(sections[1].className).not.toContain("bg-dark");
    // …and the button keeps the default (non-inverted) skin.
    expect(container.querySelector("a")?.className).toContain("border-dark");
  });
});
