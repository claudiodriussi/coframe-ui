<script lang="ts">
  /**
   * Panel.svelte — stackable application area.
   *
   * Owns a StackInstance and injects it via context so that all descendants
   * (DataView, DataFormView, FKPickerView, widgets) can push/pop without
   * knowing about the stack structure.
   *
   * Usage:
   *   <Panel>
   *     <DataView view={...} />
   *   </Panel>
   *
   * Navigation (edit, FK picker, etc.) automatically overlays on top of the
   * panel content. Two sibling Panels have independent stacks.
   */
  import { setContext } from 'svelte';
  import type { Snippet } from 'svelte';
  import { createStack } from '$coframe/stack/stack.svelte';
  import StackContainer from '$coframe/stack/StackContainer.svelte';

  interface Props {
    children: Snippet;
    class?: string;
  }

  let { children, class: cls = '' }: Props = $props();

  const stack = createStack();
  setContext('cf:stack', stack);
</script>

<div class="cf-panel {cls}">
  {@render children()}
  {#if $stack.length > 0}
    <div class="cf-panel-overlay">
      <StackContainer {stack} />
    </div>
  {/if}
</div>

<style>
  .cf-panel {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .cf-panel-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
  }
</style>
