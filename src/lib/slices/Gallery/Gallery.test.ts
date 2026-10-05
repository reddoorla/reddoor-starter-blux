import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import Gallery from "./index.svelte";
import type { Presentation } from "$lib/blux/presentation";

afterEach(() => cleanup());

const presentation: Presentation = {
  bands: {
    "1": {
      gallery: [
        { kind: "image", url: "https://cdn/one.jpg" },
        { kind: "image", url: "https://cdn/two.jpg" },
        { kind: "video", url: "https://cdn/three.mp4" },
      ],
    },
  },
};

const slice = {
  slice_type: "gallery",
  variation: "default",
  primary: { band: 1 },
  items: [],
} as never;

describe("Gallery slice", () => {
  it("renders the first manifest frame", () => {
    const { container } = render(Gallery, {
      props: { slice, context: { presentation } },
    });
    const img = container.querySelector("img");
    expect(img?.getAttribute("src")).toBe("https://cdn/one.jpg");
  });

  it("renders nothing without a manifest gallery payload", () => {
    const { container } = render(Gallery, {
      props: { slice, context: { presentation: { bands: {} } } },
    });
    expect(container.querySelector("section")).toBeNull();
  });

  it("renders every frame with its caption when any frame carries one", () => {
    const captioned: Presentation = {
      bands: {
        "1": {
          gallery: [
            { kind: "image", url: "https://cdn/one.jpg", caption: "one" },
            { kind: "image", url: "https://cdn/two.jpg", caption: "two" },
          ],
        },
      },
    };
    const { container, getByText } = render(Gallery, {
      props: { slice, context: { presentation: captioned } },
    });
    const srcs = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(srcs).toEqual(expect.arrayContaining(["https://cdn/one.jpg", "https://cdn/two.jpg"]));
    expect(getByText("one")).toBeTruthy();
    expect(getByText("two")).toBeTruthy();
  });
});
