import { expect, test, type Page } from "@playwright/test";
import { openModal } from "./open-modal";

// THE MODAL WAS NEVER CENTRED.
//
// Tailwind preflight's `*{margin:0}` beats the UA's `dialog{margin:auto}`, and
// with the UA's `inset:0` still in force that pins the dialog to the top-left
// corner — `mx-4` restored the horizontal 16px and nothing else.
//
// That is GEOMETRY, and jsdom performs no layout, so Modal.test.ts cannot see
// it. This file is the actual measurement, which is why it exists at all.
const FIXTURES = "/dev/a11y-fixtures";

/** The containing block a `position: fixed` element is laid out in, measured
 *  with a probe rather than inferred.
 *
 *  Neither `page.viewportSize()` nor `document.documentElement.clientWidth` is
 *  that box, and this assertion failed a CORRECT implementation twice before
 *  the browser was asked. Both report 1280 here while the dialog is centred in
 *  1265: `body` is the scroll container (app.css gives it `overflow-y: auto`),
 *  so its 15px classic scrollbar never shows up in `html`'s clientWidth, but it
 *  does shrink the viewport a fixed element is centred in. Measuring the
 *  right-hand gap against 1280 makes a dead-centre dialog look 15px off.
 *
 *  A probe at `position: fixed; inset: 0` IS that containing block, by
 *  definition — no scrollbar arithmetic, and no dependence on whether the
 *  scroll lock has taken the scrollbar away yet. */
async function fixedViewport(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;inset:0;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
    const r = probe.getBoundingClientRect();
    probe.remove();
    return { width: r.width, height: r.height };
  });
}

test("the dialog is centred on both axes, not pinned to the corner", async ({ page }) => {
  await page.goto(FIXTURES, { waitUntil: "domcontentloaded" });

  const dialog = await openModal(page);
  const box = (await dialog.boundingBox())!;
  const layout = await fixedViewport(page);

  // The defect measured {x: 16, y: 0} — the 16px being `mx-4` and nothing else.
  // Both of these assertions fail against it, the vertical one hardest.
  const leftGap = box.x;
  const rightGap = layout.width - (box.x + box.width);
  const topGap = box.y;
  const bottomGap = layout.height - (box.y + box.height);

  expect(Math.abs(leftGap - rightGap), `horizontal gaps ${leftGap} / ${rightGap}`).toBeLessThan(2);
  expect(Math.abs(topGap - bottomGap), `vertical gaps ${topGap} / ${bottomGap}`).toBeLessThan(2);
  expect(topGap, "a dialog flush to the top edge is the pinned-corner bug").toBeGreaterThan(8);
});

test("it keeps its side gutter instead of overflowing on a narrow screen", async ({ page }) => {
  // `w-full mx-4` overflows below 544px: the width is resolved against the
  // containing block and the margins are then added on top of it.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(FIXTURES, { waitUntil: "domcontentloaded" });
  const dialog = await openModal(page);
  const box = (await dialog.boundingBox())!;
  const layoutWidth = (await fixedViewport(page)).width;
  expect(box.x, "left gutter").toBeGreaterThanOrEqual(8);
  expect(box.x + box.width, "right edge inside the viewport").toBeLessThanOrEqual(layoutWidth - 8);
});
