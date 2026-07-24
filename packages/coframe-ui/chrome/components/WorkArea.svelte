<script lang="ts">
  import { getContext, type Snippet } from 'svelte';
  import StackContainer from '$coframe/stack/StackContainer.svelte';
  import { stack } from '$coframe/stack/stack.svelte';

  // The Desktop work-area. Renders the route content (provided by Chrome via
  // context) and overlays the navigation stack when it has pages.
  //
  // Single work-area for now (browser tabs cover multitasking). A tab container
  // is a future variant of this component, each tab owning its own stack.
  // Invariant: opening work from the sidebar is always a fresh mount
  // (stack.clear()+push in MenuSidebar) — no state is restored.
  const host = getContext<{ content?: Snippet }>('cf:chrome-content');
</script>

<div class="cf-workarea">
  <div class="cf-workarea-content">
    {@render host?.content?.()}
  </div>
  {#if $stack.length > 0}
    <div class="cf-workarea-stack">
      <StackContainer />
    </div>
  {/if}
</div>

<style>
  /* §2.4: the ancestors are height-defined + overflow-hidden; this is the
     single scroller. */
  .cf-workarea {
    position: absolute;
    inset: 0;
  }
  .cf-workarea-content {
    height: 100%;
    overflow: auto;
    padding: 1.5rem;
  }
  .cf-workarea-stack {
    position: absolute;
    inset: 0;
    background: var(--cf-bg);
  }
</style>
