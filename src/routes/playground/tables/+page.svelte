<script lang="ts">
  import { api } from '$coframe/api/client';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';
  import PanelRenderer from '$coframe/components/PanelRenderer.svelte';

  // Table names from serverConfig, sorted alphabetically.
  // Exclude M2M tables (composite PK) — they require both FK sides to be meaningful.
  let tableNames = $derived(
    Object.entries(serverConfig.tables)
      .filter(([, info]) => info.pk_fields.length === 1)
      .map(([name]) => name)
      .sort()
  );

  let selectedTable = $state<string | null>(null);
  let panel         = $state<Record<string, unknown> | null>(null);
  let error         = $state<string | null>(null);
  let loading       = $state(false);

  async function openTable(tableName: string) {
    selectedTable = tableName;
    panel   = null;
    error   = null;
    loading = true;
    try {
      // Convention: {table_lower}_list
      // Backend resolves explicit YAML page first, falls back to auto-generated.
      const res = await api.endpoint('get_page', { id: `${tableName.toLowerCase()}_list` });
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

  // Auto-select first table when the list is ready
  $effect(() => {
    if (tableNames.length > 0 && selectedTable === null) {
      openTable(tableNames[0]);
    }
  });
</script>

<!--
  h-full: fills the playground content area (flex-1 min-h-0 in +layout.svelte).
  The inner flex splits sidebar + panel area horizontally.
-->
<div class="flex h-full flex-col gap-3">

  <h1 class="flex-shrink-0 text-2xl font-semibold">Table Browser</h1>

  <div class="flex flex-1 min-h-0 gap-3">

    <!-- ── Table list sidebar ───────────────────────────────────────────── -->
    <aside class="w-40 shrink-0 overflow-y-auto rounded border border-gray-200 bg-white shadow-sm">
      <div class="border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        Tables
      </div>
      {#each tableNames as name}
        <button
          onclick={() => openTable(name)}
          class="w-full px-3 py-1.5 text-left text-sm transition-colors
                 {selectedTable === name
                   ? 'bg-blue-50 font-medium text-blue-700'
                   : 'text-gray-700 hover:bg-gray-50'}"
        >
          {name}
        </button>
      {/each}

      {#if tableNames.length === 0}
        <p class="px-3 py-2 text-xs text-gray-400">No tables</p>
      {/if}
    </aside>

    <!-- ── Panel area ───────────────────────────────────────────────────── -->
    <div class="flex-1 min-w-0 overflow-hidden rounded border border-gray-200 shadow-sm">

      {#if loading}
        <div class="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
          <div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
          Loading {selectedTable}…
        </div>

      {:else if error}
        <div class="flex h-full items-center justify-center p-4">
          <div class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Error:</strong> {error}
          </div>
        </div>

      {:else if panel}
        <PanelRenderer {panel} />

      {:else}
        <div class="flex h-full items-center justify-center text-sm text-gray-400">
          Select a table
        </div>
      {/if}

    </div>

  </div>

  <a href="/playground" class="flex-shrink-0 text-sm text-blue-600 hover:underline">← Playground</a>

</div>
