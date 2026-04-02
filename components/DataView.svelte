<script lang="ts">
  /**
   * DataView.svelte — descriptor-driven data view (table / tree)
   *
   * Reads a view descriptor (from get_panel) and:
   *  - Fetches data from api.endpoint('query') for source.model
   *  - Accepts static data via the `data` prop for source.prop
   *  - Calls a custom endpoint for source.endpoint
   *  - Maps descriptor columns to DataTable ColumnDef[]
   *  - Renders a toolbar (Add, Search, Export, Selection, Print)
   *  - Supports tree mode (type: tree + tree.parent_field for flat→nested)
   *  - Pagination: initial page + "load more" footer strip (model sources only)
   *  - $trigger.* substitution in source.where, join where, endpoint params
   *  - Waits for trigger before loading when source references $trigger.*
   *
   * Props:
   *   view     ViewDescriptor            resolved view descriptor
   *   trigger  Record<string,unknown>    trigger payload from PanelRenderer
   *   data     any[]                     static data (source: prop)
   *   onEvent  (name, data) => void      unified event emitter (row_click, data_load, …)
   */
  import { untrack } from 'svelte';
  import DataTable from './DataTable.svelte';
  import type { ColumnDef } from '$coframe/tabulator/CoframeTable';
  import { api } from '$coframe/api/client';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';

  // ── Types ──────────────────────────────────────────────────────────────────

  export interface ViewSource {
    model?: string;
    endpoint?: string;
    joins?: Array<string | Record<string, unknown>>;
    where?: unknown[];
    order_by?: string[];
    group_by?: string[];
    limit?: number;
    [key: string]: unknown;
  }

  export interface ViewColumn {
    field: string;           // QB select expression or plain field name
    title?: string;
    width?: number | string;
    minWidth?: number;
    maxWidth?: number;
    hozAlign?: 'left' | 'center' | 'right';
    visible?: boolean;
    frozen?: boolean;
    [key: string]: unknown;
  }

  export interface ViewActions {
    toolbar?: string[];
    row?: Array<Record<string, unknown>>;
    commands?: Array<Record<string, unknown>>;
  }

  export interface ViewPolicy {
    selection?: boolean;
    editable?: boolean;
    user_customizable?: boolean;
  }

  export interface ViewTreeConfig {
    parent_field?: string;
    child_field?: string;
    start_expanded?: boolean;
  }

  export interface ViewDescriptor {
    type: 'table' | 'tree' | string;
    title?: string;
    source?: ViewSource;
    columns?: ViewColumn[];
    actions?: ViewActions;
    policy?: ViewPolicy;
    tree?: ViewTreeConfig;
    [key: string]: unknown;
  }

  // ── Constants ──────────────────────────────────────────────────────────────

  // Last-resort fallback if serverConfig hasn't loaded yet or config.yaml has no dataview section.
  const DEFAULT_PAGE_SIZE = 100;
  // Batch sizes offered in the "load more" dropdown
  const LOAD_MORE_OPTIONS = [50, 100, 500];

  // ── View state persistence ─────────────────────────────────────────────────

  interface SavedViewState {
    filterMode: boolean;
    filters: Array<{ field: string; type: string; value: unknown }>;
    sorters: Array<{ field: string; dir: string }>;
    rowCount: number;
    selectMode: boolean;
    selectedIds: unknown[];
  }

  // ── Trigger helpers ────────────────────────────────────────────────────────

  // Recursively replace $trigger.field with values from the trigger payload.
  // When the entire string is a single $trigger.field reference, the raw typed
  // value is returned (preserving number/boolean types for QB filter comparisons).
  // When $trigger.* appears as part of a larger string, values are stringified.
  function applyTriggerVars(value: unknown, trig: Record<string, unknown>): unknown {
    if (typeof value === 'string') {
      const exact = value.match(/^\$trigger\.(\w+)$/);
      if (exact) {
        const v = trig[exact[1]];
        return v !== undefined ? v : value;
      }
      return value.replace(/\$trigger\.(\w+)/g, (_, key) => {
        const v = trig[key];
        return v !== undefined ? String(v) : '';
      });
    }
    if (Array.isArray(value)) return value.map(v => applyTriggerVars(v, trig));
    if (value && typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = applyTriggerVars(v, trig);
      }
      return out;
    }
    return value;
  }

  // Returns true if obj (or any nested value) contains a $trigger.* reference.
  function hasTriggerVars(value: unknown): boolean {
    if (typeof value === 'string') return /\$trigger\./.test(value);
    if (Array.isArray(value)) return value.some(hasTriggerVars);
    if (value && typeof value === 'object') return Object.values(value as object).some(hasTriggerVars);
    return false;
  }

  // ── Props ──────────────────────────────────────────────────────────────────

  let {
    view,
    trigger = undefined as Record<string, unknown> | undefined,
    collapsed = false,
    data: propData = undefined as unknown[] | undefined,
    onEvent = undefined as ((name: string, data: unknown) => void) | undefined,
  }: {
    view: ViewDescriptor;
    trigger?: Record<string, unknown>;
    collapsed?: boolean;
    data?: unknown[];
    onEvent?: (name: string, data: unknown) => void;
  } = $props();

  // ── View state persistence (key + initial load) ────────────────────────────
  // Computed before internal state so filterMode can be initialized from savedState.

  function getStateKey(): string {
    return `dataview.${view.source?.model ?? (view.source as any)?.endpoint ?? 'custom'}`;
  }

  const savedState: SavedViewState | null = (() => {
    try { return JSON.parse(localStorage.getItem(getStateKey()) ?? 'null') as SavedViewState; }
    catch { return null; }
  })();

  // ── Internal state ─────────────────────────────────────────────────────────

  let tableRef: DataTable | null = $state(null);
  let rows: unknown[] = $state([]);
  let rowCount = $state(0);
  let totalCount = $state<number | null>(null);
  let loading = $state(false);
  let loadingMore = $state(false);
  let loadMoreOpen = $state(false);
  let error = $state<string | null>(null);
  let initialized = $state(false);
  let waitingForTrigger = $state(false);
  // Filter + selection modes — both initialized from savedState so Tabulator
  // builds columns (headerFilter inputs, checkbox column) correctly on first render.
  let filterMode = $state(savedState?.filterMode ?? false);
  let selectMode = $state(savedState?.selectMode ?? false);
  let filteredCount = $state<number | null>(null);  // null = no active filter
  let selectedCount = $state(0);
  // State persistence
  let tabulatorReady = $state(false);   // true after Tabulator fires tableBuilt
  let restoreComplete = $state(false);
  let bannerRowCount = $state<number | null>(null);  // non-null → show restore banner

  // ── Derived ────────────────────────────────────────────────────────────────

  // True when the server has more rows than Tabulator currently holds.
  const hasMore = $derived(
    view.type !== 'tree' && totalCount !== null && rowCount < totalCount
  );

  function saveViewState() {
    if (!tabulatorReady || !tableRef) return;
    const state: SavedViewState = {
      filterMode,
      filters: (tableRef as any).getHeaderFilters(),
      sorters: (tableRef as any).getSorters(),
      rowCount,
      selectMode,
      selectedIds: (tableRef as any).getSelectedData()
        .map((r: any) => r.id)
        .filter((id: any) => id != null),
    };
    try { localStorage.setItem(getStateKey(), JSON.stringify(state)); } catch (_) {}
  }

  // Restore effect — runs once as soon as tabulatorReady.
  // Reads reload_all_threshold from serverConfig with whatever value is available
  // at this moment (serverConfig loads eagerly; in most cases it is already loaded
  // by the time Tabulator fires tableBuilt). untrack() in loadData prevents a
  // serverConfig-triggered loadData re-run that would overwrite restored rows.
  $effect(() => {
    if (!tabulatorReady || restoreComplete) return;
    restoreComplete = true;

    if (!savedState) return;

    // Restore header filter values (columns already have headerFilter because
    // filterMode was initialized from savedState before Tabulator built the table)
    for (const f of savedState.filters ?? []) {
      (tableRef as any).setHeaderFilter(f.field, f.value);
    }

    // Restore sort
    if (savedState.sorters?.length) {
      (tableRef as any).setSort(savedState.sorters);
    }

    // Restore selections (selectMode + checkbox column already applied via prop init)
    if (savedState.selectedIds?.length) {
      (tableRef as any).selectRowsByIds(savedState.selectedIds);
    }

    // Restore row count: silent if savedCount ≤ threshold, banner if above.
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

  // ── Column mapping ─────────────────────────────────────────────────────────
  // columns.field may be a plain name ("title"), a Model.field notation
  // ("Author.first_name"), or a full QB select expression with alias
  // ("CASE WHEN ... END as display_name"). In the latter case, the Tabulator
  // field key is the alias (everything after the last " as ").

  function extractFieldKey(expr: string): string {
    const lower = expr.toLowerCase();
    const asIdx = lower.lastIndexOf(' as ');
    if (asIdx !== -1) return expr.slice(asIdx + 4).trim();
    // "Model.field" → use last segment as field key in row data
    const dot = expr.lastIndexOf('.');
    if (dot !== -1) return expr.slice(dot + 1);
    return expr;
  }

  const columnDefs = $derived.by((): ColumnDef[] => {
    if (!view.columns || view.columns.length === 0) return [];
    return view.columns.map(c => {
      const def: ColumnDef = {
        field: extractFieldKey(c.field),
        title: c.title ?? extractFieldKey(c.field),
      };
      if (c.width !== undefined)    def.width = c.width as number | string;
      if (c.minWidth !== undefined) def.minWidth = c.minWidth;
      if (c.maxWidth !== undefined) def.maxWidth = c.maxWidth;
      if (c.hozAlign)               def.hozAlign = c.hozAlign;
      if (c.visible === false)      def.visible = false;
      if (c.frozen)                 def.frozen = true;
      return def;
    });
  });

  // ── Query construction ─────────────────────────────────────────────────────

  // Convert descriptor join item to QB-compatible object, applying trigger substitution.
  function normalizeJoin(j: string | Record<string, unknown>, trig: Record<string, unknown>): Record<string, unknown> {
    if (typeof j === 'string') return { table: j };
    if (typeof j.table === 'string' && typeof j.on === 'string') {
      return { [j.table]: j.on };
    }
    // Pass-through (e.g. {via: ..., where: [...]}) — apply trigger substitution
    return applyTriggerVars(j, trig) as Record<string, unknown>;
  }

  function buildQuery(src: ViewSource, trig: Record<string, unknown>): Record<string, unknown> {
    const q: Record<string, unknown> = { table: src.model };

    // select: use descriptor column fields (QB select expressions), always include id
    if (view.columns && view.columns.length > 0) {
      const fields = view.columns.map(c => c.field);
      // Prepend 'id' if not already selected (needed for row actions / tree)
      const hasId = fields.some(f => f === 'id' || extractFieldKey(f) === 'id');
      if (!hasId) fields.unshift('id');
      q.select = fields;
    }

    if (src.joins && src.joins.length > 0) {
      q.joins = src.joins.map(j => normalizeJoin(j, trig));
    }

    // order_by: "-field" prefix → ["field", "desc"]
    if (src.order_by && src.order_by.length > 0) {
      q.order_by = src.order_by.map(f =>
        typeof f === 'string' && f.startsWith('-') ? [f.slice(1), 'desc'] : f
      );
    }

    if (src.group_by && src.group_by.length > 0) {
      q.group_by = src.group_by;
    }

    if (src.filters) {
      q.filters = applyTriggerVars(src.filters, trig);
    }

    // NOTE: limit is NOT forwarded from src.limit here.
    // It is applied in loadData() / loadMore() as the pagination page size.
    return q;
  }

  // ── Flat → nested tree conversion ─────────────────────────────────────────

  function buildTree(
    flat: unknown[],
    parentField: string,
    childField = 'children',
  ): unknown[] {
    const map = new Map<unknown, Record<string, unknown>>();
    const roots: Record<string, unknown>[] = [];

    for (const item of flat) {
      const row = { ...(item as Record<string, unknown>), [childField]: [] };
      map.set(row.id, row);
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
    // Read ALL reactive deps synchronously (before first await) so that
    // $effect can correctly track them and re-run on any change.
    const src = view.source;
    void view.columns;              // track columns for $effect reactivity
    const pd = propData;
    const trig = trigger ?? {};     // track trigger — re-runs when payload changes
    const isCollapsed = collapsed;  // track collapse — skip load when panel is hidden
    const viewType = view.type;
    const treeCfg = view.tree;
    // page size — track view.source.limit reactively, but read serverConfig via
    // untrack so that config loading after mount does NOT re-run this effect and
    // overwrite rows that were already loaded (including loadMore rows).
    const _viewLimit = view.source?.limit;   // tracked
    const _ps = _viewLimit !== undefined
      ? Number(_viewLimit)
      : untrack(() => Number(serverConfig.config?.page_size ?? DEFAULT_PAGE_SIZE));


    // Reset server-side total on every fresh load
    totalCount = null;

    // source: prop — use passed data directly (no pagination)
    if (pd !== undefined) {
      waitingForTrigger = false;
      rows = pd;
      initialized = true;
      return;
    }

    // Don't load while the panel is collapsed — the $effect will re-run on expand.
    if (isCollapsed) return;

    // If source references $trigger.* but no trigger has arrived yet, show placeholder.
    // Do NOT set initialized=true here — DataTable must NOT mount with empty data,
    // otherwise Tabulator initializes with height=0 and virtual scroll breaks.
    if (hasTriggerVars(src) && Object.keys(trig).length === 0) {
      waitingForTrigger = true;
      rows = [];
      return;
    }

    // Trigger just arrived (first time): reset initialized so DataTable mounts
    // fresh with real data instead of via replaceData() on a height=0 instance.
    if (waitingForTrigger) { initialized = false; tabulatorReady = false; }
    waitingForTrigger = false;


    // source: model — query via DynamicQueryBuilder with pagination
    if (src?.model) {
      const q = buildQuery(src, trig);

      loading = true;
      error = null;
      try {
        if (viewType === 'tree') {
          // Trees need the full flat list for buildTree — no limit/offset
          const res = await api.endpoint('query', { format: 'records', query: q });
          if (res.status === 'success') {
            let data = Array.isArray(res.data) ? res.data : [];
            if (treeCfg?.parent_field) {
              data = buildTree(data, treeCfg.parent_field, treeCfg.child_field ?? 'children');
            }
            rows = data;
          } else {
            error = res.message ?? 'Query failed';
            rows = [];
          }
        } else {
          // Paginated load: first page + total count
          q.limit = _ps;
          q.offset = 0;
          const res = await api.endpoint('query', { format: 'records', query: q, count: true });
          if (res.status === 'success') {
            const d = res.data as { records: unknown[]; total: number };
            rows = Array.isArray(d.records) ? d.records : [];
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

    // source: endpoint — custom endpoint (no pagination)
    if (src?.endpoint) {
      loading = true;
      error = null;
      try {
        const rawParams = (src.params as Record<string, unknown>) ?? {};
        const params = applyTriggerVars(rawParams, trig) as Record<string, unknown>;
        const res = await api.endpoint(src.endpoint, params);
        if (res.status === 'success') {
          rows = Array.isArray(res.data) ? res.data : [];
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

  // Load additional rows and append them to Tabulator, preserving scroll and sort.
  // n = rows to fetch; n === 0 means no limit (load all remaining from server).
  async function loadMore(n: number) {
    if (!tableRef || loadingMore || !hasMore) return;
    loadMoreOpen = false;
    const src = view.source;
    if (!src?.model) return;

    const q = buildQuery(src, trigger ?? {});
    q.offset = rowCount;          // start after rows already in Tabulator
    if (n > 0) q.limit = n;      // omitting limit → QB returns all from offset

    loadingMore = true;
    try {
      const res = await api.endpoint('query', { format: 'records', query: q });
      if (res.status === 'success') {
        const newData = Array.isArray(res.data) ? res.data : [];
        if (newData.length > 0) {
          // addRows appends to Tabulator and fires onDataLoaded with new count.
          // Cast needed until the TS language server refreshes the component type.
          await (tableRef as any).addRows(newData);
        }
      }
    } catch (_e) {
      // loadMore errors are non-fatal — existing data remains intact
    } finally {
      loadingMore = false;
      // Save state after addData has fully settled: rowCount is updated and any
      // transient rowSelectionChanged=[] fired by Tabulator during addData is gone.
      saveViewState();
    }
  }

  $effect(() => { loadData(); });

  // ── Derived UI state ───────────────────────────────────────────────────────

  const toolbarItems = $derived(view.actions?.toolbar ?? []);
  const selectable = $derived(selectMode || view.policy?.selection === true);
  const isTreeMode = $derived(view.type === 'tree');
  const treeChildField = $derived(view.tree?.child_field ?? 'children');
  const treeStartExpanded = $derived(view.tree?.start_expanded ?? false);

  // ── Toolbar actions ────────────────────────────────────────────────────────

  function handleExport() {
    const name = (view.source?.model ?? view.title ?? 'export').toLowerCase();
    tableRef?.download('csv', `${name}.csv`);
  }

  function toggleFilter() {
    if (filterMode) {
      tableRef?.clearHeaderFilter();
      // filteredCount resets automatically via onFiltered when clearHeaderFilter fires dataFiltered
    }
    filterMode = !filterMode;
    saveViewState();
  }

  function toggleSelect() {
    selectMode = !selectMode;
    saveViewState();
  }

  // ── Internal callbacks ─────────────────────────────────────────────────────

  function handleDataLoaded(count: number) {
    rowCount = count;
    filteredCount = null; // new data load resets any filter count
    onEvent?.('data_load', { count });
    // Skip saveViewState during loadMore: Tabulator may fire rowSelectionChanged
    // with [] during addData (internal reset), which would overwrite saved selections.
    // loadMore() calls saveViewState() in its finally block after addData completes.
    if (!loadingMore) saveViewState();
  }

  function handleFiltered(count: number) {
    filteredCount = count < rowCount ? count : null;
    saveViewState();
  }

  function handleSorted() {
    saveViewState();
  }

  function handleSelectionChange(rows: unknown[]) {
    selectedCount = rows.length;
    onEvent?.('selection_change', rows);
    saveViewState();
  }
</script>

<div class="cf-dataview">

  <!-- ── Toolbar ─────────────────────────────────────────────────────────── -->
  <div class="cf-dv-toolbar">
    <div class="cf-dv-toolbar-left">

      {#if toolbarItems.includes('add')}
        <button class="cf-dv-btn" title="Add" disabled>
          <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/>
          </svg>
          Add
        </button>
      {/if}

      {#if toolbarItems.includes('search')}
        <button class="cf-dv-btn" title="Search" disabled>
          <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
            <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd"/>
          </svg>
          Search
        </button>
      {/if}

      {#if toolbarItems.includes('filter')}
        <button class="cf-dv-btn" title="Toggle column filters" onclick={toggleFilter}>
          <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
            <path fill-rule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 9 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L3.659 6.22A2.25 2.25 0 0 1 3 4.629V2.34a.75.75 0 0 1 .628-.74Z" clip-rule="evenodd"/>
          </svg>
          Filter
        </button>
      {/if}

      {#if toolbarItems.includes('select')}
        <button class="cf-dv-btn" title="Toggle row selection" onclick={toggleSelect}>
          <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
            <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd"/>
          </svg>
          Select
        </button>
      {/if}

      {#if toolbarItems.includes('export')}
        <button class="cf-dv-btn" title="Export CSV" onclick={handleExport}>
          <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z"/>
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"/>
          </svg>
          Export
        </button>
      {/if}

      {#if toolbarItems.includes('print')}
        <button class="cf-dv-btn" title="Print" disabled>
          <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
            <path fill-rule="evenodd" d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.212 2.212 0 0 1 18 8.653v4.097A2.25 2.25 0 0 1 15.75 15h-.241l.305 1.984A1.75 1.75 0 0 1 14.084 19H5.915a1.75 1.75 0 0 1-1.73-2.016L4.492 15H4.25A2.25 2.25 0 0 1 2 12.75V8.653c0-1.082.775-2.034 1.874-2.198.374-.056.749-.107 1.126-.153V2.75Zm1.5 0v3.44a41.892 41.892 0 0 1 7 0V2.75a.25.25 0 0 0-.25-.25h-6.5a.25.25 0 0 0-.25.25Zm-.875 8.5a.75.75 0 0 0 0 1.5h8.75a.75.75 0 0 0 0-1.5H5.625ZM6 15.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/>
          </svg>
          Print
        </button>
      {/if}

    </div>

    <div class="cf-dv-toolbar-right">
      {#if loading}
        <div class="cf-dv-spinner" aria-label="Loading"></div>
      {/if}
      <span class="cf-dv-count">
        {#if filteredCount !== null}{filteredCount} / {/if}{rowCount}{#if totalCount !== null} / {totalCount}{/if} righe{#if selectedCount > 0} · {selectedCount} sel.{/if}
      </span>
    </div>
  </div>

  <!-- ── Restore banner — shown when saved rowCount exceeds reload_all_threshold ── -->
  {#if bannerRowCount !== null}
    <div class="cf-dv-restore-banner">
      <span>Erano caricate {bannerRowCount} righe.</span>
      <button class="cf-dv-btn" onclick={() => { const n = bannerRowCount! - rowCount; bannerRowCount = null; loadMore(n > 0 ? n : 0); }}>
        Ricarica {bannerRowCount}
      </button>
      <button class="cf-dv-btn" onclick={() => { bannerRowCount = null; saveViewState(); }}>
        Mantieni {rowCount}
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
        Seleziona una riga per visualizzare il dettaglio
      </div>
    {:else if error}
      <div class="cf-dv-error">
        <svg viewBox="0 0 20 20" fill="currentColor" style="width:1.25rem;height:1.25rem;flex-shrink:0" aria-hidden="true">
          <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/>
        </svg>
        {error}
      </div>
    {:else if initialized}
      <DataTable
        bind:this={tableRef}
        data={rows}
        columns={columnDefs}
        selectable={selectable}
        filterMode={filterMode}
        treeMode={isTreeMode}
        treeChildField={treeChildField}
        treeStartExpanded={treeStartExpanded}
        onRowClick={(row) => onEvent?.('row_click', row)}
        onSelectionChange={handleSelectionChange}
        onDataLoaded={handleDataLoaded}
        onFiltered={handleFiltered}
        onSorted={handleSorted}
        onReady={() => { tabulatorReady = true; }}
      />
    {/if}
  </div>

  <!-- ── Pagination footer — visible only when more rows exist on server ── -->
  {#if hasMore || loadingMore}

    <!-- Transparent overlay: closes dropdown when clicking outside it -->
    {#if loadMoreOpen}
      <div class="cf-loadmore-overlay" role="presentation" onclick={() => loadMoreOpen = false}></div>
    {/if}

    <div class="cf-dv-footer">
      <span class="cf-dv-footer-info">
        {rowCount} di {totalCount} righe caricate
      </span>

      <div class="cf-loadmore-wrap">
        <button
          class="cf-dv-btn cf-loadmore-btn"
          onclick={() => loadMoreOpen = !loadMoreOpen}
          disabled={loadingMore}
          title="Carica altre righe"
        >
          {#if loadingMore}
            <div class="cf-dv-spinner" aria-hidden="true"></div>
            Caricamento…
          {:else}
            Carica altro
            <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/>
            </svg>
          {/if}
        </button>

        {#if loadMoreOpen}
          <div class="cf-loadmore-menu" role="menu">
            {#each LOAD_MORE_OPTIONS as n (n)}
              <button class="cf-loadmore-item" role="menuitem" onclick={() => loadMore(n)}>
                Carica {n} righe
              </button>
            {/each}
            <div class="cf-loadmore-sep" role="separator"></div>
            <button class="cf-loadmore-item" role="menuitem" onclick={() => loadMore(0)}>
              Carica tutto
            </button>
          </div>
        {/if}
      </div>
    </div>
  {/if}

</div>

<style>
  .cf-dataview {
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

  /* ── Toolbar ─────────────────────────────────────────────────────────── */

  .cf-dv-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.3rem 0.625rem;
    border-bottom: 1px solid var(--cf-border);
    background: var(--cf-surface);
    flex-shrink: 0;
    gap: 0.5rem;
    min-height: 2rem;
  }

  .cf-dv-toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .cf-dv-toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

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

  .cf-dv-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }


  .cf-dv-icon {
    width: 0.8rem;
    height: 0.8rem;
    flex-shrink: 0;
  }

  .cf-dv-spinner {
    width: 0.8rem;
    height: 0.8rem;
    border: 2px solid var(--cf-border);
    border-top-color: var(--cf-accent);
    border-radius: 50%;
    animation: cf-spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  @keyframes cf-spin { to { transform: rotate(360deg); } }

  .cf-dv-count {
    font-size: 0.68rem;
    color: var(--cf-text-subtle);
    white-space: nowrap;
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

  /* ── Pagination footer ───────────────────────────────────────────────── */

  .cf-dv-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.3rem 0.625rem;
    border-top: 1px solid var(--cf-border);
    background: var(--cf-surface);
    flex-shrink: 0;
    gap: 0.5rem;
    min-height: 2rem;
  }

  .cf-dv-footer-info {
    font-size: 0.68rem;
    color: var(--cf-text-muted);
    white-space: nowrap;
  }

  /* ── Load-more dropdown ──────────────────────────────────────────────── */

  .cf-loadmore-overlay {
    position: fixed;
    inset: 0;
    z-index: 10;
  }

  .cf-loadmore-wrap {
    position: relative;
  }

  .cf-loadmore-btn {
    gap: 0.3rem;
  }

  .cf-loadmore-menu {
    position: absolute;
    bottom: calc(100% + 4px);
    right: 0;
    background: var(--cf-bg);
    border: 1px solid var(--cf-border);
    border-radius: 0.375rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    min-width: 10rem;
    z-index: 11;
    overflow: hidden;
  }

  .cf-loadmore-item {
    display: block;
    width: 100%;
    padding: 0.4rem 0.75rem;
    text-align: left;
    font-size: 0.75rem;
    color: var(--cf-text);
    background: none;
    border: none;
    cursor: pointer;
    transition: background 0.1s;
  }

  .cf-loadmore-item:hover {
    background: var(--cf-surface-hover);
  }

  .cf-loadmore-sep {
    height: 1px;
    background: var(--cf-border);
    margin: 0.2rem 0;
  }
</style>
