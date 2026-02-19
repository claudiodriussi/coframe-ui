<script lang="ts">
  import { stack } from '$coframe/stack/stack.svelte';

  let cityName = $state('');

  function confirm() {
    if (cityName.trim()) stack.pop(cityName.trim());
  }
</script>

<div class="flex h-full flex-col bg-white p-6">
  <h2 class="mb-6 text-2xl font-bold text-gray-800">Inserisci città</h2>

  <input
    type="text"
    bind:value={cityName}
    placeholder="Nome città"
    class="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
  />

  <div class="flex gap-2">
    <button
      onclick={confirm}
      disabled={!cityName.trim()}
      class="flex-1 rounded-lg bg-green-600 py-2 text-white hover:bg-green-700 disabled:bg-gray-300"
    >
      Conferma
    </button>
    <button
      onclick={() => stack.pop()}
      class="flex-1 rounded-lg bg-gray-200 py-2 text-gray-700 hover:bg-gray-300"
    >
      Annulla
    </button>
  </div>
</div>
