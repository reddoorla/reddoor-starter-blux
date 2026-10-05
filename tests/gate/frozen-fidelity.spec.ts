import { test, expect, type ConsoleMessage, type Page } from "@playwright/test";

// Frozen-render fidelity specs. Drive the offline /dev/blux-frozen route (the
// real the-pointe freeze artifacts rendered through the production <FrozenPage>).
// The @smoke test asserts every slot token is substituted, the landmarks and nav
// labels render, and nothing throws. The untagged scaffold test pins the live
// layout (~15333px) and the 56 inline media backgrounds. Fonts + Blux-CDN source
// images legitimately load from third-party hosts here (dev fixture); real
// errors still fail via `pageerror`.
const ALLOWED_CONSOLE: RegExp[] = [
  /cloudfront\.net/i,
  /fonts\.g(oogleapis|static)\.com/i,
  /vimeo/i,
];
const allowed = (s: string) => ALLOWED_CONSOLE.some((re) => re.test(s));

function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error" && !allowed(m.text()) && !allowed(m.location()?.url ?? "")) {
      errors.push(m.text());
    }
  });
  page.on("pageerror", (e) => {
    if (!allowed(e.message)) errors.push(e.message);
  });
  return errors;
}

// The freeze settles + bakes the export's layout at a 1440px viewport, and its
// full-bleed bands are sized relative to viewport width. The height check MUST
// measure at that same width — at the Desktop-Chrome default (1280px) those
// bands reflow ~530px shorter (~14800px) and the height check misfires. Pin it
// to 1440.
test.use({ viewport: { width: 1440, height: 900 } });

test(
  "frozen the-pointe render contract: slots substituted, no page errors, landmarks and nav labels",
  { tag: "@smoke" },
  async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/dev/blux-frozen", { waitUntil: "load" });

    expect(await page.content()).not.toContain("⟦");
    await expect(page.getByRole("contentinfo")).toBeAttached();
    const nav = page.getByRole("navigation");
    await expect(nav).toContainText("Vision");
    await expect(nav).toContainText("Contact Us");
    expect(errors).toEqual([]);
  },
);

test("frozen the-pointe renders faithfully: ~15333px, 56 media, no tokens", async ({ page }) => {
  const errors = watchErrors(page);

  await page.goto("/dev/blux-frozen", { waitUntil: "load" });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  // Wait for web fonts to settle (they drive text height) rather than a blind sleep.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.waitForTimeout(500);

  // Layout height matches the live Blux site (~15333px). The band tolerates
  // cross-environment text reflow (macOS vs CI Linux, Google-Map tiles blocked by
  // CSP) while still catching gross regressions (the semantic render was 16487px;
  // a wrong viewport reflows to ~14800px — both fall outside this band).
  const height = await page.evaluate(() => document.body.scrollHeight);
  expect(height).toBeGreaterThan(15000);
  expect(height).toBeLessThan(15700);

  // All 56 data-* backgrounds are baked as inline declarations.
  const backgrounds = await page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLElement>("*")].filter((e) =>
        /url\(/.test(e.style.backgroundImage),
      ).length,
  );
  expect(backgrounds).toBeGreaterThanOrEqual(56);

  // No residual slot token survived substitution.
  expect(await page.content()).not.toContain("⟦");
  expect(errors).toEqual([]);
});
