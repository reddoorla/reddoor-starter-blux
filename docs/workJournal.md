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
