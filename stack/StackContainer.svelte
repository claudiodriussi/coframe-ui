<script lang="ts">
  import { beforeNavigate } from '$app/navigation';
  import { setContext } from 'svelte';
  import { stack } from './stack.svelte';
  import { fly } from 'svelte/transition';

  // Signal to descendants (e.g. nested DataView) that they are inside a stack page.
  // This prevents inner DataViews from creating their own redundant StackContainer overlay.
  setContext('cf:inStack', true);

  interface Props {
    onExit?: () => void;
  }

  let { onExit }: Props = $props();

  // Pop on browser Back whenever the stack has pages; let SvelteKit navigate when empty.
  beforeNavigate(({ type, cancel }) => {
    if (type === 'popstate' && stack.length > 0) {
      cancel();
      stack.pop();
    }
  });

  // Fire onExit when the stack empties.
  $effect(() => {
    if ($stack.length === 0) onExit?.();
  });
</script>

<div class="stack-container">
  {#each $stack as page, i (page.id)}
    {@const Component = page.component}
    <div
      class="stack-page"
      class:hidden={i < $stack.length - 1}
      transition:fly={{ x: 300, duration: 200 }}
    >
      <Component {...page.props} />
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
