# Reddoor Starter (Blux track) — Work Journal

Running log of build work: what was done, why, and where it landed.
Chronological — newest entry at the bottom. [README.md](../README.md) says what
the stack ships and how this track relates to the native starter; this is the
history of getting it there.

The convention is in [CLAUDE.md](../CLAUDE.md) under "The work journal". In
short: every working session appends a dated entry, prose over bullets, why
over what, and history is never edited to be right — a later entry corrects an
earlier one and says so.

---

## 2026-09-05 — Journal opened, and 276 commits summarised rather than reconstructed (`chore/work-journal`)

The journal starts today, so this first entry is a **backfill**: a deliberately
coarse summary written from the commit log, not from memory. Detail below this
line is trustworthy; detail above it is not, and nothing here should be cited
as though someone recorded it at the time. The commit log remains the record
for anything before 2026-09-05.

**What this repo is.** The Blux track of
[reddoor-starter](https://github.com/reddoorla/reddoor-starter) — a
full-history snapshot of the native SvelteKit 2 / Svelte 5 / Tailwind v4 /
Prismic template taken on 2026-08-31 at `82d93b0`, kept alive because it
carries the Blux render layer the native template then deleted. 139 tracked
files match `blux`: `src/lib/blux`, `blux-catalog`, `blux-frozen`, eleven
`Blux*` slices, the `/products/[slug]` and frozen-page routes, and the
the-pointe fidelity gates under `src/routes/dev/`. It is the render target of
`reddoor-maintenance/src/blux` and what `/new-site <slug> --track blux` clones.

**The eras, coarsely.** 276 commits, `initial` on 2024-02-22 to here: 72 in
2024, 68 in 2025, 136 in 2026. 2024 is essentially one month — 42 of its 72
commits land in March 2024, hand-building sliders, mastheads and placeholder
sections with one-line lowercase messages. 2024-07 through 2025-12 is slow
drift with long gaps: the Svelte 5 conversion (2025-04-15), Tailwind config
moved into CSS (2025-04-16), Vite 7 (2025-08-08), the transition overlay and
delayed link (2025-08). 2026 is where it becomes fleet infrastructure — pnpm
and TypeScript standards in April, the `animateIn` action built spec-first with
a written plan, a11y tests, then Node 24 + pnpm 11, the org's reusable CI
workflow, Renovate as a GitHub App, and the contact form. **July 2026 alone is
61 commits**, nearly all Blux: the catalog render pipeline (#78), the faithful
grid rhythm (#52–#66), the frozen-page render proven on `the-pointe-burbank`
and upstreamed (#82–#88).

**The trap that justifies this repo existing.** Verified 2026-09-01 and written
into the README banner by #2: `git merge starter/main` applies the native
template's 178 Blux deletions as clean, conflict-free removals. Only
`README.md` conflicts, so nothing warns you — the entire render layer is
silently stripped. Shared improvements are cherry-picked from the `starter`
remote, never merged.

**State as of this entry.** `main` at `182c663`, tree clean. Only four commits
are this fork's own: the bootstrap (`12e48d1`), the merge warning (#2), the
reusable-workflow bump to v1.4.1 (#4), and capped Prismic srcset widths with a
real `sizes` on every image (#5). In flight: a second worktree at
`.worktrees/reply-copy` holds `feat/cms-reply-copy` at `3500a65`, untouched by
this session.

**What changed today.** `CLAUDE.md` has never been tracked in this repo's
history — it was absent at the snapshot point and never added after — so it now
exists, carrying the work-journal convention plus the merge trap above. Every site cloned from this track now
starts with the convention rather than acquiring it later.

## 2026-10-04 — The simulator leaves the public pages' bundle; an encoded path gets the simulator's framing (#39, cherry-pick of reddoor-starter#168)

Cherry-picked from the native starter, not merged, per this repo's CLAUDE.md. The full reasoning, including the four fixes that were measured and failed, is in reddoor-starter's journal entry of the same title. In short: the `@prismicio/svelte` barrel statically re-exports `SliceSimulator`, so Rolldown put `@prismicio/simulator/kit` in the barrel's shared chunk. The fix is a Vite plugin (`scripts/prismic-barrel.ts`) that declares that one re-export-only module side-effect-free. The framing hook now asks `event.route.id`, not the raw pathname.

Blux carried more weight than the native starter, so it shed more. Each node's static-import closure, gzipped, before → after: home 57,927 → 53,705, `[uid]` 72,170 → 67,947, `/dev/blux-page` 56,304 → 52,124, `/dev/blux-pointe` 62,951 → 58,716, `/dev/a11y-fixtures` 59,999 → 55,505. Before, all five reached the simulator chunk. After, only `/slice-simulator` does. From `vite preview`, `/slice%2Dsimulator` went from `SAMEORIGIN` / `frame-ancestors 'self'` to the widened policy with no X-Frame-Options, and `/contact` stays `SAMEORIGIN`.

Two conflicts were resolved by hand. `vite.config.ts` kept blux's plugin list, which has no `privacyServices`, and added `prismicBarrel()`. This journal kept blux's history. Mutations re-run here all went red: the plugin removed, the hook back on the pathname, and the simulator markers missed.

The review follow-ups from reddoor-starter#168 came over the same way, by patch and not by merge. The first adds a test that each framed route id names a real `+page` directory, so a move into a route group cannot unframe the page silently. The second adds a smoke spec that asks the server for `/slice%2Dsimulator`; its control here is `/contact`, because blux has no `/privacy`. The third makes the build test fail rather than skip under `CI`. The fourth tightens the barrel guard so it rejects `export {} from` and `export * from`.
The production client was run in a browser too. Under `vite preview` and headless Chromium, `/contact`, `/slice-simulator` and `/slice%2Dsimulator` each returned 200 with no console or page errors, and both simulator paths rendered the simulator root.

## 2026-10-05 — The cloud-session hook, picked from the native starter (cherry-pick of reddoor-starter#167, `9fb434b`)

The native starter gained a SessionStart hook on 10-04 (reddoor-maintenance
Operator decision 70). Without it, a Claude cloud container cannot launch
the browser that the lockfile's Playwright names: the image's
`/opt/pw-browsers` lags behind it. On the native side that turned the axe
gate into `no results written`. This track's lockfile resolves the same
`@playwright/test` range, so it would hit the same gap, and `pnpm test:smoke`
needs that browser too. The hook is gated on `CLAUDE_CODE_REMOTE=true`, so
CI and laptops never run it.

It came across as a cherry-pick, per the rule above. Two parts of the
native commit did not apply as they were. The native CLAUDE.md sentence it
edits does not exist here, so this file gets its own short paragraph
instead. The hook's failure messages named `pnpm verify` and
`pnpm test:a11y`, which this track does not have, so they now name
`pnpm lint`, `check`, `test` and `test:smoke`. The `.gitignore` change
applied unchanged: `.claude/*` stays ignored except `settings.json` and
`hooks/`.

## 2026-10-05 — Tests build; they don't freeze: the hook and the tiers, picked from the native starter, and the fidelity gates split by what a red means (cherry-picks of reddoor-starter#169 and #180)

This PR brings over the native starter's pre-commit prettier hook (#169) and its three test tiers (#180). Both were cherry-picked, not merged, per the trap above. The reason is the same one roalson-interests#256 gave: a test that an agent built against a comp turns into a fence around a design decision once a human takes the site over. Blux needed it more than the native track, because every Blux site inherits the-pointe fidelity specs, and those sat inside the required check with a page-height band (15000–15700px at 1440), computed flex-basis, padding, font-size and an exact nav list.

The cherry-pick of #169 broke the lockfile, leaving a duplicate `tinyexec` key. pnpm then re-resolved and upgraded unrelated dependencies, so I threw that version away. The lockfile in this PR is blux's own, plus `pnpm add -D lint-staged simple-git-hooks`, which is the minimal diff. The cherry-pick of #180 conflicted in six places:

- It deleted COMPONENTS.md, STARTER.md and theme-contrast.test.ts, and those deletions were kept, because this track never had them.
- CLAUDE.md, this journal, accessibility.md, CtaBanner.test.ts and slice-simulator.spec.ts kept blux's version and were then edited by hand.

That conflict had a casualty that only surfaced in review. The `@smoke` tags on `slice-simulator.spec.ts` were in the dropped hunk (native tests `/privacy`, blux tests `/contact`). So under `--grep @smoke` the X-Frame-Options and frame-ancestors contract ran in no gate tier at all. The tags are now back on all four tests.

The fidelity gates were split by what each assertion would tell a client:

- **`@smoke` (gate).** A new frozen-render contract test checks four things: no `⟦` slot token survives, there are no page errors, `nav` and `footer` are present, and the nav contains "Vision" and "Contact Us" (containment, not the list). The pointe catalog test is tagged as is. It checks the fixture data, the map markup and that there are no errors, and its footer is now found by the `contentinfo` role, not a bare tag.
- **Scaffold.** The height band and the computed-style visual layer stay untagged. Two comments in them said "never weaken the assertion"; they are gone, because in the scaffold tier a human's design change is allowed to make them stale.

Playwright went from 8 `@smoke` tests of 20 to 14 of 21. In a local browser run, all 14 passed (51.8s, on an isolated `REDDOOR_SMOKE_PORT` so that the reddoor-website run in the same container could not lend this run its dev server). I added the native skip-link and `main#main-content` assertions to `tests/a11y/fixtures.spec.ts` (WCAG 2.4.1); #180 carried them, but blux never picked up the commit that introduced them. Breaking the layout's `href="#main-content"` turned all three fixture tests red, and they went green again once it was restored.

Unit side: 679 passed, 3 skipped (685 before). Changes by file:

- **Grid, SplitFeature, presentation, layout and the catalog cells.** These pinned the 4% column gutter four ways: a `GRID_GUTTER` literal, the `md:gap-x-[4%]` class string, and `calc(N% - 2%)` reserves. Those are replaced by coupled checks:
  - The rendered row's gap-x percentage equals the imported `GRID_GUTTER`.
  - Each cell's reserve ×2 equals the row's gap.
  - k cells plus the gutters fit in 100%.

  Review caught that my first rewrite still restated `rowCellBases`' formula without its ceil-to-4-decimals rounding, so 55 consistent gutters between 1.0 and 10.0 went red, 4.2 among them. The wrapping-grid case now checks the property instead.

- **The overlay caption guard.** It had become conditional on `opacity-0`. A slide-up reveal with no touch or focus variant passed silently. That is exactly the regression the test exists for: captions stranded on phones and for keyboard users. It now maps each class that hides the panel at rest to the classes that undo it, and requires an undo under hover, `hover:none` and `focus-within`.
- **Three `never leaks _valign/_fill/_overlay as CSS` assertions could never fail.** jsdom drops the invalid declaration, and so does a browser, so a client could never see the leak. They are deleted, not rewritten.
- **CtaBanner.** The test now computes contrast from the theme in Tailwind's cascade order: theme.css, then blux-theme.css, then app.css. Its `toHex()` reads oklch too. The native copy has the same gap: reddoor-starter#183.
- **artifacts.test.ts was vacuous.** Its guard compared the package name with `sveltekit-prismic-starter-t-lemos`. The 08-31 track split renamed the package to `sveltekit-prismic-starter-blux`, so the guard had passed with zero assertions ever since. It is now `it.runIf(...)` on the real name, so a scaffolded site reports it as skipped rather than as passed. beachfront-dentistry carries the same stale guard.

Found and not fixed: LocationMap's default inactive tab is white on rgb(145,159,173), 2.70:1, below AA (#41). The fallback is the-pointe's transcribed design value, so a replacement is a design call.

CLAUDE.md said "there is no `pnpm verify` here". That was wrong before this session began: `verify` predates the hook and runs lint, check, build and test, without the native axe step. Its nightly row named a "frozen carousel timing" spec, which does not exist. Both are corrected.

## 2026-10-26 — SvelteKit 3 and adapter-netlify 7 for the Blux track (#51)

Kit 2.70.3 → 3.1.0 and adapter-netlify 6.0.4 → 7.0.1, for GHSA-27mw-82g8-phjj. This supersedes Renovate's #48 and #45. The native starter's own migration (reddoor-starter#187 and #188) was cherry-picked, never merged: this repo's first trap is that a merge strips the Blux layer, and the cherry-pick conflicted in 17 files for the same reason. Every file blux had already deleted (the privacy route and services, `page-load.ts`, the `/dev` guard test, two native-only docs) stayed deleted. Blux's own route loaders, eslint config and CSP test were kept. The operator chose one PR into `main` over the staging flow (`reddoor-workspace` `decisions/2026-10-26-1522-blux-kit3-staging-or-main.md`): a template has no Netlify site, so a `staging` branch would have nothing to be checked against. `ci.yml` names a `netlify-site`, and the deploy-preview comment builds a URL from it, but no such site exists; the link 404s.

The config moved by hand, not by taking the starter's file. Blux's `svelte.config.js` had drifted from the starter's on purpose: the frozen-site and Google Maps CSP, the `/cdn-cgi/` and missing-id prerender handlers, and wider img- and connect-src. It had also never taken three later starter additions: `object-src`, the Prismic toolbar, and the repository frame-src. So `sveltekit.config.js` is blux's own policy in kit 3's flattened shape. The review confirmed the served CSP header is byte-identical to kit 2's apart from the nonce, both plain and with Maps plus a frozen artifact. Kit 3 types each CSP source as a literal template, which svelte-check enforced on blux's `string[]` Maps spreads (4 errors); they are `const` now. `error(404, { message })` became `error(404, message)` after kit 3 warned `error_body_deprecated` in the smoke run's server log.

Belief corrected on contact: that `Seo` was the only place the prerendered origin reached. Round 1's review found `ProductDetail`'s share links built from `page.url.href`. Under kit 2, `prerender.origin` made that the production origin. Under kit 3 the prerendered `/products/<slug>.html` shared `http://sveltekit-prerender/products/oak-table` on Facebook, Twitter and Pinterest. Hydration rewrote the links, so only no-JS visitors and anything reading the static HTML saw it. The existing test asserted the encoded url on a live `page.url`, so it never met the prerender placeholder. They now go through `canonicalUrl`, and `ProductDetail.prerender.test.ts` fails with `page.url.href` restored.

Measured. `pnpm verify`: svelte-check 0/0, 704 unit tests, 14 `@smoke`, including the the-pointe catalog fixture, the frozen render contract and the Blux band axe check. The full e2e suite is 21 of 21 on this branch and on `main`. The brief's prerender-origin mutation needed real content, because the template prerenders nothing on its placeholder repo. So blux was built on 29-navy's Prismic content, which reads publicly: with `URL` set, 4 files, 1 carrying the production origin, none the placeholder; with `URL` unset, `index.html` carries the placeholder. Dropping `csp` from the config fails two tests. Not covered by any test, here or at base: deleting the frozen `/cdn-cgi/` branch, `handleMissingId` or the Maps CSP condition still passes the whole suite (filed).

## 2026-10-27 — Fleet test audit: the design-value pins go, the four layout contracts stay (#53)

Why: the fleet test audit (reddoorla/reddoor-workspace `audits/2026-10-26-fleet-test-audit/report.md`, batch C for the Blux starter) flagged 82 assertions here and found six tests that break "Tests build; they don't freeze". The reviewers wrote nine mutants against what the audited diff removed. Two were still caught on the branch, three were judged design values, and four were real bugs the diff would have let through. One mutant (`collection-extra-link-outside-cards`) never caught anything a client would notice.

What went, and why it was safe. `animateIn.test.ts`'s exact `toBe("400ms")` became two value-free relations: `delayMax: 0` gives no delay, and a larger `delayMax` gives a larger delay than the default. The two mutants it no longer catches (dividing by `outerWidth`, capping at 600 ms) only shorten a stagger; content still reveals. `ProductListing.test.ts` no longer counts exactly three links: it asserts one `/products/<slug>` link per product, so a heading anchor or a back link is a designer's call. `BluxCollection.test.ts` counts only the card list's anchors. Those two files are byte-identical in the Blux sites, so their hunks are also published as an inherit patch for those copies. Grid's wrapping-grid test drops `toBeCloseTo(GRID_GUTTER * 3 / 4)`. The probe shows its mutant (reserving per cell, not per line) is still caught elsewhere on the branch.

The source change: Grid.svelte's row gap was the literal `md:gap-x-[4%]`, kept "in sync" with `GRID_GUTTER` in `presentation.ts` by a comment. The row now sets `--grid-gutter` from `GRID_GUTTER`, and the gap is `md:gap-x-(--grid-gutter)`. One number now feeds both the reserve and the gap. The production build emits `.md\:gap-x-\(--grid-gutter\){column-gap:var(--grid-gutter)}`.

Kept, each proved red by its mutant (4 red of 4, `mutate.mjs --in-place` at the commit before this entry):

- `grid-cell-drops-basis`: the cell-consumes-`--cell-basis` wiring check in Grid.test is back as it was. It names no width. Without it, a cell losing `md:basis-(--cell-basis)` stacks every Blux row full width on desktop while the custom property still reads correctly.
- `grid-gap-drifts-from-gutter` (probe verdict `manual`): the reviewer's mutant edited `md:gap-x-[4%]`, which no longer exists, so I judged it by reading. The diff's new check only reads `--grid-gutter` off the row's style, which stays set if the gap class is dropped or hard-coded. Grid.test now also asserts that the row's gap class consumes the variable. The post-diff analogue mutant, `md:gap-x-[5%]`, turns it red.
- `split-gap-wider-than-reserve` and `split-media-cell-drops-reserve`: the deleted SplitFeature test, "reserves half the row's column gutter out of each cell's basis", is restored unchanged. It asserts a relation (reserve × 2 = gap) and names no value, so a designer can move the gutter as long as both sides move. I did not route SplitFeature through `--grid-gutter` the way Grid now is: that is a component change beyond this audit.

Checks: prettier and eslint clean; 113 vitest files, 701 passed and 3 skipped; `vite build` green. svelte-check showed 24 errors in the worktree, all in untouched route files (`./$types` not found). Kit 3 writes `$app/tsconfig` into `node_modules`, and the worktree's `node_modules` is a symlink to the clone's, so the generated `rootDirs` pointed at the clone's `.svelte-kit/types`. Run from the clone at the branch SHA, svelte-check was 0 errors, 0 warnings. That surprised me: with kit 3, a worktree that borrows `node_modules` cannot type-check its own routes. No Playwright spec changed.

## 2026-10-27 — `@prismicio/svelte` 3, with the slice simulator's slot turned into a snippet (reddoor-maintenance P1-80)

Ported from reddoor-starter's commit for the same change, applied by hand rather than cherry-picked because the two lockfiles differ. v3 (published 10-27, peer `@sveltejs/kit ^3`) makes `SliceSimulator` a Svelte 5 component taking `children: Snippet<[{ slices }]>`, so the `<SliceSimulator let:slices>` form fails `svelte-check` after the bump (`'$$_rotalumiSecilS0.$$slot_def' is of type 'unknown'`, `src/routes/slice-simulator/+page.svelte:7:26`). Measured on this branch: 1 error with the bump and the old file, 0 with `{#snippet children({ slices })}`; `pnpm verify` then green, 704 unit tests and 14 `@smoke`. The snippet form does not typecheck on 2.x, so bump and change land together. Nothing renders `/slice-simulator` inside Prismic's builder, so the type check and the build are the evidence, not a test.

Not done here: `src/lib/components/PrismicPreview.svelte` is still the local kit 3 copy. 3.0.0 is the kit 3 release it was waiting for, but upstream's `kit/PrismicPreview.svelte` differs from the copy (route-prefix handling), so switching back is a separate change, filed on reddoor-starter.
