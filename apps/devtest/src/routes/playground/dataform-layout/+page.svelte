<script lang="ts">
  /**
   * Playground — DataForm layout engine (sofisticato), descriptor-driven.
   * Il form (layout column-first, tabs, width%/px, filler) e i dati di default
   * arrivano dal server via get_page (plugin wizards → product_demo_form).
   * Backend richiesto su localhost:8300.
   */
  import { onMount } from 'svelte';
  import DataForm from '$coframe/components/DataForm.svelte';
  import { api } from '$coframe/api/client';
  import type { FormDescriptor } from '$coframe/components/dataform.types';

  // ── Descriptor + dati caricati dal server ──────────────────────────────────

  let view        = $state<FormDescriptor | null>(null);
  let initialData = $state<Record<string, unknown>>({});
  let loadError   = $state<string | null>(null);

  onMount(async () => {
    const res = await api.endpoint('get_page', { id: 'product_demo_form' });
    if (res.status === 'success') {
      const page = res.data as Record<string, unknown>;
      const content = page.content as FormDescriptor;
      view = content;
      initialData = (content.source?.data as Record<string, unknown>) ?? {};
    } else {
      loadError = res.message ?? 'Errore caricamento descriptor';
    }
  });

  // ── Save log ─────────────────────────────────────────────────────────────

  let savedLog = $state<{ id: number; ts: string; data: Record<string, unknown> }[]>([]);
  let saveSeq = 0;

  function handleSave(draft: Record<string, unknown>) {
    savedLog = [
      { id: ++saveSeq, ts: new Date().toLocaleTimeString('it-IT'), data: { ...draft } },
      ...savedLog.slice(0, 4),
    ];
  }
</script>

<div class="mx-auto max-w-6xl">
  <h1 class="mb-1 text-xl font-semibold">DataForm — Layout engine (descriptor-driven)</h1>
  <p class="mb-5 text-sm text-gray-500">
    Descriptor e dati di default dal server (<code>get_page → product_demo_form</code>,
    plugin <code>wizards</code>). Backend richiesto su <code>localhost:8300</code>. ·
    <kbd class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">Ctrl+Enter</kbd> salva ·
    <kbd class="rounded bg-gray-100 px-1.5 py-0.5 text-xs">Esc</kbd> annulla
  </p>

  <div class="flex items-start gap-6">
    <!-- ── Form ─────────────────────────────────────────────── -->
    <div class="min-w-0 flex-1">
      {#if loadError}
        <div class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
      {:else if !view}
        <div class="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-400">Caricamento descriptor…</div>
      {:else}
        <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm" style="height: 620px">
          <DataForm
            {view}
            data={{ ...initialData }}
            onSave={handleSave}
          />
        </div>
      {/if}
    </div>

    <!-- ── Debug ────────────────────────────────────────────── -->
    <div class="w-80 flex-shrink-0 space-y-4">
      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 class="mb-3 text-sm font-semibold text-gray-700">
          Log salvataggi
          {#if savedLog.length > 0}
            <span class="ml-1 rounded-full bg-brand px-1.5 py-0.5 text-xs text-white">{savedLog.length}</span>
          {/if}
        </h2>
        {#if savedLog.length === 0}
          <p class="text-xs text-gray-400">Nessun salvataggio ancora. Il pulsante Conferma è attivo anche senza modifiche.</p>
        {:else}
          <div class="space-y-3">
            {#each savedLog as entry, i (entry.id)}
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
