import { describe, expect, it, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import CarouselFrames, { type CarouselFrame } from "./CarouselFrames.svelte";

afterEach(() => cleanup());

const frames: CarouselFrame[] = [
  {
    media: {
      kind: "image",
      url: "https://cdn/a.jpg",
      alt: "A",
      minHeight: "80vh",
    },
    caption: "a place to sit and breathe",
    role: "text5",
  },
  {
    media: {
      kind: "image",
      url: "https://cdn/b.jpg",
      alt: "B",
      minHeight: "80vh",
    },
    caption: "a calm escape right outside your door",
    role: "text5",
  },
  // Uncaptioned frame without a source min-height.
  { media: { kind: "image", url: "https://cdn/c.jpg" } },
];

const renderFrames = () => render(CarouselFrames, { props: { frames, label: "Photo slideshow" } });

describe("CarouselFrames", () => {
  it("renders an APG carousel region with one figure per frame", () => {
    const { getByRole, container } = renderFrames();
    const region = getByRole("region");
    expect(region.getAttribute("aria-roledescription")).toBe("carousel");
    expect(region.getAttribute("aria-label")).toBe("Photo slideshow");
    expect(container.querySelectorAll("figure")).toHaveLength(3);
  });

  it("reserves the source min-height on each frame, and a min-height where the source gives none", () => {
    const { container } = renderFrames();
    const figures = container.querySelectorAll<HTMLElement>("figure");
    expect(figures[0]?.style.minHeight).toBe("80vh");
    // The media is absolutely positioned, so a frame without one collapses.
    expect(["", "0px"]).not.toContain(figures[2]?.style.minHeight);
  });

  it("renders caption text in a figcaption carrying the caption's txt-role", () => {
    const { container } = renderFrames();
    const captions = container.querySelectorAll("figcaption");
    // The uncaptioned frame renders no figcaption at all.
    expect(captions).toHaveLength(2);
    expect(captions[0]?.textContent?.trim()).toBe("a place to sit and breathe");
    // The caption text sits in its own span carrying the txt-role (nested in
    // the white bar so a subcaption can share the bar as a second line).
    const captionSpan = [...captions[0]!.querySelectorAll("span")].find((s) =>
      s.className.includes("txt-role-text5"),
    );
    expect(captionSpan?.textContent).toBe("a place to sit and breathe");
  });

  it("renders a hero slide's subcaption as a second line under the title", () => {
    const heroFrames: CarouselFrame[] = [
      {
        media: {
          kind: "image",
          url: "https://cdn/hero.jpg",
          minHeight: "80vh",
        },
        caption: "Mar Monte Hotel",
        role: "text2",
        subcaption: "Santa Barbara, CA",
        subrole: "text3",
      },
    ];
    const { container } = render(CarouselFrames, {
      props: { frames: heroFrames, label: "Hero", columns: 1 },
    });
    const fig = container.querySelector("figcaption")!;
    expect(fig.textContent).toContain("Mar Monte Hotel");
    expect(fig.textContent).toContain("Santa Barbara, CA");
    // Both lines carry their own role.
    const sub = [...fig.querySelectorAll("span")].find((s) =>
      s.className.includes("txt-role-text3"),
    );
    expect(sub?.textContent).toBe("Santa Barbara, CA");
  });

  it("honors the source data-columns — all frames visible means no arrows", () => {
    const { queryByLabelText } = render(CarouselFrames, {
      props: { frames, label: "Photo slideshow", columns: 3 },
    });
    // Slider renders no arrows when everything fits in one view.
    expect(queryByLabelText("Previous slide")).toBeNull();
    expect(queryByLabelText("Next slide")).toBeNull();
  });

  it("shows labelled prev/next arrows when frames overflow the view", () => {
    const { getByLabelText } = renderFrames();
    expect(getByLabelText("Previous slide")).toBeTruthy();
    expect(getByLabelText("Next slide")).toBeTruthy();
  });
});
