import { expect, type Page } from "@playwright/test";

/** Retrying click: a single click can land on markup that has not hydrated yet,
 *  where it does nothing at all and is never retried. Re-issued until the
 *  Svelte-state dialog actually opens. (Same pattern, and the same reason, as
 *  tests/smoke/landscape.spec.ts.) */
export async function openModal(page: Page) {
  const trigger = page.getByRole("button", { name: "Open modal" });
  const dialog = page.locator("dialog[open]");
  await expect(async () => {
    await trigger.click();
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ timeout: 20000 });
  return dialog;
}
