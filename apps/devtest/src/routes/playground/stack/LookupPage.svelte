<script lang="ts">
  import { stack } from '$coframe/stack/stack.svelte';
  import CustomCityPage from './CustomCityPage.svelte';

  interface Props {
    items: string[];
    title?: string;
    allowCustom?: boolean;
  }
  let { items, title = "Scegli un'opzione", allowCustom = false }: Props = $props();

  function selectItem(item: string) {
    stack.pop(item);
  }

  function openCustom() {
    stack.push(CustomCityPage, {}, (customValue) => {
      if (customValue) stack.pop(customValue);
    });
  }
</script>

<div class="flex h-full flex-col bg-white p-6">
  <div class="mb-6 flex items-center justify-between">
    <h2 class="text-2xl font-bold text-gray-800">{title}</h2>
    <button
      onclick={() => stack.pop()}
      class="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
    >
      Annulla
    </button>
  </div>

  <div class="flex-1 overflow-auto">
    <ul class="space-y-2">
      {#each items as item}
        <li>
          <button
            onclick={() => selectItem(item)}
            class="w-full rounded-lg border border-gray-200 bg-white p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            {item}
          </button>
        </li>
      {/each}
      {#if allowCustom}
        <li>
          <button
            onclick={openCustom}
            class="w-full rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-4 text-left text-blue-700 hover:bg-blue-100"
          >
            + Altra...
          </button>
        </li>
      {/if}
    </ul>
  </div>
</div>
