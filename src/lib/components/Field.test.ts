import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/svelte";
import Field from "./Field.svelte";

afterEach(() => cleanup());

describe("Field", () => {
  it("renders a label associated with the input", () => {
    const { getByLabelText } = render(Field, { name: "email", label: "Email" });
    const input = getByLabelText("Email") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.tagName).toBe("INPUT");
    expect(input.name).toBe("email");
  });

  it("marks required fields with aria + visible indicator", () => {
    const { getByLabelText, getByText } = render(Field, {
      name: "email",
      label: "Email",
      required: true,
    });
    const input = getByLabelText(/Email/) as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(getByText("(required)")).toBeTruthy();
  });

  it("links description via aria-describedby", () => {
    const { getByLabelText, getByText } = render(Field, {
      name: "email",
      label: "Email",
      description: "We never share it.",
    });
    const input = getByLabelText("Email") as HTMLInputElement;
    const description = getByText("We never share it.");
    expect(input.getAttribute("aria-describedby")).toContain(description.id);
  });

  it("links error via aria-describedby and sets aria-invalid", () => {
    const { getByLabelText, getByRole } = render(Field, {
      name: "email",
      label: "Email",
      error: "Required",
    });
    const input = getByLabelText("Email") as HTMLInputElement;
    const alert = getByRole("alert");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain(alert.id);
    expect(alert.textContent).toBe("Required");
  });

  it("renders a textarea when type=textarea", () => {
    const { getByLabelText } = render(Field, {
      name: "msg",
      label: "Message",
      type: "textarea",
    });
    const textarea = getByLabelText("Message") as HTMLTextAreaElement;
    expect(textarea.tagName).toBe("TEXTAREA");
  });
});

// The control's skin, which had two defects a class list cannot show you.
describe("Field styling", () => {
  it("gives the input and the textarea the SAME classes", () => {
    // They carried two copy-pasted class lists, which is exactly how a fix
    // lands on one control and not the other — the invisible border below had
    // to be changed in two places.
    const input = render(Field, { name: "a", label: "A" });
    const inputClass = input.getByLabelText("A").getAttribute("class");
    input.unmount();

    const area = render(Field, { name: "b", label: "B", type: "textarea" });
    expect(area.getByLabelText("B").getAttribute("class")).toBe(inputClass);
  });

  it("draws a resting border that clears the 3:1 non-text minimum", () => {
    // --color-light is #e5e7eb: 1.20:1 against the white card, so the fields
    // read as invisible boxes and a visitor has to hunt for where to type.
    // WCAG 1.4.11 wants 3:1 for a control's boundary. --color-secondary
    // (#6b7280) is 4.83:1.
    const { getByLabelText } = render(Field, { name: "a", label: "A" });
    const cls = getByLabelText("A").getAttribute("class") ?? "";
    expect(cls).not.toContain("border-light");
    expect(cls).toContain("border-secondary");
  });

  it("keeps the forced-colors outline fallback on focus", () => {
    // In Tailwind v4 `outline-none` resolves to `outline-style: none` and takes
    // the forced-colors fallback with it; `outline-hidden` keeps the 2px
    // transparent outline the forced-colors palette repaints. Under forced
    // colours the ring is dropped by the engine, so that outline is the only
    // focus affordance left.
    const { getByLabelText } = render(Field, { name: "a", label: "A" });
    const cls = getByLabelText("A").getAttribute("class") ?? "";
    expect(cls).toContain("focus:outline-hidden");
    expect(cls).not.toContain("focus:outline-none");
  });
});
