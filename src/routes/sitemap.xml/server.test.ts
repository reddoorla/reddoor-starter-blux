import { describe, it, expect, vi } from "vitest";

// The placeholder starter: no Prismic documents at all. What must still appear
// is the hand-built /contact route — see STATIC_ROUTES in +server.ts.
// `isFrozenSite` is a Blux-track export: this route also takes the frozen
// branch, and a mock that omits an export the module under test imports fails
// to load rather than defaulting it.
vi.mock("$lib/prismicio", () => ({
  isPlaceholderRepo: true,
  isFrozenSite: false,
  createClient: () => ({ getAllByType: async () => [] }),
}));

const { GET } = await import("./+server");

const body = async () => {
  // `RequestHandler` returns MaybePromise<Response>, so await it rather than
  // reaching for .then — the union has no such method.
  const response = await GET({
    url: new URL("https://example.com/sitemap.xml"),
    fetch: globalThis.fetch,
  } as unknown as Parameters<typeof GET>[0]);
  return response.text();
};

describe("GET /sitemap.xml", () => {
  // Every other entry is discovered by querying the CMS, which structurally
  // cannot see a route that exists only in the filesystem. /contact is linked
  // from the template's own chrome and returns 200, and it is `prerender =
  // false` (a form action cannot live on a prerendered route), so no
  // build-output census would have caught its absence either.
  it("lists the filesystem-only /contact route", async () => {
    expect(await body()).toContain("<loc>https://example.com/contact</loc>");
  });

  it("still emits a well-formed urlset with no Prismic documents", async () => {
    const xml = await body();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<urlset");
    expect(xml).toContain("</urlset>");
  });
});
