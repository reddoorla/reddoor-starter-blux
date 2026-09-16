<!-- Orientation lockout. NOT mounted by the template, and mounting it site-wide
     is a WCAG 2.1 SC 1.3.4 (Orientation) failure: it paints an opaque,
     undismissable overlay over any coarse-pointer device held sideways under
     1024px, with nothing reachable behind it. It is kept as a primitive for the
     rare route whose content genuinely cannot render in landscape, where it must
     be paired with a way out. tests/smoke/landscape.spec.ts fails if the root
     layout mounts it again. -->
<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "$lib/transitions";
  import { trapFocus } from "$lib/actions/trapFocus";

  let showLandscapeModal = $state(false);

  onMount(() => {
    // `pointer: coarse` avoids the false positives on touchscreen laptops that
    // a `maxTouchPoints > 0` check would produce.
    const coarse = window.matchMedia("(pointer: coarse)");
    const landscape = window.matchMedia("(orientation: landscape) and (max-width: 1023px)");

    const update = () => {
      showLandscapeModal = coarse.matches && landscape.matches;
    };

    update();
    coarse.addEventListener("change", update);
    landscape.addEventListener("change", update);
    return () => {
      coarse.removeEventListener("change", update);
      landscape.removeEventListener("change", update);
    };
  });
</script>

{#if showLandscapeModal}
  <!-- No focusable children, so trapFocus only moves focus onto the container
       (no Tab trap, no Escape — see the action's header). Without it focus stays
       on the page hidden behind this overlay. -->
  <div
    transition:fade
    use:trapFocus
    role="dialog"
    aria-modal="true"
    aria-labelledby="landscape-heading"
    class="w-screen h-screen fixed bg-black flex justify-center items-center top-0 left-0 z-50"
  >
    <h3 id="landscape-heading" class="text-white">Please Switch to Portrait Mode</h3>
  </div>
{/if}
