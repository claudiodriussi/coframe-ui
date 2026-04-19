<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$coframe/api/client';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';
  import PanelRenderer from '$coframe/components/PanelRenderer.svelte';
  import StackContainer from '$coframe/stack/StackContainer.svelte';
  import { stack } from '$coframe/stack/stack.svelte';
  import TableFormView from './TableFormView.svelte';
  import type { FormDescriptor } from '$coframe/components/dataform.types';

  // ── Table list ───────────────────────────────────────────────────────────

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
  let reloadKey     = $state(0);

  async function openTable(tableName: string) {
    selectedTable = tableName;
    panel         = null;
    error         = null;
    formDescriptor = null;
    loading       = true;
    try {
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

  $effect(() => {
    if (tableNames.length > 0 && selectedTable === null) {
      openTable(tableNames[0]);
    }
  });

  // ── Form descriptor (lazy, per table) ───────────────────────────────────

  let formDescriptor = $state<FormDescriptor | null>(null);
  let formLoading    = $state(false);

  async function ensureFormDescriptor(): Promise<boolean> {
    if (formDescriptor) return true;
    if (!selectedTable) return false;
    formLoading = true;
    try {
      const res = await api.endpoint('get_page', { id: `${selectedTable.toLowerCase()}_form` });
      if (res.status === 'success') {
        const page = res.data as Record<string, unknown>;
        formDescriptor = (page.content ?? page) as FormDescriptor;
        return true;
      }
      return false;
    } finally {
      formLoading = false;
    }
  }

  // ── Open edit / add via stack ────────────────────────────────────────────

  async function openEdit(id: number | string) {
    const ok = await ensureFormDescriptor();
    if (!ok || !formDescriptor || !selectedTable) return;
    stack.push(TableFormView, {
      formDescriptor,
      recordId: id,
      tableName: selectedTable,
      onSaved: () => { reloadKey++; },
    });
  }

  async function openAdd() {
    const ok = await ensureFormDescriptor();
    if (!ok || !formDescriptor || !selectedTable) return;
    stack.push(TableFormView, {
      formDescriptor,
      recordId: null,
      tableName: selectedTable,
      onSaved: () => { reloadKey++; },
    });
  }

  // ── Row events from PanelRenderer ────────────────────────────────────────

  function handlePanelEvent(_area: string, eventName: string, data: unknown) {
    if (eventName === 'row_dblclick') {
      const row = data as Record<string, unknown>;
      if (row.id !== undefined) openEdit(row.id as number | string);
    }
  }

  onMount(() => {
    stack.clear();
    return () => stack.clear();
  });
</script>

<div class="relative flex h-full flex-col gap-3">

  <h1 class="flex-shrink-0 text-2xl font-semibold">Table Browser</h1>

  <div class="flex min-h-0 flex-1 gap-3">

    <!-- ── Table list sidebar ─────────────────────────────────────────────── -->
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

    <!-- ── Panel area ─────────────────────────────────────────────────────── -->
    <div class="flex min-w-0 flex-1 flex-col gap-2 overflow-hidden">

      <!-- Toolbar: Add button -->
      {#if panel && selectedTable}
        <div class="flex flex-shrink-0 items-center gap-2">
          <button
            class="btn btn-primary py-1.5 text-xs"
            disabled={formLoading}
            onclick={openAdd}
          >
            {formLoading ? 'Caricamento…' : '+ Nuovo'}
          </button>
          <span class="text-xs text-gray-400">
            Doppio click su una riga per modificarla
          </span>
        </div>
      {/if}

      <div class="min-h-0 flex-1 overflow-hidden rounded border border-gray-200 shadow-sm">
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
          {#key reloadKey}
            <PanelRenderer {panel} onEvent={handlePanelEvent} />
          {/key}

        {:else}
          <div class="flex h-full items-center justify-center text-sm text-gray-400">
            Select a table
          </div>
        {/if}
      </div>

    </div>
  </div>

  <a href="/playground" class="flex-shrink-0 text-sm text-blue-600 hover:underline">← Playground</a>

  <!-- ── Stack overlay (form pages open on top, hidden when stack is empty) ── -->
  {#if $stack.length > 0}
    <div class="absolute inset-0">
      <StackContainer />
    </div>
  {/if}

</div>
