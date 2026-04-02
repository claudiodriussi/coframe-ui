<script lang="ts">
  /**
   * DataTable.svelte — thin Svelte 5 wrapper around CoframeTable.
   *
   * Responsibilities:
   *   - Declares and owns the container <div> (bind:this)
   *   - Translates reactive Svelte props into CoframeTable method calls via $effects
   *   - Manages Svelte lifecycle (onMount / onDestroy)
   *   - Re-exports shared types so consumers import from one place
   *
   * All Tabulator logic (column building, event wiring, keyboard nav,
   * ResizeObserver, _meta system) lives in CoframeTable.ts.
   */
  import { onMount, onDestroy } from 'svelte';
  import 'tabulator-tables/dist/css/tabulator.min.css';
  import { CoframeTable } from '../tabulator/CoframeTable';
  import type { ColumnDef, SortDef, CellInfo } from '../tabulator/CoframeTable';

  // ── Props ──────────────────────────────────────────────────────────────────

  let {
    data = [] as any[],
    columns = [] as ColumnDef[],
    selectable = false,
    mode = 'virtual' as 'virtual' | 'page',
    pageSize = 20,
    rowHeight = undefined as number | undefined,
    initialSort = [] as SortDef[],
    treeMode = false,
    treeChildField = 'children',
    treeStartExpanded = false,
    filterMode = false,
    onRowClick = undefined as ((row: any) => void) | undefined,
    onCellClick = undefined as ((cell: CellInfo) => void) | undefined,
    onSelectionChange = undefined as ((rows: any[]) => void) | undefined,
    onDataLoaded = undefined as ((count: number) => void) | undefined,
    onFiltered = undefined as ((count: number) => void) | undefined,
    onSorted = undefined as (() => void) | undefined,
    onReady = undefined as (() => void) | undefined,
  }: {
    data?: any[];
    columns?: ColumnDef[];
    selectable?: boolean;
    filterMode?: boolean;
    mode?: 'virtual' | 'page';
    pageSize?: number;
    rowHeight?: number;
    initialSort?: SortDef[];
    treeMode?: boolean;
    treeChildField?: string;
    treeStartExpanded?: boolean;
    onRowClick?: (row: any) => void;
    onCellClick?: (cell: CellInfo) => void;
    onSelectionChange?: (rows: any[]) => void;
    onDataLoaded?: (count: number) => void;
    onFiltered?: (count: number) => void;
    onSorted?: () => void;
    onReady?: () => void;
  } = $props();

  // ── Internal state ─────────────────────────────────────────────────────────

  let container: HTMLDivElement;
  let cfTable: CoframeTable | null = null;

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onMount(async () => {
    cfTable = await CoframeTable.create(container, {
      data, columns, selectable, filterMode, mode, pageSize, rowHeight: rowHeight,
      initialSort, treeMode, treeChildField, treeStartExpanded,
      onRowClick, onCellClick, onSelectionChange, onDataLoaded, onFiltered, onSorted, onReady,
    });
    // Re-apply columns in case they changed while create() was awaiting
    // (e.g. inferred alignments/formatters set by DataView after first data load).
    cfTable.updateColumns(columns, selectable, filterMode);
  });

  onDestroy(() => {
    cfTable?.destroy();
    cfTable = null;
  });

  // ── Reactive prop → CoframeTable ───────────────────────────────────────────
  // `cfTable` is a plain `let` (not $state) so it is not tracked by $effects.
  // Each effect reads only the props it cares about; the first run is a no-op
  // (cfTable is null until onMount resolves).

  $effect(() => {
    // Track `data` unconditionally before the null guard so Svelte registers
    // the dependency even when cfTable is not yet initialised.
    const _data = data;
    cfTable?.setData(_data);
  });

  $effect(() => {
    const _cols = columns; // track unconditionally before cfTable null-guard
    void selectable;       // re-run when checkbox column toggled
    void filterMode;       // re-run when filter inputs added/removed
    cfTable?.updateColumns(_cols, selectable, filterMode);
  });

  // ── Public API (bind:this → caller) ───────────────────────────────────────

  export function download(format: 'csv' | 'json', filename = `export.${format}`, options?: any, range?: string) {
    cfTable?.download(format, filename, options, range);
  }

  export function setData(newData: any[])          { cfTable?.setData(newData); }
  export function clearSelection()                 { cfTable?.clearSelection(); }
  export function clearHeaderFilter()              { cfTable?.clearHeaderFilter(); }
  export function clearSort()                      { cfTable?.clearSort(); }
  export function getSelectedData(): any[]         { return cfTable?.getSelectedData() ?? []; }
  export function getHeaderFilters(): any[]        { return cfTable?.getHeaderFilters() ?? []; }
  export function setHeaderFilter(field: string, value: unknown) { cfTable?.setHeaderFilter(field, value); }
  export function getSorters(): Array<{ field: string; dir: string }> { return cfTable?.getSorters() ?? []; }
  export function setSort(sorters: Array<{ field: string; dir: string }>) { cfTable?.setSort(sorters); }
  export function selectRowsByIds(ids: unknown[])  { cfTable?.selectRowsByIds(ids); }
  export function getRowMeta(id: unknown): Record<string, unknown> { return cfTable?.getRowMeta(id) ?? {}; }
  export function setRowMeta(id: unknown, updates: Record<string, unknown>) { cfTable?.setRowMeta(id, updates); }

  export async function addRows(newRows: any[]): Promise<number> {
    return cfTable?.addRows(newRows) ?? 0;
  }
