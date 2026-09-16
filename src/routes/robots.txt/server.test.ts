import { describe, it, expect } from "vitest";
import { NOINDEX_ENFORCED, NOINDEX_PREFIXES } from "$lib/seo";
import { GET } from "./+server";

function get(origin: string) {
  return GET({
    url: new URL(`${origin}/robots.txt`),
  } as Parameters<typeof GET>[0]);
}

describe("GET /robots.txt", () => {
  it("targets all agents", async () => {
    const body = await (await get("https://example.com")).text();
    expect(body).toContain("User-agent: *");
  });

  // Asserted against the IMPORTED list, never a second copy of it. robots.txt
  // and the layout's `noindex` meta answer different questions about the same
  // routes, and a hard-coded expectation here would let one of the two drift
  // the moment a prefix is added.
  it("fences off exactly the routes $lib/seo marks noindex", async () => {
    const body = await (await get("https://example.com")).text();
    const disallowed = [...body.matchAll(/Disallow: (\S+)/g)].map((m) => m[1]);
    expect(disallowed).toEqual(NOINDEX_PREFIXES);
    expect(NOINDEX_ENFORCED).toBe(true);
  });

  it("points at the sitemap with an absolute URL on the request origin", async () => {
    const body = await (await get("https://example.com")).text();
    expect(body).toContain("Sitemap: https://example.com/sitemap.xml");
  });

  it("serves text/plain", async () => {
    const response = await get("https://example.com");
    expect(response.headers.get("Content-Type")).toBe("text/plain");
  });
});
