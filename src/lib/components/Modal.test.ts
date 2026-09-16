import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import Modal from "./Modal.svelte";

afterEach(() => cleanup());

const body = () =>
  createRawSnippet(() => ({
    render: () => "<p>Modal body</p>",
  }));

beforeEach(() => {
  // jsdom < v26 polyfill: ensure showModal/close exist
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
});

describe("Modal", () => {
  it("renders children when open", () => {
    const { getByText } = render(Modal, { open: true, children: body() });
    expect(getByText("Modal body")).toBeTruthy();
  });

  it("calls onclose when close button is clicked", async () => {
    const onclose = vi.fn();
    const { getByLabelText } = render(Modal, {
      open: true,
      onclose,
      children: body(),
    });

    await fireEvent.click(getByLabelText("Close"));
    expect(onclose).toHaveBeenCalled();
  });

  it("closes on backdrop click (click on dialog itself, not children)", async () => {
    const onclose = vi.fn();
    const { container } = render(Modal, {
      open: true,
      onclose,
      children: body(),
    });

    const dialog = container.querySelector("dialog")!;
    await fireEvent.click(dialog);
    expect(onclose).toHaveBeenCalled();
  });

  it("does not close when clicking the inner content", async () => {
    const onclose = vi.fn();
    const { getByText } = render(Modal, {
      open: true,
      onclose,
      children: body(),
    });

    await fireEvent.click(getByText("Modal body"));
    expect(onclose).not.toHaveBeenCalled();
  });

  // Children arrive as an opaque snippet, so the component cannot derive a
  // name for the dialog itself — callers supply one (#123).
  it("forwards `label` to the dialog as aria-label", () => {
    const { container } = render(Modal, {
      open: true,
      label: "Request a quote",
      children: body(),
    });

    const dialog = container.querySelector("dialog")!;
    expect(dialog.getAttribute("aria-label")).toBe("Request a quote");
  });

  it("forwards `labelledby` to the dialog as aria-labelledby", () => {
    const { container } = render(Modal, {
      open: true,
      labelledby: "quote-heading",
      children: body(),
    });

    const dialog = container.querySelector("dialog")!;
    expect(dialog.getAttribute("aria-labelledby")).toBe("quote-heading");
  });

  it("sets no name attributes when the caller supplies none", () => {
    const { container } = render(Modal, { open: true, children: body() });

    const dialog = container.querySelector("dialog")!;
    expect(dialog.hasAttribute("aria-label")).toBe(false);
    expect(dialog.hasAttribute("aria-labelledby")).toBe(false);
  });

  // WCAG 2.5.8: the 20px glyph alone is under the 24px minimum. Tailwind
  // preflight zeroes button padding, so the hit target has to come from the
  // class list — the same min-h-11/min-w-11 (44px) pattern Nav.svelte uses.
  it("gives the close button a 44px hit target around the 20px icon", () => {
    const { getByLabelText } = render(Modal, { open: true, children: body() });

    const button = getByLabelText("Close");
    for (const cls of ["flex", "min-h-11", "min-w-11", "items-center", "justify-center"]) {
      expect(button.classList.contains(cls), `close button missing ${cls}`).toBe(true);
    }
    const icon = button.querySelector("svg")!;
    expect(icon.getAttribute("width")).toBe("20");
    expect(icon.getAttribute("height")).toBe("20");
  });
});
