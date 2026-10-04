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
  import { createStack } from '$kitebase/stack/stack.svelte';
  import StackContainer from '$kitebase/stack/StackContainer.svelte';

  interface Props {
    children: Snippet;
    class?: string;
  }

  let { children, class: cls = '' }: Props = $props();

  const stack = createStack();
  setContext('kb:stack', stack);
</script>

<div class="kb-panel {cls}">
  {@render children()}
  {#if $stack.length > 0}
    <div class="kb-panel-overlay">
      <StackContainer {stack} />
    </div>
  {/if}
</div>

<style>
  .kb-panel {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .kb-panel-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
  }
</style>
