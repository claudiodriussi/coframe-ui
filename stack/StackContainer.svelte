<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { stack } from './stack.svelte';
  import { fly } from 'svelte/transition';

  /**
   * Intercetta il Back del browser (type === 'popstate').
   * - stack > 1 pagine: cancella la navigazione e fa pop.
   *   SvelteKit chiama history.go(+1) internamente, così il Back
   *   successivo torna a farlo scattare.
   * - stack = 1 (pagina base): lascia passare → SvelteKit naviga via.
   *   Un solo click Back basta per uscire, nessun entry fake in history.
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
