<script lang="ts">
  import type { Snippet } from 'svelte';

  type Side = 'top' | 'right' | 'bottom' | 'left';

  let {
    open = $bindable(false),
    side = 'right',
    title = 'Pannello',
    children
  }: {
    open?: boolean;
    side?: Side;
    title?: string;
    children: Snippet;
  } = $props();

  const panelClass: Record<Side, string> = {
    top: 'top-0 left-0 w-full h-80 rounded-b-2xl',
    right: 'top-0 right-0 h-full w-80 rounded-l-2xl',
    bottom: 'bottom-0 left-0 w-full h-80 rounded-t-2xl',
    left: 'top-0 left-0 h-full w-80 rounded-r-2xl'
  };
</script>

{#if open}
  <div
    class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
    onclick={() => (open = false)}
    role="presentation"
  ></div>

  <div class="fixed z-50 bg-white shadow-xl {panelClass[side]}">
    <div class="flex items-center justify-between border-b border-gray-200 p-4">
      <span class="text-lg font-semibold text-gray-800">{title}</span>
      <button
        onclick={() => (open = false)}
        class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        aria-label="Chiudi"
      >
        ✕
      </button>
    </div>

    <div class="overflow-y-auto p-4" style="height: calc(100% - 57px)">
      {@render children()}
    </div>
  </div>
{/if}
