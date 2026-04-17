<script lang="ts">
  /**
   * Playground — DataForm Step A
   * Testa il form con binding locale (source.data) senza dipendenze backend.
   */
  import DataForm from '$coframe/components/DataForm.svelte';
  import type { FormDescriptor, FormStatus } from '$coframe/components/dataform.types';

  // ── Dati di test ───────────────────────────────────────────────────────────

  const autori = [
    { value: 1, label: 'Italo Calvino' },
    { value: 2, label: 'Umberto Eco' },
    { value: 3, label: 'Elena Ferrante' },
    { value: 4, label: 'Primo Levi' },
    { value: 5, label: 'Luigi Pirandello' },
  ];

  let bookData = $state({
    title: 'Il nome della rosa',
    author_id: 2,
    isbn: '978-88-452-0064-2',
    published_date: '1980-11-15',
    price: 18.50,
    pages: 502,
    in_print: true,
    notes: "Romanzo storico ambientato in un'abbazia medievale.",
  });

  // ── Descrittori form ───────────────────────────────────────────────────────

  const editDescriptor: FormDescriptor = {
    type: 'form',
    title: 'Scheda libro',
    policy: { editable: true },
    source: { autofocus: 'title' },
    fields: [
      { name: 'title',          label: 'Titolo',             required: true },
      { name: 'author_id',      label: 'Autore',             widget: 'combobox', choices: autori, required: true },
      { name: 'isbn',           label: 'ISBN',               help: 'Formato: 978-xx-xxx-xxxx-x' },
      { name: 'published_date', label: 'Data pubblicazione', type: 'date' },
      { name: 'price',          label: 'Prezzo',             type: 'Float',
        widget: 'number', widget_props: { prefix: '€' }, width: 140 },
      { name: 'pages',          label: 'Pagine',             type: 'Int',
        same_row: true, width: 110 },
      { name: 'in_print',       label: 'In stampa',          type: 'boolean' },
      { name: 'notes',          label: 'Note',               type: 'longstr',
        help: 'Descrizione breve o sinossi.' },
    ],
  };

  const readonlyDescriptor: FormDescriptor = {
    ...editDescriptor,
    policy: { editable: false },
  };

  // ── View mode + status ─────────────────────────────────────────────────────

  let mode = $state<'edit' | 'readonly'>('edit');
  let activeDescriptor = $derived(mode === 'edit' ? editDescriptor : readonlyDescriptor);

  // Demo: status nella toolbar
  let statusDemo = $state<FormStatus | undefined>(undefined);
  const statusOptions: Array<{ label: string; value: FormStatus | undefined }> = [
    { label: 'Nessuno', value: undefined },
    { label: 'Info',    value: { message: 'Caricamento dati in corso…', type: 'info' } },
    { label: 'Success', value: { message: 'Salvato alle 14:32', type: 'success' } },
    { label: 'Warning', value: { message: 'Attenzione: record modificato da un altro utente', type: 'warning' } },
    { label: 'Error',   value: { message: '3 campi con errori di validazione', type: 'error' } },
  ];

  // ── Save log ───────────────────────────────────────────────────────────────

  let savedLog = $state<{ ts: string; data: Record<string, unknown> }[]>([]);

  function handleSave(draft: Record<string, unknown>) {
    savedLog = [
      { ts: new Date().toLocaleTimeString('it-IT'), data: { ...draft } },
      ...savedLog.slice(0, 4),
    ];
    Object.assign(bookData, draft);
    statusDemo = { message: `Salvato alle ${new Date().toLocaleTimeString('it-IT')}`, type: 'success' };
    setTimeout(() => { statusDemo = undefined; }, 3000);
  }
</script>

<div class="mx-auto max-w-5xl">
  <h1 class="mb-1 text-xl font-semibold">DataForm — Step A (binding locale)</h1>
  <p class="mb-5 text-sm text-gray-500">
    Dati statici, nessuna chiamata al backend. ·
    <kbd class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">F12</kbd> o
    <kbd class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">Ctrl+Enter</kbd> salva ·
    <kbd class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">Esc</kbd> annulla ·
    <kbd class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">Enter</kbd> avanza campo
  </p>

  <!-- Controls -->
  <div class="mb-4 flex flex-wrap items-center gap-3">
    <!-- Editable toggle -->
    <div class="flex gap-1">
      <button
        class="btn {mode === 'edit' ? 'btn-primary' : 'btn-secondary'} py-1.5 text-xs"
        onclick={() => (mode = 'edit')}
      >Editabile</button>
      <button
        class="btn {mode === 'readonly' ? 'btn-primary' : 'btn-secondary'} py-1.5 text-xs"
        onclick={() => (mode = 'readonly')}
      >Read-only</button>
    </div>

    <span class="text-xs text-gray-300">|</span>

    <!-- Status demo -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-gray-500">Status toolbar:</span>
      <div class="flex gap-1">
        {#each statusOptions as opt}
          <button
            class="btn py-1 text-xs {statusDemo === opt.value ? 'btn-primary' : 'btn-secondary'}"
            onclick={() => (statusDemo = opt.value)}
          >{opt.label}</button>
        {/each}
      </div>
    </div>
  </div>

  <div class="flex gap-6 items-start">
    <!-- ── Form ─────────────────────────────────────────────── -->
    <div class="w-96 flex-shrink-0">
      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style="height: 560px">
        <DataForm
          view={activeDescriptor}
          data={{ ...bookData }}
          status={statusDemo}
          onSave={handleSave}
        >
          {#snippet toolbarExtra()}
            <!-- Esempio: indicatore step wizard (visibile solo in demo status) -->
            {#if statusDemo?.type === 'info'}
              <div class="flex items-center gap-1.5">
                <div class="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
                  <div class="h-full w-1/2 rounded-full bg-brand animate-pulse"></div>
                </div>
                <span class="text-xs text-gray-400">50%</span>
              </div>
            {/if}
          {/snippet}
        </DataForm>
      </div>
    </div>

    <!-- ── Debug ────────────────────────────────────────────── -->
    <div class="min-w-0 flex-1 space-y-4">
      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold text-gray-700">Dati iniziali (bookData)</h2>
        <pre class="overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-700">{JSON.stringify(bookData, null, 2)}</pre>
      </div>

      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold text-gray-700">
          Log salvataggi
          {#if savedLog.length > 0}
            <span class="ml-1 rounded-full bg-brand px-1.5 py-0.5 text-xs text-white">{savedLog.length}</span>
          {/if}
        </h2>
        {#if savedLog.length === 0}
          <p class="text-xs text-gray-400">Nessun salvataggio ancora.</p>
        {:else}
          <div class="space-y-3">
            {#each savedLog as entry, i}
              <div class="rounded border border-gray-100 bg-gray-50 p-2">
                <div class="mb-1 text-xs font-medium text-gray-500">{entry.ts} — #{savedLog.length - i}</div>
                <pre class="overflow-auto text-xs text-gray-700">{JSON.stringify(entry.data, null, 2)}</pre>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <a href="/playground" class="mt-6 block text-sm text-blue-600 hover:underline">← Playground</a>
</div>
