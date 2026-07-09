<script lang="ts">
  import { api } from '$coframe/api/client';
  import PanelRenderer from '$coframe/components/PanelRenderer.svelte';
  import Panel from '$coframe/components/Panel.svelte';

  const PAGES = [
    { id: 'demo_author_list',  label: 'Authors' },
    { id: 'book_list',         label: 'Books' },
    { id: 'book_with_reviews', label: 'Books + Reviews' },
  ];

  let leftId  = $state('demo_author_list');
  let rightId = $state('book_list');

  type PanelState = {
    data: Record<string, unknown> | null;
    error: string | null;
    loading: boolean;
  };

  let left  = $state<PanelState>({ data: null, error: null, loading: false });
  let right = $state<PanelState>({ data: null, error: null, loading: false });

  async function loadPanel(id: string, target: PanelState) {
    target.data    = null;
    target.error   = null;
    target.loading = true;
    try {
      const res = await api.endpoint('get_page', { id });
      if (res.status === 'success') {
        target.data = res.data as Record<string, unknown>;
      } else {
        target.error = res.message ?? 'Unknown error';
      }
    } catch (e) {
      target.error = e instanceof Error ? e.message : String(e);
    } finally {
      target.loading = false;
    }
  }

  $effect(() => { loadPanel(leftId, left); });
  $effect(() => { loadPanel(rightId, right); });
</script>

<div class="flex h-full flex-col gap-3">

  <div class="flex-shrink-0 space-y-1">
    <h1 class="text-2xl font-semibold">Panel Stack Isolation</h1>
    <p class="text-sm text-gray-500">
      Due panel indipendenti — ogni <code class="rounded bg-gray-100 px-1">Panel</code> crea
      il proprio stack. Modifica/aggiungi in un panel senza interferire con l'altro.
      FK picker, navigazione e overlay rimangono confinati al panel di appartenenza.
    </p>
  </div>

  <!-- ── Selectors ─────────────────────────────────────────────────────────── -->
  <div class="flex flex-shrink-0 gap-6">
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Left</span>
      <select bind:value={leftId} class="input w-auto py-1 text-sm">
        {#each PAGES as p}
          <option value={p.id}>{p.label}</option>
        {/each}
      </select>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-xs font-medium text-gray-500 uppercase tracking-wide">Right</span>
      <select bind:value={rightId} class="input w-auto py-1 text-sm">
        {#each PAGES as p}
          <option value={p.id}>{p.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <!-- ── Two-panel layout ───────────────────────────────────────────────────── -->
  <div class="flex min-h-0 flex-1 gap-3">

    <!-- Left Panel -->
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex-shrink-0 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Panel A — {leftId}
      </div>
      <div class="flex-1 min-h-0 overflow-hidden rounded border border-gray-200 shadow-sm">
        {#if left.loading}
          <div class="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            Loading…
          </div>
        {:else if left.error}
          <div class="flex h-full items-center justify-center p-4">
            <div class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <strong>Error:</strong> {left.error}
            </div>
          </div>
        {:else if left.data}
          {#key leftId}
            <Panel class="h-full">
              <PanelRenderer panel={left.data} />
            </Panel>
          {/key}
        {:else}
          <div class="flex h-full items-center justify-center text-sm text-gray-400">
            Nessun dato
          </div>
        {/if}
      </div>
    </div>

    <!-- Right Panel -->
    <div class="flex min-w-0 flex-1 flex-col gap-1">
      <div class="flex-shrink-0 text-xs font-semibold text-gray-400 uppercase tracking-wide">
        Panel B — {rightId}
      </div>
      <div class="flex-1 min-h-0 overflow-hidden rounded border border-gray-200 shadow-sm">
        {#if right.loading}
          <div class="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
            <div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            Loading…
          </div>
        {:else if right.error}
          <div class="flex h-full items-center justify-center p-4">
            <div class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <strong>Error:</strong> {right.error}
            </div>
          </div>
        {:else if right.data}
          {#key rightId}
            <Panel class="h-full">
              <PanelRenderer panel={right.data} />
            </Panel>
          {/key}
        {:else}
          <div class="flex h-full items-center justify-center text-sm text-gray-400">
            Nessun dato
          </div>
        {/if}
      </div>
    </div>

  </div>

  <a href="/playground" class="flex-shrink-0 text-sm text-blue-600 hover:underline">← Playground</a>

</div>
