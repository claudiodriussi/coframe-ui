<script lang="ts">
  import { api } from '$coframe/api/client';
  import PanelRenderer from '$coframe/components/PanelRenderer.svelte';
  import Panel from '$coframe/components/Panel.svelte';

  const LAYOUTS = [
    {
      id: 'book_demo_bottom_full',
      label: 'Layout A — bottom full width',
      desc: 'panels: [detail(right), bottom] — bottom is outermost → spans full width',
    },
    {
      id: 'book_demo_right_full',
      label: 'Layout B — right full height',
      desc: 'panels: [bottom, detail(right)] — detail is outermost → spans full height',
    },
  ];

  let selectedId = $state(LAYOUTS[0].id);
  let panel = $state<Record<string, unknown> | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(false);

  const selected = $derived(LAYOUTS.find(l => l.id === selectedId)!);

  async function loadPanel(id: string) {
    panel = null;
    error = null;
    loading = true;
    try {
      const res = await api.endpoint('get_page', { id });
      if (res.status === 'success') {
        panel = res.data as Record<string, unknown>;
      } else {
        error = res.message ?? 'Unknown error';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  $effect(() => { loadPanel(selectedId); });
</script>

<div class="flex h-full flex-col gap-3">

  <!-- ── Controls ──────────────────────────────────────────────────────────── -->
  <div class="flex flex-shrink-0 flex-wrap items-start gap-3">
    <div>
      <h1 class="text-2xl font-semibold">Panel Multi-Split</h1>
      <p class="mt-0.5 text-xs text-gray-500">
        Test del layout ricorsivo (PanelRenderer §7 docs).
        Seleziona un layout per vedere come cambia la nidificazione degli SplitPane.
      </p>
    </div>

    <div class="flex flex-col gap-1">
      {#each LAYOUTS as layout}
        <label class="flex cursor-pointer items-start gap-2 rounded border px-3 py-2 text-sm
               {selectedId === layout.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}">
          <input type="radio" bind:group={selectedId} value={layout.id} class="mt-0.5" />
          <div>
            <div class="font-medium">{layout.label}</div>
            <div class="mt-0.5 font-mono text-xs text-gray-500">{layout.desc}</div>
          </div>
        </label>
      {/each}
    </div>
  </div>

  <!-- ── Raw descriptor (collapsible) ──────────────────────────────────────── -->
  {#if panel}
    <details class="flex-shrink-0">
      <summary class="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
        raw descriptor — {selected.id}
      </summary>
      <pre class="mt-2 max-h-48 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-600"
        >{JSON.stringify(panel, null, 2)}</pre>
    </details>
  {/if}

  <!-- ── Panel area ────────────────────────────────────────────────────────── -->
  <div class="flex-1 min-h-0 overflow-hidden rounded border border-gray-200 shadow-sm">
    {#if loading}
      <div class="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
        <div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        Loading panel…
      </div>

    {:else if error}
      <div class="flex h-full items-center justify-center p-4">
        <div class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      </div>

    {:else if panel}
      {#key selectedId}
        <Panel class="h-full">
          <PanelRenderer {panel} />
        </Panel>
      {/key}

    {:else}
      <div class="flex h-full items-center justify-center text-sm text-gray-400">
        Select a layout above
      </div>
    {/if}
  </div>

  <a href="/playground" class="flex-shrink-0 text-sm text-blue-600 hover:underline">← Playground</a>

</div>
