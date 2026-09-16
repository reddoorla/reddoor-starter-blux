import { createClient, isFrozenSite, isPlaceholderRepo } from "$lib/prismicio";
import { frozenUids } from "$lib/blux-frozen/load";
import type { RequestHandler } from "./$types";

export const prerender = true;

/** Indexable routes that exist in the FILESYSTEM rather than in Prismic.
 *
 *  Everything below is discovered by querying the CMS, which structurally
 *  cannot see a hard-coded route — so /contact, linked from the template's own
 *  chrome and returning 200, was missing from the sitemap entirely. It is also
 *  `prerender = false` (a form action cannot live on a prerendered route), so
 *  no build-output census would have caught it either. Emitted even on an
 *  un-wired placeholder clone, because the route exists there too.
 *
 *  Only genuinely public, indexable routes belong here — never /dev/*, the
 *  slice simulator or /preview (see NOINDEX_PREFIXES in $lib/seo). */
const STATIC_ROUTES = ["/contact"];

export const GET: RequestHandler = async ({ fetch, url }) => {
  const origin = url.origin;

  // Sitemap entries as { path, lastmod }. A frozen Blux site's pages ARE its
  // committed frozen artifacts (home renders at "/"), never native `page` docs —
  // list those so the sitemap robots.txt advertises isn't silently empty. Build
  // time stands in for a frozen page's lastmod (it is rebaked whenever its
  // content republishes).
  const pageEntries: { path: string; lastmod: string }[] = isFrozenSite
    ? frozenUids().map((uid) => ({
        path: uid === "home" ? "/" : `/${uid}`,
        lastmod: new Date().toISOString(),
      }))
    : isPlaceholderRepo
      ? []
      : (await createClient({ fetch }).getAllByType("page")).map((page) => ({
          path: page.uid === "home" ? "/" : `/${page.uid}`,
          lastmod: new Date(page.last_publication_date ?? Date.now()).toISOString(),
        }));

  // Build time is the right lastmod for a static route: its content changes
  // when the code ships, which is exactly when this is regenerated.
  const entries = [
    ...pageEntries,
    ...STATIC_ROUTES.map((path) => ({ path, lastmod: new Date().toISOString() })),
  ];

  const urls = entries.map(
    ({ path, lastmod }) => `  <url>
    <loc>${origin}${path}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`,
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
};
