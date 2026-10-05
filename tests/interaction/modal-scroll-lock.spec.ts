import { expect, test } from "@playwright/test";
import { openModal } from "./open-modal";

// THE MODAL NEVER LOCKED THE PAGE BEHIND IT.
//
// `showModal()` puts the dialog in the top layer but does NOT stop the document
// behind it scrolling, which on a phone reads as the modal having closed.
//
// jsdom performs no layout and no scrolling — Modal.test.ts can only pin the
// mechanism (`overflow: hidden` on <body>). This file is the actual
// measurement. The wheel needs a window to land in, so it runs on the nightly
// list rather than in the @smoke gate (#175).
const FIXTURES = "/dev/a11y-fixtures";

test("the page behind the open modal does not scroll", async ({ page }) => {
  await page.goto(FIXTURES, { waitUntil: "domcontentloaded" });

  // The fixtures page is far taller than the viewport, so a wheel over it moves
  // the document — that is the control for this measurement.
  await page.mouse.move(200, 300);
  await page.mouse.wheel(0, 600);
  await expect
    .poll(() => page.evaluate(() => window.scrollY), {
      message: "control: the page scrolls at all before the modal is opened",
    })
    .toBeGreaterThan(0);

  await page.evaluate(() => window.scrollTo(0, 0));
  const dialog = await openModal(page);
  await expect(dialog).toBeVisible();

  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.move(200, 300);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => window.scrollY);

  expect(after, `document scrolled ${before} → ${after} behind the open modal`).toBe(before);
});
