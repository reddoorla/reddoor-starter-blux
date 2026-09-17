import { readFileSync, readdirSync } from "node:fs";
import adapter from "@sveltejs/adapter-netlify";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { SVELTE_EVENT_REPLAY_HASH } from "@reddoorla/maintenance/configs/svelte";

const slicemachine = JSON.parse(
  readFileSync(new URL("./slicemachine.config.json", import.meta.url), "utf-8"),
);
const PLACEHOLDER_SENTINEL = "your-prismic-repo-name";
const isPlaceholderRepo =
  (process.env.VITE_PRISMIC_ENVIRONMENT || slicemachine.repositoryName) === PLACEHOLDER_SENTINEL;

// The env-var route to the sentinel is a LOCAL-ONLY hatch (#120). Set in CI
// or on Netlify it makes `entries()` return [] so `/` is never prerendered,
// then tolerates the resulting 404s — a green build with no home page, from a
// variable that is invisible in the diff and persists indefinitely. Refuse it
// at module load so the failure is loud at the point someone reaches for it.
// The sentinel IN slicemachine.config.json is untouched: that is the
// documented fresh-clone state, and it is visible in the repo.
// Mirrored in tests/smoke/routes.ts, which reads the same variable.
if (
  process.env.VITE_PRISMIC_ENVIRONMENT === PLACEHOLDER_SENTINEL &&
  (process.env.CI || process.env.NETLIFY)
) {
  throw new Error(
    `VITE_PRISMIC_ENVIRONMENT=${PLACEHOLDER_SENTINEL} is a local-only hatch and is set in ` +
      "CI/Netlify: it would green a deploy that emits no home page (every Prismic route " +
      "prerenders as a tolerated 404). Unset it there; a site whose Prismic repository is " +
      "not ready should stay red, or keep the sentinel in slicemachine.config.json.",
  );
}

// A frozen Blux site commits page artifacts under src/lib/blux-frozen/frozen.
// Its prerendered pages keep dead Blux link artifacts — JS-driven `#n` slider
// anchors whose targets never existed statically — so tolerate missing fragment
// ids during the crawl rather than failing the build (a native site still fails
// loudly on a genuine broken in-page anchor).
let isFrozenSite = false;
try {
  isFrozenSite = readdirSync(new URL("./src/lib/blux-frozen/frozen", import.meta.url)).some((f) =>
    f.endsWith(".html"),
  );
} catch {
  // no frozen artifact dir → not a frozen site
}

// Google Maps CSP surface — per Google's documented Maps-JS requirements.
// These wildcards meaningfully widen script-src (storage.googleapis.com and
// *.googleusercontent.com host arbitrary user-uploaded content, and google.com
// exposes known JSONP gadgets), so they are added ONLY where a map can
// actually hydrate: frozen Blux sites, or any build carrying
// VITE_GOOGLE_MAPS_KEY — the same key that gates runtime hydration. Keyless
// native sites keep the tight baseline policy.
const wantsMapsCsp = isFrozenSite || !!process.env.VITE_GOOGLE_MAPS_KEY;
const mapsHosts = [
  "https://*.googleapis.com",
  "https://*.gstatic.com",
  "https://*.google.com",
  "https://*.ggpht.com",
  "https://*.googleusercontent.com",
];

