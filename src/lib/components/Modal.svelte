<script lang="ts">
  import { X } from "@lucide/svelte";
  import type { Snippet } from "svelte";

  interface ModalProps {
    open: boolean;
    onclose?: () => void;
    /** Accessible name for the dialog. Children arrive as an opaque snippet, so
     *  the component cannot derive one — pass `label` or `labelledby`. */
    label?: string;
    /** id of an element inside the modal (usually its heading) that names it. */
    labelledby?: string;
    class?: string;
    children?: Snippet;
  }

  let {
    open = $bindable(false),
    onclose,
    label,
    labelledby,
    class: passedClasses = "",
    children,
  }: ModalProps = $props();

  let dialogEl: HTMLDialogElement | undefined = $state();

  // No use:trapFocus here: showModal() already gives native focus containment,
  // Escape handling, and focus restore — adding the action would double-trap.
  $effect(() => {
    if (!dialogEl) return;
    if (open && !dialogEl.open) {
      dialogEl.showModal();
    } else if (!open && dialogEl.open) {
      dialogEl.close();
    }
  });

  function close() {
    open = false;
    onclose?.();
  }

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === dialogEl) close();
  }
</script>

<dialog
  bind:this={dialogEl}
  onclose={close}
  onclick={handleBackdropClick}
  aria-label={label}
  aria-labelledby={labelledby}
  class="bg-transparent p-0 max-w-lg w-full mx-4 backdrop:bg-black/50 backdrop:backdrop-blur-sm open:animate-[fade-in_200ms_ease-out]"
>
  <div
    class="relative bg-white rounded-lg shadow-xl w-full max-h-[90vh] overflow-y-auto {passedClasses}"
  >
    <!-- 44px hit target around the 20px glyph (WCAG 2.5.8); same pattern as Nav.svelte. -->
    <button
      type="button"
      onclick={close}
      class="absolute top-2 right-2 flex min-h-11 min-w-11 items-center justify-center text-dark/60 hover:text-dark transition cursor-pointer"
      aria-label="Close"
    >
      <X size={20} />
    </button>
    <div class="p-8">
      {@render children?.()}
    </div>
  </div>
</dialog>

<style>
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>
