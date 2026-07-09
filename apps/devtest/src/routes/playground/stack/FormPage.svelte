<script lang="ts">
  import { stack } from '$coframe/stack/stack.svelte';
  import LookupPage from './LookupPage.svelte';

  let nome = $state('');
  let citta = $state('');
  let categoria = $state('');

  function openCityLookup() {
    const cities = ['Roma', 'Milano', 'Napoli', 'Torino', 'Firenze', 'Bologna', 'Venezia'];
    stack.push(
      LookupPage,
      { items: cities, title: 'Seleziona città', allowCustom: true },
      (selected) => { if (selected) citta = selected as string; }
    );
  }

  function openCategoryLookup() {
    const categories = ['Elettronica', 'Abbigliamento', 'Alimentari', 'Sport', 'Casa'];
    stack.push(
      LookupPage,
      { items: categories, title: 'Seleziona categoria' },
      (selected) => { if (selected) categoria = selected as string; }
    );
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    alert(`Nome: ${nome}\nCittà: ${citta}\nCategoria: ${categoria}`);
  }
</script>

<div class="flex h-full flex-col bg-white p-6">
  <h1 class="mb-6 text-2xl font-bold text-gray-800">Form con Lookup</h1>

  <form onsubmit={handleSubmit} class="flex-1 space-y-6">
    <div>
      <label for="nome" class="mb-2 block text-sm font-medium text-gray-700">Nome</label>
      <input
        id="nome"
        type="text"
        bind:value={nome}
        placeholder="Inserisci il nome"
        class="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
      />
    </div>

    <div>
      <label for="citta" class="mb-2 block text-sm font-medium text-gray-700">Città</label>
      <div class="flex gap-2">
        <input
          id="citta"
          type="text"
          bind:value={citta}
          readonly
          placeholder="Seleziona città"
          class="flex-1 cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 px-4 py-2"
        />
        <button
          type="button"
          onclick={openCityLookup}
          class="rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
        >Scegli</button>
      </div>
    </div>

    <div>
      <label for="categoria" class="mb-2 block text-sm font-medium text-gray-700">Categoria</label>
      <div class="flex gap-2">
        <input
          id="categoria"
          type="text"
          bind:value={categoria}
          readonly
          placeholder="Seleziona categoria"
          class="flex-1 cursor-not-allowed rounded-lg border border-gray-300 bg-gray-50 px-4 py-2"
        />
        <button
          type="button"
          onclick={openCategoryLookup}
          class="rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600"
        >Scegli</button>
      </div>
    </div>

    <button
      type="submit"
      class="w-full rounded-lg bg-green-600 py-3 font-medium text-white hover:bg-green-700"
    >
      Invia
    </button>
  </form>
</div>