/** @type {import('@sveltejs/kit').Config} */
const config = {
  compilerOptions: {
    warningFilter: (warning) => warning.code !== "element_invalid_self_closing_tag",
  },
  kit: {
    adapter: adapter(),
    // Until a clone is wired to a real Prismic repo, every Prismic-backed
    // route returns 404 during prerender. Tolerate that on the placeholder
    // so `pnpm build` (and Netlify CI) succeed; real sites still fail loudly
    // because `repositoryName` no longer matches the sentinel.
    prerender: {
      // Prerendered pages bake `url.origin` (canonical and og:url, via
      // $lib/seo) into their output at build time; without this it would be
      // SvelteKit's "http://sveltekit-prerender" placeholder. Netlify sets URL
      // to the site's production origin during builds. Local builds keep the
      // placeholder, which only shows up in build/ output, never in dev.
      // robots.txt and sitemap.xml are NOT prerendered: they must answer per
      // host, so the netlify.app mirror can differ from the real domain (#140).
      ...(process.env.URL ? { origin: process.env.URL } : {}),
      handleHttpError: ({ path, status, message, referrer }) => {
        if (isPlaceholderRepo && status === 404) {
          return;
        }
        // Cloudflare infrastructure paths are never prerenderable routes. Frozen
        // Blux HTML keeps a dead `/cdn-cgi/l/email-protection` link (Cloudflare's
        // email-obfuscation, only resolvable behind Cloudflare) — a 404 on it
        // during the crawl is expected, not a build failure. Frozen-only: on a
        // native site a /cdn-cgi/ link can only be pasted CMS content, and the
        // build should keep failing loudly so it gets fixed.
        if (isFrozenSite && status === 404 && path.startsWith("/cdn-cgi/")) {
          return;
        }
        throw new Error(
          `${status} ${path}${referrer ? ` (linked from ${referrer})` : ""}: ${message}`,
        );
      },
      // `/dev/*` fidelity gates prerender foreign fixture content (e.g. the
      // the-pointe catalog gate) whose in-page anchors (`/#n`) target ids that
      // exist on that content's own origin, not on this site's home. Those
      // routes are robots-excluded dev tooling, so a missing id is tolerated
      // only when every referrer is a dev gate — content routes keep failing
      // loudly on genuine broken anchors. (Latent until a native site first
      // prerendered `/` with real content: placeholder builds 404 `/`, so the
      // id check never ran against it.)
      handleMissingId: isFrozenSite
        ? "warn"
        : ({ referrers, message }) => {
            if (referrers.every((r) => r.startsWith("/dev/"))) return;
            throw new Error(message);
          },
      // A malformed URL in CMS-pasted rich text (e.g. a school name typed into a
      // hyperlink) is unparseable — it can never be a real route to crawl, and
      // one editor's typo must not fail the whole build. Warn (so it surfaces
      // for cleanup) and keep prerendering. Unlike handleHttpError's fail-loud
      // 404 policy, an invalid URL has no valid interpretation to preserve.
      // (Surfaced on a native site once a collection grid began linking into
      // entity bodies that carry such migrated link artifacts.)
      handleInvalidUrl: ({ href, referrer, message }) => {
        console.warn(
          `[prerender] skipped invalid URL ${JSON.stringify(href)}` +
            `${referrer ? ` (linked from ${referrer})` : ""} — fix the CMS link` +
            `${message ? ` [${message}]` : ""}`,
        );
      },
    },
    alias: {
      $components: "src/lib/components",
      "$components/*": "src/lib/components/*",
      $utils: "src/lib/utils",
      "$utils/*": "src/lib/utils/*",
      $stores: "src/lib/stores",
      "$stores/*": "src/lib/stores/*",
      $assets: "src/lib/assets",
      "$assets/*": "src/lib/assets/*",
    },
    // Baseline CSP for Prismic + Vimeo. Extend per project — any new CDN or
    // analytics host must be added to the relevant directive. SvelteKit
    // automatically adds nonces/hashes for inline scripts and styles it emits.
    csp: {
      mode: "auto",
      // Violations POST to /api/csp-report. To stage a stricter policy without
      // blocking, copy `directives` below into a sibling `reportOnly: { ... }`
      // block — SvelteKit will then emit a Content-Security-Policy-Report-Only
      // header alongside the enforced one.
      directives: {
        "default-src": ["self"],
        "script-src": [
          "self",
          "https://static.cdn.prismic.io",
          "https://player.vimeo.com",
          // Svelte 5 server-renders `onload="this.__e=event"` (and onerror) on
          // every element carrying an attribute spread — i.e. every
          // `<img {...getImageProps(field)} />` the Prismic helpers produce.
          // It is the replay stub for a load/error that fires before hydration.
          // A nonce NEVER covers an event-handler attribute, so without both of
          // the entries below the browser refuses to run it: the pre-hydration
          // load is dropped (anything keyed on it can strand) and one violation
          // is POSTed to /api/csp-report per image per page view — 12 on `/`
          // alone, measured on beachfront-dentistry 2026-08-13 — burying real
          // violations. 'unsafe-hashes' widens hash matching to event handlers
          // and NOTHING else, so only this exact one-liner is permitted; pair it
          // with 'unsafe-inline' and that guarantee is gone (scripts/csp-policy.test.ts
          // asserts we do not). The hash is imported, never transcribed: the
          // stub's text is upstream's to change, and a copied string cannot be
          // told apart from a stale one.
          //
          // Both entries sit in script-src to match the shared baseline in
          // @reddoorla/maintenance/configs/svelte (verified there in Chrome,
          // 2026-08-17). This file overrides script-src wholesale, so it has to
          // carry them itself.
          //
          // This comment used to say the `script-src-attr` form (vida-legacy-
          // foundation's) was avoided because Safari ignores that directive and
          // falls back to script-src. That was asserted without a measurement
          // (reddoor-starter#132), and a measurement refuted it (2026-09-16, re
          // vida-legacy-foundation#79): Playwright's WebKit 26.5 and Chromium
          // 151 behaved identically. Handler ran / blocked, WebKit / Chromium:
          //   vida's served policy (allowance in script-src-attr)   ran / ran
          //   the same policy minus script-src-attr                 blocked / blocked
          //   control, no allowance                                 blocked / blocked
          //   control, 'unsafe-hashes' + hash in script-src         ran / ran
          // So WebKit honours script-src-attr, and both forms work in both
          // engines. Caveat: that is Playwright's WebKit build, not a shipping
          // Safari.app. The form here is a consistency choice, not a Safari
          // workaround.
          "unsafe-hashes",
          SVELTE_EVENT_REPLAY_HASH,
          // Cloudflare Turnstile contact-form widget (enable via PUBLIC_TURNSTILE_SITE_KEY).
          "https://challenges.cloudflare.com",
          // Google Maps JS API — map hydration (VITE_GOOGLE_MAPS_KEY); see
          // wantsMapsCsp above for why this set is conditional.
          ...(wantsMapsCsp ? ["blob:", ...mapsHosts] : []),
        ],
        // Modern Maps JS spawns blob: workers; without this directive the
        // worker-src→script-src→default-src fallback lands on 'self' and
        // blocks them. Maps-gated: the baseline keeps no worker-src, exactly
        // as before the frozen layer.
        ...(wantsMapsCsp ? { "worker-src": ["self", "blob:"] } : {}),
        // Google Fonts stylesheet host — frozen Blux sites load their type from
        // fonts.googleapis.com (paired with fonts.gstatic.com under font-src).
        "style-src": ["self", "unsafe-inline", "https://fonts.googleapis.com"],
        "img-src": [
          "self",
          "data:",
          "https://images.prismic.io",
          "https://*.prismic.io",
          // Google Maps tiles, markers, and My-Maps KML pin sprites (pins are
          // served from mt.google.com / maps.google.com, not maps.gstatic).
          ...(wantsMapsCsp ? mapsHosts : []),
        ],
        // Prismic hosts non-image media (e.g. migrated .mp4 assets) on
        // <repo>.cdn.prismic.io — first-party content, same origin family as
        // images.prismic.io already allowed under img-src.
        "media-src": ["self", "https://*.vimeocdn.com", "https://*.prismic.io"],
        "frame-src": [
          "self",
          "https://player.vimeo.com",
          // Cloudflare Turnstile renders its challenge in an iframe from this host.
          "https://challenges.cloudflare.com",
          // Google Maps JS may frame google.com surfaces (per its CSP doc).
          ...(wantsMapsCsp ? ["https://*.google.com"] : []),
        ],
        "connect-src": [
          "self",
          "https://*.prismic.io",
          "https://static.cdn.prismic.io",
          // Google Maps JS API telemetry, tile and KML fetches.
          ...(wantsMapsCsp
            ? [
                "https://*.googleapis.com",
                "https://*.google.com",
                "https://*.gstatic.com",
                "data:",
                "blob:",
              ]
            : []),
        ],
        "font-src": ["self", "data:", "https://fonts.gstatic.com"],
        "base-uri": ["self"],
        "form-action": ["self"],
        "frame-ancestors": ["self"],
        "report-uri": ["/api/csp-report"],
      },
    },
  },
  preprocess: vitePreprocess(),
};

export default config;
