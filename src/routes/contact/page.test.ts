import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/svelte";

type Settle = (opts: { update: () => Promise<void> }) => Promise<void>;

// `use:enhance`'s submit callback is captured so a case can drive the page
// through its sending state without a network.
const enhanced = vi.hoisted(() => ({ submit: undefined as undefined | (() => Settle) }));
vi.mock("$app/forms", () => ({
  enhance: (_form: HTMLFormElement, submit: () => Settle) => {
    enhanced.submit = submit;
    return { destroy() {} };
  },
}));
// No sitekey → TurnstileWidget renders nothing, as in dev and in CI.
vi.mock("$env/dynamic/public", () => ({ env: {} }));

const { default: ContactPage } = await import("./+page.svelte");

const props = (form: unknown = null) => ({ data: { formTs: 1_700_000_000_000 }, form }) as never;

afterEach(() => cleanup());

describe("the contact page's submit button", () => {
  it("is busy and disabled while sending, and comes back when it settles", async () => {
    // aria-busy so the state change reaches a screen reader instead of only
    // the accessible name silently mutating to "Sending…"; disabled so a
    // second click cannot send the message twice.
    const { container } = render(ContactPage, props());
    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.getAttribute("aria-busy")).toBe("false");
    expect(button.disabled).toBe(false);

    let settle!: Settle;
    await act(() => {
      settle = enhanced.submit!();
    });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.disabled).toBe(true);

    // An error response keeps the form mounted; the button must not stay dead.
    await act(() => settle({ update: async () => {} }));
    expect(button.getAttribute("aria-busy")).toBe("false");
    expect(button.disabled).toBe(false);
  });
});

describe("the contact page's confirmation", () => {
  // On success the form unmounts, which leaves focus on a submit button that no
  // longer exists — focus falls to <body> and a keyboard or screen-reader user
  // is dropped at the top of the document with no idea it went through.
  it("takes focus when it replaces the form", async () => {
    const { container } = render(ContactPage, props({ success: true }));
    const status = container.querySelector('[role="status"]') as HTMLElement;
    expect(status).not.toBeNull();
    expect(status.getAttribute("tabindex")).toBe("-1");
    await vi.waitFor(() => expect(document.activeElement).toBe(status));
  });
});
