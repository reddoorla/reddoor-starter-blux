# CLAUDE.md

Session rules for AI agents working in this repo.

## What this repo is

`reddoor-starter-blux` is the **Blux track** of
[reddoor-starter](https://github.com/reddoorla/reddoor-starter): a full-history
snapshot of the native SvelteKit 2 / Svelte 5 / Tailwind v4 / Prismic template
taken 2026-08-31 at `82d93b0`, kept separate because it carries the Blux render
layer (`src/lib/blux`, `src/lib/blux-catalog`, `src/lib/blux-frozen`, the
`Blux*` slices, `/products/[slug]`, the frozen-page route, and the the-pointe
fidelity gates under `src/routes/dev/`). It is the render target of
`reddoor-maintenance/src/blux` and the template that
`/new-site <slug> --track blux` clones. Source lives in `src/`; slices in
`src/lib/slices/<Name>/` as `model.json` + `mocks.json` + `index.svelte` + test.

Commands: `pnpm lint`, `pnpm check`, `pnpm test` (`test:unit` then
`test:smoke`). There is no `pnpm verify` here — that script belongs to the
native starter, which has diverged.

## Two traps

- **Never plain-merge the native starter.** Verified 2026-09-01: the native
  template deleted the whole Blux layer in reddoor-starter#106, so
  `git merge starter/main` applies those 178 deletions as clean, CONFLICT-FREE
  removals and silently strips `src/lib/blux*`, every `Blux*` slice and the
  fidelity gates. Only `README.md` conflicts, so nothing warns you. Adopt a
  shared improvement with `git fetch starter && git cherry-pick <sha>`, and
  never merge this repo back into the native one.
- **`slicemachine.config.json` still holds the `your-prismic-repo-name`
  sentinel**, deliberately — prerender tolerates it so a fresh clone's CI build
  is green before the CMS exists.

## The work journal

**Every working session appends a dated entry to `docs/workJournal.md`** — what
was done and **why**, newest at the bottom, never corrected in place. Write it
as the last act of the session, not the first act of the next one.

The journal is the history of executing the build. Code says what the system
does now; the journal says what it used to do, what it cost to change, and
which beliefs turned out to be wrong. Nearly everything expensive to rediscover
lives there and nowhere else.

An entry is headed with the date, a short title, and where it landed:

```markdown
## 2026-09-04 — Both runway stages render their final frame without JS (#51, `ce46ae0`)
```

Then prose — not a bullet list of file names, which the diff already tells you.
What to put in, in rough order of value:

- **Why, over what.** The reason a thing was done survives; the diff does not
  need restating.
- **Measured numbers, exactly.** "The comp's open mask is 2696×2352 on an 860px
  band — 2.735× the band's height, so a 390×664 phone needs ~534%" is worth
  keeping. "Fixed the hero on mobile" is not.
- **Defects, named.** What broke, what it looked like, and what made it
  invisible until it wasn't.
- **What was tried and abandoned**, and what it would take to revive it. A dead
  end nobody wrote down gets walked twice.
- **Beliefs corrected on contact.** The design assumption that turned out false
  is usually the most valuable line in the entry.
- **Honest accounting.** If a win came from somewhere other than the change
  that claimed it, say so — that is exactly what someone will otherwise
  over-invest in next.

**History is never edited to be right.** An entry that stops being true is not
rewritten; a later entry corrects it, and says which one it corrects. The
journal is a record of what was believed at the time, and that record is most
useful precisely where it was wrong. Fixing the past in place destroys the only
evidence of how the mistake was made.

If a session produced nothing worth an entry, that is itself worth one line.
