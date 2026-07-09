<script lang="ts">
  /**
   * Playground — DataForm Step B
   * Testa il form endpoint-driven (source.endpoint / save_endpoint).
   * Richiede backend attivo su localhost:8300.
   */
  import DataForm from '$coframe/components/DataForm.svelte';
  import type { FormDescriptor } from '$coframe/components/dataform.types';

  // ── Descriptor endpoint-driven ────────────────────────────────────────────

  // Passa i parametri del db.get direttamente come pass — DataForm li invia all'endpoint.
  // In un'app reale si userebbe un endpoint custom (es. get_book_detail).
  const bookDescriptor: FormDescriptor = {
    type: 'form',
    title: 'Scheda libro',
    policy: { editable: true, toolbar_position: 'bottom', button_align: 'right' },
    source: {
      endpoint: 'db',
      pass: { table: 'Book', method: 'get', id: 1 },
      save_endpoint: 'db',
    },
    fields: [
      { name: 'title',          label: 'Titolo',             required: true },
      { name: 'isbn',           label: 'ISBN' },
      { name: 'published_date', label: 'Data pubblicazione', type: 'date' },
    ],
  };

  // Trigger-driven: aspetta il trigger prima di caricare
  const triggerDescriptor: FormDescriptor = {
    type: 'form',
    title: 'Dettaglio libro (trigger-driven)',
    policy: { editable: false },
    source: {
      endpoint: 'db',
      pass: { table: 'Book', method: 'get', id: '$trigger.id' },
    },
    fields: [
      { name: 'title',          label: 'Titolo' },
      { name: 'isbn',           label: 'ISBN' },
      { name: 'published_date', label: 'Data pubblicazione', type: 'date' },
    ],
  };

  // ── Trigger simulator ─────────────────────────────────────────────────────

  let triggeredId = $state<number | undefined>(undefined);
  let triggerPayload = $derived(
    triggeredId !== undefined ? { id: triggeredId } : undefined
  );

  // ── Save log ──────────────────────────────────────────────────────────────

  let saveLog = $state<{ ts: string; op: string }[]>([]);

  function logSave(draft: Record<string, unknown>) {
    saveLog = [
      { ts: new Date().toLocaleTimeString('it-IT'), op: JSON.stringify(draft) },
      ...saveLog.slice(0, 4),
    ];
  }
</script>

<div class="mx-auto max-w-5xl">
  <h1 class="mb-1 text-xl font-semibold">DataForm — Step B (endpoint-driven)</h1>
  <p class="mb-5 text-sm text-gray-500">
    Caricamento e salvataggio via <code>api.endpoint</code>. Backend richiesto su
    <code>localhost:8300</code>. ·
    <kbd class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">Ctrl+Enter</kbd> salva ·
    <kbd class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">Esc</kbd> annulla
  </p>

  <div class="flex gap-6 items-start">

    <!-- ── Colonna sinistra: i due form ────────────────────────────────── -->
    <div class="flex w-96 flex-shrink-0 flex-col gap-6">

      <!-- Form endpoint-driven (editable) -->
      <div>
        <h2 class="mb-2 text-sm font-semibold text-gray-600">Endpoint-driven (editable)</h2>
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
             style="height: 280px">
          <DataForm
            view={bookDescriptor}
            onSave={logSave}
          />
        </div>
      </div>

      <!-- Form trigger-driven (read-only) -->
      <div>
        <h2 class="mb-2 text-sm font-semibold text-gray-600">Trigger-driven (read-only)</h2>
        <div class="mb-2 flex items-center gap-2">
          <span class="text-xs text-gray-500">Seleziona libro:</span>
          {#each [1, 2, 3] as id}
            <button
              class="btn py-1 text-xs {triggeredId === id ? 'btn-primary' : 'btn-secondary'}"
              onclick={() => (triggeredId = id)}
            >#{id}</button>
          {/each}
          <button
            class="btn btn-secondary py-1 text-xs"
            onclick={() => (triggeredId = undefined)}
          >Reset</button>
        </div>
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
             style="height: 220px">
          <DataForm
            view={triggerDescriptor}
            trigger={triggerPayload}
          />
        </div>
      </div>

    </div>

    <!-- ── Colonna destra: log ─────────────────────────────────────────── -->
    <div class="min-w-0 flex-1">
      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold text-gray-700">
          Log salvataggi
          {#if saveLog.length > 0}
            <span class="ml-1 rounded-full bg-brand px-1.5 py-0.5 text-xs text-white">
              {saveLog.length}
            </span>
          {/if}
        </h2>
        {#if saveLog.length === 0}
          <p class="text-xs text-gray-400">Nessun salvataggio ancora.</p>
        {:else}
          <div class="space-y-2">
            {#each saveLog as entry}
              <div class="rounded border border-gray-100 bg-gray-50 p-2">
                <div class="mb-1 text-xs font-medium text-gray-500">{entry.ts}</div>
                <pre class="overflow-auto text-xs text-gray-700">{entry.op}</pre>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

  </div>

  <a href="/playground" class="mt-6 block text-sm text-blue-600 hover:underline">← Playground</a>
</div>
