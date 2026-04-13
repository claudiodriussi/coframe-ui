<script lang="ts">
  import { api } from '$coframe/api/client';
  import PanelRenderer from '$coframe/components/PanelRenderer.svelte';

  const PANELS = [
    { id: 'hello_demo', label: 'Hello Demo (plugin)' },
    { id: 'demo_author_list', label: 'Author List (table)' },
    { id: 'demo_book_list', label: 'Book List + Publisher (join)' },
    { id: 'demo_book_authors', label: 'Books + Authors (M2M + group_by)' }
  ];

  let selectedId = $state(PANELS[0].id);
  let panel = $state<Record<string, unknown> | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(false);

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

  $effect(() => {
    loadPanel(selectedId);
  });
</script>

<!--
  h-full flex-col: fills the content area of the playground layout (which is
  flex-1 min-h-0).  The panel area uses flex-1 min-h-0 to take all remaining
  height, making PanelRenderer → DataView → DataTable fill the viewport.
  The ResizeObserver in DataTable.svelte calls redraw(true) on every container
  resize, so window-resize and SplitPane gutter drag both update the table.
-->
<div class="flex h-full flex-col gap-3">

  <!-- ── Controls ──────────────────────────────────────────────────────────── -->
  <div class="flex flex-shrink-0 flex-wrap items-center gap-3">
    <h1 class="text-2xl font-semibold">Page Renderer</h1>

    <select bind:value={selectedId} class="input w-auto py-1 text-sm">
      {#each PANELS as p}
        <option value={p.id}>{p.label}</option>
      {/each}
    </select>

    <code class="rounded bg-gray-100 px-2 py-1 text-sm text-gray-600">
      get_page("{selectedId}")
    </code>
  </div>

  <!-- ── Raw descriptor (collapsible, shown only when panel is loaded) ──────── -->
  {#if panel}
    <details class="flex-shrink-0">
      <summary class="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
        raw descriptor
      </summary>
      <pre
        class="mt-2 max-h-48 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-600">{JSON.stringify(
          panel,
          null,
          2
        )}</pre>
    </details>
  {/if}

  <!-- ── Panel area — fills remaining viewport height ─────────────────────── -->
  <div class="flex-1 min-h-0 overflow-hidden rounded border border-gray-200 shadow-sm">
    {#if loading}
      <div class="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
        <div
          class="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"
        ></div>
        Loading panel…
      </div>

    {:else if error}
      <div class="flex h-full items-center justify-center p-4">
        <div class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong>
          {error}
        </div>
      </div>

    {:else if panel}
      <PanelRenderer {panel} />

    {:else}
      <div class="flex h-full items-center justify-center text-sm text-gray-400">
        Select a panel above
      </div>
    {/if}
  </div>

  <!-- ── Footer link ────────────────────────────────────────────────────────── -->
  <a href="/playground" class="flex-shrink-0 text-sm text-blue-600 hover:underline">← Playground</a>

</div>
