<script lang="ts">
  /**
   * DataView.svelte — descriptor-driven data view (table / tree).
   *
   * Orchestrates data loading, state persistence, column mapping and
   * event routing. Rendering is delegated to DataViewTable (table/tree)
   * and toolbar to DataViewToolbar.
   *
   * Future view types (kanban, cards, …) will be mounted alongside
   * DataViewTable with class:hidden and activated via activeViewType.
   *
   * Props:
   *   view     ViewDescriptor            resolved view descriptor
   *   trigger  Record<string,unknown>    trigger payload from PanelRenderer
   *   data     any[]                     static data (source: prop)
   *   onEvent  (name, data) => void      unified event emitter (row_click, data_load, …)
   */
  import { untrack, getContext } from 'svelte';
  import DataViewNavigator from './DataViewNavigator.svelte';
  import DataViewTable from './DataViewTable.svelte';
  import DataFormView from './DataFormView.svelte';
  import StackContainer from '$coframe/stack/StackContainer.svelte';
  import type { ColumnDef } from '$coframe/tabulator/CoframeTable';
  import { api } from '$coframe/api/client';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';
  import { resolveFormatter } from '$coframe/formatters/registry';
  import { stack } from '$coframe/stack/stack.svelte';
  import {
    extractFieldKey,
    applyTriggerVars,
    hasTriggerVars,
    buildQuery,
  } from './dataview.query';

  // ── Types (re-exported for consumers) ─────────────────────────────────────
  export type {
    ViewSource,
    ViewColumn,
    ViewActions,
    ViewPolicy,
    ViewTreeConfig,
    ViewDescriptor,
    NavigatorConfig,
    CommandItem,
  } from './dataview.types';

  import type { ViewDescriptor, NavigatorConfig, CommandItem } from './dataview.types';

  // ── Constants ──────────────────────────────────────────────────────────────

  // Last-resort fallback if serverConfig hasn't loaded yet or config.yaml has no dataview section.
  const DEFAULT_PAGE_SIZE = 100;

  // ── View state persistence ─────────────────────────────────────────────────

  interface SavedViewState {
    filterMode: boolean;
    filters: Array<{ field: string; type: string; value: unknown }>;
    sorters: Array<{ field: string; dir: string }>;
    rowCount: number;
    selectMode: boolean;
    selectedIds: unknown[];
  }

  // ── Props ──────────────────────────────────────────────────────────────────

  let {
    view,
    trigger = undefined as Record<string, unknown> | undefined,
    collapsed = false,
    data: propData = undefined as unknown[] | undefined,
    focusRowId = undefined as unknown,
    onEvent = undefined as ((name: string, data: unknown) => void) | undefined,
  }: {
    view: ViewDescriptor;
    trigger?: Record<string, unknown>;
    collapsed?: boolean;
    data?: unknown[];
    focusRowId?: unknown;
    onEvent?: (name: string, data: unknown) => void;
  } = $props();

  // ── View state persistence (key + initial load) ────────────────────────────
  // Two-level persistence model:
  //   - reload (F5)     → restore full session state (filters, sort, selections, rowCount)
  //   - navigate (menu) → start fresh (savedState = null)

  function getStateKey(): string {
    return `dataview.${view.source?.model ?? (view.source as any)?.endpoint ?? 'custom'}`;
  }

  const isReload = (() => {
    try {
      const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return nav?.type === 'reload';
    } catch { return false; }
  })();

  const savedState: SavedViewState | null = (() => {
    try {
      if (!isReload) return null;
      return JSON.parse(localStorage.getItem(getStateKey()) ?? 'null') as SavedViewState;
    } catch { return null; }
  })();

  // ── Internal state ─────────────────────────────────────────────────────────

  let tableRef: DataViewTable | null = $state(null);
  let rows: unknown[] = $state([]);
  let rowCount = $state(0);
  let inferredAligns    = $state<Record<string, 'left' | 'right'>>({});
  let inferredFormatters = $state<Record<string, string>>({});
  let alignsInferred    = $state(false);
  let totalCount = $state<number | null>(null);
  let loading = $state(false);
  let loadingMore = $state(false);
  let error = $state<string | null>(null);
  let initialized = $state(false);
  let waitingForTrigger = $state(false);
  let filterMode = $state(savedState?.filterMode ?? false);
  let selectMode = $state(savedState?.selectMode ?? false);
  let filteredCount = $state<number | null>(null);
  let selectedCount = $state(0);
  let tabulatorReady = $state(false);
  let restoreComplete = $state(false);
  let bannerRowCount = $state<number | null>(null);
  let _activeRowData = $state<Record<string, unknown> | null>(null);
  let _internalFocusId = $state<unknown>(null);

  // Active view type — initialized from descriptor, switchable in future.
  // untrack: intentionally captures only the initial value (user can switch at runtime).
  let activeViewType = $state(untrack(() => view.type ?? 'table'));

  // ── Derived ────────────────────────────────────────────────────────────────

  const hasMore = $derived(
    view.type !== 'tree' && totalCount !== null && rowCount < totalCount,
  );

  // PK field name — derived from serverConfig.tables using the view's source model.
  // Falls back to 'id' if the table schema is not loaded yet or has no declared PK.
  const pkField = $derived(
    serverConfig.tables[view.source?.model ?? '']?.pk_fields?.[0] ?? 'id'
  );
  const allowViews = $derived(view.allow_views ?? []);
  const selectable = $derived(selectMode || view.policy?.selection === true);
  const isTreeMode = $derived(activeViewType === 'tree');
  const treeChildField = $derived(view.tree?.child_field ?? 'children');
  const treeStartExpanded = $derived(view.tree?.start_expanded ?? false);

  // ── Navigator ──────────────────────────────────────────────────────────────

  // When DataView is rendered inside a StackContainer (e.g. as a stack page),
  // it must not create its own StackContainer overlay — the outer one handles all pages.
  const insideStack = getContext<boolean>('cf:inStack') ?? false;

  // navigator: true (default) | false | NavigatorConfig object
  const showNavigator = $derived(view.navigator !== false);
  const navigatorConfig = $derived(
    typeof view.navigator === 'object' && view.navigator !== null
      ? view.navigator as NavigatorConfig
      : undefined
  );
  const navigatorMode = $derived(navigatorConfig?.mode ?? 'browser');

  // Derive form_id: explicit in config, or auto from model name
  const formId = $derived(
    navigatorConfig?.form_id ??
    (view.source?.model ? `${(view.source.model as string).toLowerCase()}_form` : null)
  );

  // The effective focus id: internal (post-edit) wins over external prop
  const _effectiveFocusId = $derived(_internalFocusId ?? focusRowId);

  // ── State persistence ──────────────────────────────────────────────────────

  function saveViewState() {
    if (!tabulatorReady || !tableRef) return;
    const state: SavedViewState = {
      filterMode,
      filters: tableRef.getHeaderFilters(),
      sorters: tableRef.getSorters(),
      rowCount,
      selectMode,
      selectedIds: tableRef.getSelectedData().map((r: any) => r[pkField]).filter((id: any) => id != null),
    };
    try { localStorage.setItem(getStateKey(), JSON.stringify(state)); } catch (_) {}
  }

  // Restore effect — runs once as soon as tabulatorReady.
  $effect(() => {
    if (!tabulatorReady || restoreComplete) return;
    restoreComplete = true;
    if (!savedState) return;

    for (const f of savedState.filters ?? []) {
      tableRef?.setHeaderFilter(f.field, f.value);
    }
    if (savedState.sorters?.length) {
      tableRef?.setSort(savedState.sorters);
    }
    if (savedState.selectedIds?.length) {
      tableRef?.selectRowsByIds(savedState.selectedIds);
    }

    const threshold = serverConfig.config?.reload_all_threshold as number | undefined;
    const savedCount = savedState.rowCount ?? 0;
    if (savedCount > rowCount) {
      if (threshold === undefined || savedCount <= threshold) {
        loadMore(savedCount - rowCount);
      } else {
        bannerRowCount = savedCount;
      }
    }
  });

  // ── Auto-infer column props from first data row ────────────────────────────

  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/;
  function _inferColumnTypes(data: unknown[]) {
    if (alignsInferred || data.length === 0) return;
    const first = data[0] as Record<string, unknown>;
    const aligns: Record<string, 'left' | 'right'> = {};
    const formatters: Record<string, string> = {};
    for (const [k, v] of Object.entries(first)) {
      if (k === '_meta') continue;
      if (typeof v === 'number') {
        aligns[k] = 'right';
      } else if (typeof v === 'string' && ISO_DATE_RE.test(v)) {
        const hasTime = v.includes('T') || /\d{2}:\d{2}/.test(v.slice(10));
        formatters[k] = hasTime ? 'datetime' : 'date';
      }
    }
    inferredAligns    = aligns;
    inferredFormatters = formatters;
    alignsInferred    = true;
  }

  // ── Column mapping ─────────────────────────────────────────────────────────

  const columnDefs = $derived.by((): ColumnDef[] => {
    if (!view.columns || view.columns.length === 0) return [];
    return view.columns.map(c => {
      const fieldKey = extractFieldKey(c.field);
      const def: ColumnDef = {
        field: fieldKey,
        title: c.title ?? fieldKey,
      };
      if (c.width !== undefined)    def.width = c.width as number | string;
      if (c.minWidth !== undefined) def.minWidth = c.minWidth;
      if (c.maxWidth !== undefined) def.maxWidth = c.maxWidth;
      const align = (c.align as 'left' | 'center' | 'right' | undefined)
        ?? c.hozAlign
        ?? inferredAligns[fieldKey];
      if (align) def.hozAlign = align;
      const rawFmt = c.formatter ?? inferredFormatters[fieldKey];
      if (rawFmt) {
        const resolved = resolveFormatter(rawFmt, c.formatterParams);
        def.formatter = resolved.formatter;
        if (resolved.formatterParams) def.formatterParams = resolved.formatterParams;
      } else if (c.formatterParams) {
        def.formatterParams = c.formatterParams;
      }
      if (c.visible === false) def.visible = false;
      if (c.frozen)            def.frozen = true;
      return def;
    });
  });

  // ── Flat → nested tree conversion ─────────────────────────────────────────

  function buildTree(flat: unknown[], parentField: string, childField = 'children'): unknown[] {
    const map = new Map<unknown, Record<string, unknown>>();
    const roots: Record<string, unknown>[] = [];
    for (const item of flat) {
      const row = { ...(item as Record<string, unknown>), [childField]: [] };
      map.set(row[pkField], row);
    }
    for (const row of map.values()) {
      const parentId = row[parentField];
      if (parentId != null && map.has(parentId)) {
        (map.get(parentId)![childField] as unknown[]).push(row);
      } else {
        roots.push(row);
      }
    }
    return roots;
  }

  // ── Data loading ───────────────────────────────────────────────────────────

  async function loadData() {
    const src = view.source;
    void view.columns;
    const pd = propData;
    const trig = trigger ?? {};
    const isCollapsed = collapsed;
    const viewType = view.type;
    const treeCfg = view.tree;
    const _viewLimit = view.source?.limit;
    const _ps = _viewLimit !== undefined
      ? Number(_viewLimit)
      : untrack(() => Number(serverConfig.config?.page_size ?? DEFAULT_PAGE_SIZE));

    totalCount = null;

    if (pd !== undefined) {
      waitingForTrigger = false;
      rows = pd;
      _inferColumnTypes(pd);
      initialized = true;
      return;
    }

    if (isCollapsed) return;

    if (hasTriggerVars(src) && Object.keys(trig).length === 0) {
      waitingForTrigger = true;
      rows = [];
      return;
    }

    if (waitingForTrigger) { initialized = false; tabulatorReady = false; }
    waitingForTrigger = false;

    if (src?.model) {
      const q = buildQuery(src, view.columns, trig);

      loading = true;
      error = null;
      try {
        if (viewType === 'tree') {
          const res = await api.endpoint('query', { format: 'records', query: q });
          if (res.status === 'success') {
            let data = Array.isArray(res.data) ? res.data : [];
            if (treeCfg?.parent_field) {
              data = buildTree(data, treeCfg.parent_field, treeCfg.child_field ?? 'children');
            }
            rows = data;
            _inferColumnTypes(rows);
          } else {
            error = res.message ?? 'Query failed';
            rows = [];
          }
        } else {
          q.limit = _ps;
          q.offset = 0;
          const res = await api.endpoint('query', { format: 'records', query: q, count: true });
          if (res.status === 'success') {
            const d = res.data as { records: unknown[]; total: number };
            rows = Array.isArray(d.records) ? d.records : [];
            _inferColumnTypes(rows);
            totalCount = d.total ?? null;
          } else {
            error = res.message ?? 'Query failed';
            rows = [];
          }
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        rows = [];
      } finally {
        loading = false;
        initialized = true;
      }
      return;
    }

    if (src?.endpoint) {
      loading = true;
      error = null;
      try {
        const rawParams = (src.params as Record<string, unknown>) ?? {};
        const params = applyTriggerVars(rawParams, trig) as Record<string, unknown>;
        const res = await api.endpoint(src.endpoint, params);
        if (res.status === 'success') {
          rows = Array.isArray(res.data) ? res.data : [];
          _inferColumnTypes(rows);
        } else {
          error = res.message ?? 'Endpoint call failed';
          rows = [];
        }
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        rows = [];
      } finally {
        loading = false;
        initialized = true;
      }
      return;
    }

    rows = [];
    initialized = true;
  }

  async function loadMore(n: number) {
    if (!tableRef || loadingMore || !hasMore) return;
    const src = view.source;
    if (!src?.model) return;

    const q = buildQuery(src, view.columns, trigger ?? {});
    q.offset = rowCount;
    if (n > 0) q.limit = n;

    loadingMore = true;
    try {
      const res = await api.endpoint('query', { format: 'records', query: q });
      if (res.status === 'success') {
        const newData = Array.isArray(res.data) ? res.data : [];
        if (newData.length > 0) {
          await tableRef.addRows(newData);
        }
      }
    } catch (_e) {
      // loadMore errors are non-fatal — existing data remains intact
    } finally {
      loadingMore = false;
      saveViewState();
    }
  }

  $effect(() => { loadData(); });

  // ── Toolbar / export actions ───────────────────────────────────────────────

  function handleExport() {
    const name = (view.source?.model ?? view.title ?? 'export').toLowerCase();
    tableRef?.download('csv', `${name}.csv`);
  }

  function toggleFilter() {
    if (filterMode) tableRef?.clearHeaderFilter();
    filterMode = !filterMode;
    saveViewState();
  }

  function toggleSelect() {
    selectMode = !selectMode;
    saveViewState();
  }

  // ── Navigator CRUD ─────────────────────────────────────────────────────────

  function openForm(recordId: unknown, isNew: boolean) {
    if (!formId) return;
    const model = (view.source?.model as string | undefined) ?? '';
    const label = isNew ? `Nuovo ${model}` : `Modifica ${model}`;
    stack.push(DataFormView, {
      formId,
      recordId: recordId ?? null,
      title: label,
      onSaved: (savedData: Record<string, unknown>) => {
        if (isNew) {
          const newId = savedData[pkField];
          if (newId != null) _internalFocusId = newId;
          tableRef?.addRows([savedData]);
          if (totalCount !== null) totalCount++;
        } else if (recordId != null) {
          tableRef?.updateRow(recordId, savedData);
          setTimeout(() => tableRef?.focusRowById(recordId), 0);
        }
      },
      onCancel: () => {
        if (recordId != null) queueMicrotask(() => tableRef?.focusRowById(recordId));
      },
    });
  }

  function reloadData() {
    // Reset initialization to force a full reload
    initialized = false;
    tabulatorReady = false;
    alignsInferred = false;
    restoreComplete = false;
    loadData();
  }

  function handleNavAccept() {
    if (_activeRowData) onEvent?.('row_accept', _activeRowData);
  }

  function handleNavLookupCancel() {
    onEvent?.('row_cancel', null);
  }

  function handleNavAdd() {
    openForm(null, true);
  }

  function handleNavEdit() {
    if (_activeRowData == null) return;
    const id = (_activeRowData as any)[pkField];
    openForm(id, false);
  }

  async function handleNavDelete() {
    if (_activeRowData == null) return;
    const id = (_activeRowData as any)[pkField];
    if (!confirm(`Eliminare il record selezionato?`)) return;
    const model = view.source?.model as string | undefined;
    if (!model) return;
    try {
      const adjacentId = tableRef?.getAdjacentRowId(id) ?? null;
      const res = await api.endpoint('db', { table: model, method: 'delete', id });
      if (res.status === 'success') {
        _internalFocusId = null;
        _activeRowData = null;
        await tableRef?.deleteRow(id);
        if (totalCount !== null) totalCount--;
        if (adjacentId != null) queueMicrotask(() => tableRef?.focusRowById(adjacentId));
      } else {
        alert(res.message ?? 'Errore durante l\'eliminazione');
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  // row_dblclick → opens form when navigator present, otherwise emits event to parent
  function handleRowDblClick(row: unknown) {
    const rowData = row as Record<string, unknown>;
    _activeRowData = rowData;
    if (showNavigator && navigatorMode === 'browser' && formId) {
      // Navigator owns the action — open form directly
      const id = rowData[pkField];
      openForm(id, false);
    } else {
      // No navigator — emit event for parent to handle
      onEvent?.('row_dblclick', row);
    }
  }

  // ── Internal callbacks ─────────────────────────────────────────────────────

  function handleDataLoaded(count: number) {
    rowCount = count;
    filteredCount = null;
    onEvent?.('data_load', { count });
    if (!loadingMore) {
      saveViewState();
      const fid = _effectiveFocusId;
      if (fid != null) {
        // setTimeout (not queueMicrotask): dataLoaded fires before tableBuilt, so
        // cfTable is null at microtask time. A macrotask runs after all microtasks
        // (including the .then that sets cfTable) have completed.
        setTimeout(() => tableRef?.focusRowById(fid), 0);
      }
    }
  }

  function handleFiltered(count: number) {
    filteredCount = count < rowCount ? count : null;
    saveViewState();
  }

  function handleSorted() {
    saveViewState();
  }

  function handleSelectionChange(selectedRows: unknown[]) {
    selectedCount = (selectedRows as any[]).length;
    onEvent?.('selection_change', selectedRows);
    saveViewState();
  }
</script>

<div class="cf-dataview">

  <!-- ── Navigator (shown when navigator config present or default browser mode) -->
  {#if showNavigator}
    <DataViewNavigator
      config={navigatorConfig}
      {filterMode}
      {selectMode}
      {loading}
      {loadingMore}
      {hasMore}
      {rowCount}
      {filteredCount}
      {totalCount}
      {selectedCount}
      activeRowId={_activeRowData ? (_activeRowData as any)[pkField] : null}
      onAccept={handleNavAccept}
      onCancel={handleNavLookupCancel}
      onAdd={handleNavAdd}
      onEdit={handleNavEdit}
      onDelete={handleNavDelete}
      onToggleFilter={toggleFilter}
      onToggleSelect={toggleSelect}
      onExport={handleExport}
      onRefresh={reloadData}
      onLoadMore={loadMore}
    />
  {/if}

  <!-- ── Restore banner ─────────────────────────────────────────────────── -->
  {#if bannerRowCount !== null}
    <div class="cf-dv-restore-banner">
      <span>{bannerRowCount} rows were loaded.</span>
      <button class="cf-dv-btn" onclick={() => { const n = bannerRowCount! - rowCount; bannerRowCount = null; loadMore(n > 0 ? n : 0); }}>
        Reload {bannerRowCount}
      </button>
      <button class="cf-dv-btn" onclick={() => { bannerRowCount = null; saveViewState(); }}>
        Keep {rowCount}
      </button>
    </div>
  {/if}

  <!-- ── Data body ───────────────────────────────────────────────────────── -->
  <div class="cf-dv-body">
    {#if waitingForTrigger}
      <div class="cf-dv-placeholder">
        <svg viewBox="0 0 20 20" fill="currentColor" style="width:1.25rem;height:1.25rem;flex-shrink:0;opacity:0.4" aria-hidden="true">
          <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clip-rule="evenodd"/>
        </svg>
        Select a row to display the detail
      </div>
    {:else if error}
      <div class="cf-dv-error">
        <svg viewBox="0 0 20 20" fill="currentColor" style="width:1.25rem;height:1.25rem;flex-shrink:0" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/>
        </svg>
        {error}
      </div>
    {:else if initialized}
      <!-- Future renderers (kanban, cards, …) mount here with class:hidden.
           DataViewTable handles both 'table' and 'tree' view types. -->
      <DataViewTable
        bind:this={tableRef}
        {rows}
        {columnDefs}
        {selectable}
        {filterMode}
        {isTreeMode}
        {treeChildField}
        {treeStartExpanded}
        onRowClick={(row) => { _activeRowData = row as Record<string,unknown>; onEvent?.('row_click', row); }}
        onRowDblClick={handleRowDblClick}
        onSelectionChange={handleSelectionChange}
        onDataLoaded={handleDataLoaded}
        onFiltered={handleFiltered}
        onSorted={handleSorted}
        onReady={() => { tabulatorReady = true; }}
        onNavAdd={handleNavAdd}
        onNavEdit={handleNavEdit}
        onNavDelete={handleNavDelete}
        onNavExport={handleExport}
        onNavRefresh={reloadData}
      />
    {/if}
  </div>

  <!-- ── Stack overlay — only when we own the stack (not when inside another StackContainer) -->
  {#if showNavigator && !insideStack && $stack.length > 0}
    <div class="cf-dv-stack-overlay">
      <StackContainer />
    </div>
  {/if}

</div>

<style>
  .cf-dataview {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* ── Restore banner ──────────────────────────────────────────────────── */

  .cf-dv-restore-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.75rem;
    background: color-mix(in srgb, var(--cf-accent, #3b82f6) 8%, var(--cf-bg));
    border-bottom: 1px solid color-mix(in srgb, var(--cf-accent, #3b82f6) 25%, transparent);
    font-size: 0.72rem;
    flex-shrink: 0;
  }

  .cf-dv-restore-banner span {
    color: var(--cf-text-subtle);
    flex: 1;
  }

  /* Duplicated from DataViewToolbar — used by the restore banner buttons. */
  .cf-dv-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--cf-border-input);
    border-radius: 0.3rem;
    background: var(--cf-bg);
    color: var(--cf-text);
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
    appearance: none;
    line-height: 1.4;
  }

  .cf-dv-btn:hover:not(:disabled) {
    background: var(--cf-surface-hover);
    border-color: var(--cf-text-subtle);
  }

  /* ── Body ────────────────────────────────────────────────────────────── */

  .cf-dv-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .cf-dv-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    height: 100%;
    color: var(--cf-text-subtle);
    font-size: 0.8rem;
    padding: 1rem;
    text-align: center;
  }

  .cf-dv-error {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 100%;
    color: var(--cf-danger);
    font-size: 0.8rem;
    padding: 1rem;
    text-align: center;
  }

  /* ── Stack overlay — covers the entire DataView for form pages ───────── */
  .cf-dv-stack-overlay {
    position: absolute;
    inset: 0;
    z-index: 10;
  }
</style>
