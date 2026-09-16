import { NOINDEX_ENFORCED, NOINDEX_PREFIXES } from "$lib/seo";
import type { RequestHandler } from "./$types";

export const prerender = true;

// Replaces static/robots.txt so the Sitemap line can carry an absolute URL —
// the robots spec requires one, and a static file can't know its own origin.
// During prerender, `url.origin` comes from kit.prerender.origin (set from
// Netlify's URL env in svelte.config.js); local builds fall back to
// SvelteKit's placeholder origin, which is fine — robots.txt only matters
// on the deployed site.
export const GET: RequestHandler = ({ url }) => {
  // Fence crawlers off the dev/tooling routes (which `prerender = "auto"`
  // still emits as public static HTML) and Prismic preview URLs (which
  // canonicalize to the real page anyway). Content routes stay open. The list
  // is NOINDEX_PREFIXES in $lib/seo — the same one the layout's `noindex` meta
  // reads, so the two cannot drift. On the vite dev server the fence drops
  // entirely (a bare `Disallow:` is the spec's allow-everything rule) so the
  // fleet lighthouse audit can still score the fixtures page.
  const body = `User-agent: *
${NOINDEX_ENFORCED ? NOINDEX_PREFIXES.map((p) => `Disallow: ${p}`).join("\n") : "Disallow:"}

Sitemap: ${url.origin}/sitemap.xml
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain" },
  });
};