</script>

<div bind:this={container} class="cf-datatable" tabindex="-1"></div>

<style>
  .cf-datatable {
    width: 100%;
    height: 100%;
    overflow: hidden;
    outline: none;
  }

  /* ── Tabulator reset → Coframe design system ───────────────────────────── */

  :global(.tabulator) {
    border: 1px solid var(--cf-border);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-family: inherit;
    background: var(--cf-bg);
    overflow: hidden;
  }

  /* Header */

  :global(.tabulator-header) {
    background: var(--cf-surface);
    border-bottom: 1px solid var(--cf-border);
  }

  :global(.tabulator-col) {
    background: var(--cf-surface);
    border-right: 1px solid var(--cf-border);
  }

  :global(.tabulator-col:last-child) {
    border-right: none;
  }

  :global(.tabulator-col-title) {
    font-weight: 600;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--cf-text-muted);
    padding: 0.5rem 0.75rem;
  }

  :global(.tabulator-col.tabulator-sortable .tabulator-col-title:hover) {
    color: var(--cf-text);
  }

  :global(.tabulator-col-sorter) {
    color: var(--cf-text-subtle);
  }

  /* Rows */

  :global(.tabulator-row) {
    border-bottom: 1px solid var(--cf-surface-hover);
    color: var(--cf-text);
    background: var(--cf-bg);
    cursor: pointer;
    transition: background 0.1s;
  }

  :global(.tabulator-row.tabulator-row-even) {
    background: var(--cf-surface);
  }

  :global(.tabulator-row:hover),
  :global(.tabulator-row.tabulator-row-even:hover) {
    background: var(--cf-accent-subtle) !important;
  }

  /* Selected rows — no background change, checkbox is the only indicator */
  :global(.tabulator-row.tabulator-selected),
  :global(.tabulator-row.tabulator-row-even.tabulator-selected),
  :global(.tabulator-row.tabulator-selected:hover),
  :global(.tabulator-row.tabulator-row-even.tabulator-selected:hover) {
    background: inherit !important;
  }

  /* Active row — keyboard navigation highlight */
  :global(.tabulator-row.cf-row-active),
  :global(.tabulator-row.tabulator-row-even.cf-row-active) {
    background: var(--cf-accent-light) !important;
  }

  :global(.tabulator-row.cf-row-active:hover),
  :global(.tabulator-row.tabulator-row-even.cf-row-active:hover) {
    background: var(--cf-accent-muted) !important;
  }

  /* Cells */

  :global(.tabulator-cell) {
    padding: 0.5rem 0.75rem;
    border-right: none;
    color: inherit;
  }

  /* Header filter inputs — style when visible (rendered only when filterMode=true) */
  :global(.tabulator-header-filter input) {
    width: 100%;
    padding: 0.15rem 0.35rem;
    font-size: 0.72rem;
    border: 1px solid var(--cf-border-input);
    border-radius: 0.25rem;
    background: var(--cf-bg);
    color: var(--cf-text);
    outline: none;
  }
  :global(.tabulator-header-filter input:focus) {
    border-color: var(--cf-accent-border);
    box-shadow: 0 0 0 2px var(--cf-accent-light);
  }

  /* Internal scrollbar */

  :global(.tabulator-tableholder) {
    overflow-y: auto;
    overflow-x: auto;
  }

  /* Footer / Pagination */

  :global(.tabulator-footer) {
    background: var(--cf-surface);
    border-top: 1px solid var(--cf-border);
    padding: 0.375rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  :global(.tabulator-page) {
    border: 1px solid var(--cf-border-input);
    border-radius: 0.25rem;
    padding: 0.2rem 0.5rem;
    background: var(--cf-bg);
    color: var(--cf-text);
    font-size: 0.75rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  :global(.tabulator-page:not([disabled]):hover) {
    background: var(--cf-accent-subtle);
    border-color: var(--cf-accent-border);
    color: var(--cf-accent-hover);
  }

  :global(.tabulator-page.active) {
    background: var(--cf-accent);
    border-color: var(--cf-accent);
    color: var(--cf-bg);
  }

  :global(.tabulator-page[disabled]) {
    opacity: 0.4;
    cursor: not-allowed;
  }

  :global(.tabulator-pages) {
    display: flex;
    gap: 0.125rem;
  }

  /* Empty data placeholder */

  :global(.tabulator-placeholder) {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 0.875rem;
    padding: 2rem;
  }
</style>
