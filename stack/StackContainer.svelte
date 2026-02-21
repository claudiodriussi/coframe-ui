<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { stack } from './stack.svelte';
  import { fly } from 'svelte/transition';

  /**
   * Intercepts browser Back (type === 'popstate').
   * - stack > 1 pages: cancels navigation and pops.
   *   SvelteKit calls history.go(+1) internally, so the next Back
   *   triggers it again.
   * - stack = 1 (base page): lets through → SvelteKit navigates away.
   *   A single Back click is enough to exit, no fake history entries.
   */
  beforeNavigate(({ type, cancel }) => {
    if (type === 'popstate' && stack.length > 1) {
      cancel();
      stack.pop();
    }
  });
</script>

<div class="stack-container">
  {#each $stack as page, i (page.id)}
    <div
      class="stack-page"
      class:hidden={i < $stack.length - 1}
      transition:fly={{ x: 300, duration: 200 }}
    >
      <svelte:component this={page.component} {...page.props} />
    </div>
  {/each}
</div>

<style>
  .stack-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .stack-page {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: white;
  }

  .hidden {
    display: none;
  }
</style>
