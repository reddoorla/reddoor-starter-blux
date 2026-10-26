import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import type { Product } from "$lib/blux/product-types";

// While prerendering, kit 3 gives page.url "http://sveltekit-prerender", and
// $lib/seo's canonicalUrl puts the build's production origin in its place
// (sveltekit.config.js says why it is not paths.origin). The share links are
// in the prerendered HTML, so they must carry that origin: a no-JS visitor,
// and anything reading the static page, gets them before hydration rewrites
// them (reddoor-starter-blux#51, round 1). In vitest the build has no URL, so
// the build origin is fixed here through the mock.
vi.mock("$app/state", () => ({
  page: { url: new URL("http://sveltekit-prerender/products/aria") },
}));
vi.mock("$lib/seo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("$lib/seo")>();
  return {
    ...actual,
    canonicalUrl: (url: Pick<URL, "origin" | "pathname"> | string) =>
      actual.canonicalUrl(url, "https://www.example.com"),
  };
});

const { default: ProductDetail } = await import("./ProductDetail.svelte");

afterEach(() => cleanup());

const product: Product = {
  slug: "aria",
  title: "Aria",
  category: "Upholstered",
  subCategory: "Lounge",
  dimensions: '30"W x 30"D',
  tags: ["lounge"],
  disabled: false,
  image: { assetId: "main", url: "https://cdn/main.jpg" },
  gallery: [],
};

describe("ProductDetail while prerendering", () => {
  it("shares the build's production url, not kit's placeholder", () => {
    const { getByLabelText } = render(ProductDetail, { product });
    const production = encodeURIComponent("https://www.example.com/products/aria");
    for (const label of ["Share on Facebook", "Share on Twitter", "Share on Pinterest"]) {
      const href = getByLabelText(label).getAttribute("href") ?? "";
      expect(href, label).toContain(production);
      expect(href, label).not.toContain("sveltekit-prerender");
    }
  });
});
