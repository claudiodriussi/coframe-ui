<script lang="ts">
  /**
   * DataTable.svelte — Tabulator.js wrapper with Svelte 5 interface
   *
   * Props:
   *   data             any[]                   row data
   *   columns          ColumnDef[]             column definitions
   *   selectable       boolean                 checkbox selection column (default: false)
   *   mode             'virtual' | 'page'      virtual scroll or local pagination (default: virtual)
   *   pageSize         number                  rows per page — only for mode='page' (default: 20)
   *   rowHeight        number                  row height in px — useful for virtual scroll (optional)
   *   initialSort      SortDef[]               initial sort order
   *   treeMode         boolean                 enable Tabulator dataTree (nested children array)
   *   treeChildField   string                  field name for nested children (default: 'children')
   *   treeStartExpanded boolean                expand all tree nodes on load (default: false)
   *
   * Methods exposed via bind:this:
   *   download(format, filename?)              download CSV or JSON
   *   setData(data)                            replace data
   *   clearSelection()                         deselect all rows
   *   getSelectedData()                        return selected rows array
   *
   * Callbacks:
   *   onRowClick(rowData)                      click on a row (not on the checkbox)
   *   onCellClick(rowData, field, value)       click on a specific cell (not on the checkbox)
   *   onSelectionChange(rowsData[])            checkbox selection change
   *   onDataLoaded(count)                      data loaded or updated
   */
  import { onMount, onDestroy } from 'svelte';
  import 'tabulator-tables/dist/css/tabulator.min.css';

  // ── Public types ───────────────────────────────────────────────────────────

  export interface ColumnDef {
    field: string;
    title?: string;
    width?: number | string;
    minWidth?: number;
    maxWidth?: number;
    frozen?: boolean;
    hozAlign?: 'left' | 'center' | 'right';
    formatter?: string | ((cell: any, params: any) => string | HTMLElement);
    formatterParams?: Record<string, unknown>;
    sorter?: string;
    visible?: boolean;
    headerSort?: boolean;
    cssClass?: string;
  }

  export interface SortDef {
    field: string;
    dir: 'asc' | 'desc';
  }

  export interface CellInfo {
    field: string;
    value: unknown;
    row: any;
  }

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
    onRowClick = undefined as ((row: any) => void) | undefined,
    onCellClick = undefined as ((cell: CellInfo) => void) | undefined,
    onSelectionChange = undefined as ((rows: any[]) => void) | undefined,
    onDataLoaded = undefined as ((count: number) => void) | undefined,
  }: {
    data?: any[];
    columns?: ColumnDef[];
    selectable?: boolean;
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
  } = $props();

  // ── Internal state ─────────────────────────────────────────────────────────

  let container: HTMLDivElement;
  let table: any = null;
  let tableReady = false;   // true only after Tabulator fires 'tableBuilt'
  let observer: ResizeObserver | null = null;

  // ── Keyboard navigation ────────────────────────────────────────────────────
  // Plain variables (not reactive) — we manage the DOM class directly.
  // activeRow:   RowComponent reference for getNextRow/getPrevRow via display order
  // activeRowId: stable row identity (id field) for re-applying CSS after virtual
  //              scroll element recycling (renderRow event)

  let activeRow: any = null;
  let activeRowId: unknown = null;

  function setActiveRow(row: any) {
    if (activeRow) {
      try { activeRow.getElement().classList.remove('cf-row-active'); } catch (_) {}
    }
    activeRow = row;
    activeRowId = row.getData()?.id ?? null;
    try { row.getElement().classList.add('cf-row-active'); } catch (_) {}
    try { row.scrollTo('nearest', true); } catch (_) {}
    onRowClick?.(row.getData());
  }

  function handleKeyNav(e: KeyboardEvent) {
    if (!table || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    // Prevent browser scroll and Tabulator's own cell-to-cell navigation.
    // (Cell navigation is intentionally disabled here; editable tables will
    // need a separate strategy when that feature is implemented.)
    e.preventDefault();

    // getRows('active') returns all non-filtered rows in current display order
    // (i.e. respects sort). Essential for correct ↑/↓ traversal after sorting.
    const displayRows: any[] = table.getRows('active') ?? [];
    if (displayRows.length === 0) return;

    if (!activeRow) {
      setActiveRow(displayRows[0]);
      return;
    }

    const currentIdx = displayRows.indexOf(activeRow);
    // currentIdx === -1 if active row was filtered out → jump to first row
    const fromIdx = currentIdx === -1 ? 0 : currentIdx;
    const nextIdx = e.key === 'ArrowDown' ? fromIdx + 1 : fromIdx - 1;
    if (nextIdx >= 0 && nextIdx < displayRows.length) {
      setActiveRow(displayRows[nextIdx]);
    }
    // at border: stay on current row (no wrap-around)
  }

  // ── Tabulator config builder ───────────────────────────────────────────────

  function buildColumns(): any[] {
    const cols: any[] = [];

    if (selectable) {
      cols.push({
        formatter: 'rowSelection',
        titleFormatter: 'rowSelection',
        hozAlign: 'center',
        headerSort: false,
        width: 44,
        minWidth: 44,
        maxWidth: 44,
        frozen: true,
        // cellClick prevents double-firing: clicks on the checkbox cell
        // handle selection only; the row does not trigger onRowClick
        cellClick: (_e: Event, cell: any) => {
          cell.getRow().toggleSelect();
        },
        cssClass: 'cf-col-select',
      });
    }

    for (const c of columns) {
      const col: any = {
        field: c.field,
        title: c.title ?? c.field,
        hozAlign: c.hozAlign ?? 'left',
        headerSort: c.headerSort !== false,
        visible: c.visible !== false,
      };
      if (c.width !== undefined)         col.width = c.width;
      if (c.minWidth !== undefined)      col.minWidth = c.minWidth;
      if (c.maxWidth !== undefined)      col.maxWidth = c.maxWidth;
      if (c.frozen)                      col.frozen = true;
      if (c.formatter)                   col.formatter = c.formatter;
      if (c.formatterParams)             col.formatterParams = c.formatterParams;
      if (c.sorter)                      col.sorter = c.sorter;
      if (c.cssClass)                    col.cssClass = c.cssClass;
      cols.push(col);
    }

    return cols;
  }

  function buildOptions(): any {
    const opts: any = {
      data,
      columns: buildColumns(),
      // "100%" → Tabulator sets the root element to 100% of the container and
      // internally computes tableHolder = total - header - footer.
      // A numeric (px) value would control only the tableHolder, causing
      // overflow that triggers the ResizeObserver → feedback loop → blank screen.
      height: '100%',
      layout: 'fitDataStretch',
      headerSort: true,
      movableColumns: true,
      resizableColumnFit: false,
      selectableRows: selectable ? true : false,
      placeholder: 'No data to display',
    };

    if (mode === 'page') {
      opts.pagination = true;
      opts.paginationMode = 'local';
      opts.paginationSize = pageSize;
      opts.paginationSizeSelector = [10, 20, 50, 100];
    }

    if (rowHeight) opts.rowHeight = rowHeight;

    if (treeMode) {
      opts.dataTree = true;
      opts.dataTreeChildField = treeChildField;
      opts.dataTreeStartExpanded = treeStartExpanded;
    }

    if (initialSort.length > 0) {
      opts.initialSort = initialSort.map((s) => ({ column: s.field, dir: s.dir }));
    }

    return opts;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onMount(async () => {
    const { TabulatorFull } = await import('tabulator-tables');

    // Force a synchronous layout reflow so the browser computes the flex/height
    // chain before Tabulator reads container dimensions. Without this, in nested
    // flex layouts with height:100%, the container reports offsetHeight=0 during
    // the microtask that follows `await import()`. Tabulator then sets the
    // tableholder to 0px (or auto), all rows render at natural height, and the
    // container's overflow:hidden clips them — no scrollbar, no scroll.
    void container.offsetHeight;

    table = new TabulatorFull(container, buildOptions());

    // cellClick — captures row and column; skips the checkbox column (empty field)
    table.on('cellClick', (_e: MouseEvent, cell: any) => {
      const field: string = cell.getField();
      if (!field) return; // rowSelection column has no field
      const rowComp = cell.getRow();
      onCellClick?.({ field, value: cell.getValue(), row: rowComp.getData() });
      setActiveRow(rowComp); // updates activeRow + fires onRowClick
    });

    if (selectable) {
      // rowSelectionChanged: data = data array, rows = RowComponent array
      table.on('rowSelectionChanged', (selectedData: any[]) => {
        onSelectionChange?.(selectedData);
      });
    }

    table.on('dataLoaded', (loadedData: any[]) => {
      // Reset active row when data is fully replaced (replaceData / initial load).
      // addData (load-more) does not fire dataLoaded, so activeRow is preserved.
      activeRow = null;
      activeRowId = null;
      onDataLoaded?.(loadedData.length);
    });

    // Re-apply active row CSS class when virtual scroll recycles row elements.
    // Without this, scrolling away and back would lose the visual highlight.
    table.on('renderRow', (row: any) => {
      if (activeRowId === null) return;
      const el = row.getElement();
      if (row.getData()?.id === activeRowId) {
        el.classList.add('cf-row-active');
      } else {
        el.classList.remove('cf-row-active');
      }
    });

    // tableBuilt fires when Tabulator has finished initializing all its modules.
    // Only after this event is it safe to call redraw() or other layout methods.
    table.on('tableBuilt', () => {
      tableReady = true;
    });

    // Keyboard ↑/↓ navigation — fires same onRowClick as mouse click
    container.addEventListener('keydown', handleKeyNav);

    // ResizeObserver: notifies Tabulator of container resizes (e.g. SplitPane).
    // Guard with tableReady: observe() can fire synchronously on some browsers
    // before tableBuilt, when table is assigned but internal DOM is not ready.
    observer = new ResizeObserver(() => {
      if (tableReady) table.redraw(true);
    });
    observer.observe(container);
  });

  onDestroy(() => {
    observer?.disconnect();
    container.removeEventListener('keydown', handleKeyNav);
    table?.destroy();
    table = null;
  });

  // ── Prop reactivity → Tabulator ───────────────────────────────────────────
  // $effect tracks only reactive props (data, columns); `table` is a plain let
  // so it is not tracked — the effect does not re-run when table is assigned
  // in onMount. On the first run table is null → no-op. Fires only on later changes.

  $effect(() => {
    // Read `data` unconditionally so Svelte 5 tracks it even when table is
    // still null (async onMount with await import hasn't completed yet).
    const _data = data;
    if (table) table.replaceData(_data);
  });

  $effect(() => {
    // buildColumns() reads `columns` internally — calling it here ensures
    // the effect is subscribed to `columns` changes regardless of `table`.
    const cols = buildColumns();
    if (table) table.setColumns(cols);
  });

  // ── Public API (bind:this={ref} → ref.download / ref.setData / ...) ──────

  export function download(format: 'csv' | 'json', filename = `export.${format}`) {
    table?.download(format, filename);
  }

  export function setData(newData: any[]) {
    table?.replaceData(newData);
  }

  export function clearSelection() {
    table?.deselectRow();
  }

  export function getSelectedData(): any[] {
    return table?.getSelectedData() ?? [];
  }

  // Append rows to the existing dataset, respecting the current sort order.
  // Returns the new total row count. Fires onDataLoaded with the updated count.
  export async function addRows(newRows: any[]): Promise<number> {
    if (!table) return 0;
    await table.addData(newRows);
    const total: number = table.getDataCount();
    onDataLoaded?.(total);
    return total;
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
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-family: inherit;
    background: #ffffff;
    overflow: hidden;
  }

  /* Header */

  :global(.tabulator-header) {
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;
  }

  :global(.tabulator-col) {
    background: #f9fafb;
    border-right: 1px solid #e5e7eb;
  }

  :global(.tabulator-col:last-child) {
    border-right: none;
  }

  :global(.tabulator-col-title) {
    font-weight: 600;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #6b7280;
    padding: 0.5rem 0.75rem;
  }

  :global(.tabulator-col.tabulator-sortable .tabulator-col-title:hover) {
    color: #374151;
  }

  :global(.tabulator-col-sorter) {
    color: #9ca3af;
  }

  /* Rows */

  :global(.tabulator-row) {
    border-bottom: 1px solid #f3f4f6;
    color: #374151;
    background: #ffffff;
    cursor: pointer;
    transition: background 0.1s;
  }

  :global(.tabulator-row.tabulator-row-even) {
    background: #fafafa;
  }

  :global(.tabulator-row:hover),
  :global(.tabulator-row.tabulator-row-even:hover) {
    background: #eff6ff !important;
  }

  :global(.tabulator-row.tabulator-selected),
  :global(.tabulator-row.tabulator-row-even.tabulator-selected) {
    background: #dbeafe !important;
  }

  :global(.tabulator-row.tabulator-selected:hover),
  :global(.tabulator-row.tabulator-row-even.tabulator-selected:hover) {
    background: #bfdbfe !important;
  }

  /* Active row — keyboard navigation highlight (same palette as selected) */
  :global(.tabulator-row.cf-row-active),
  :global(.tabulator-row.tabulator-row-even.cf-row-active) {
    background: #dbeafe !important;
  }

  :global(.tabulator-row.cf-row-active:hover),
  :global(.tabulator-row.tabulator-row-even.cf-row-active:hover) {
    background: #bfdbfe !important;
  }

  /* Cells */

  :global(.tabulator-cell) {
    padding: 0.5rem 0.75rem;
    border-right: none;
    color: inherit;
  }

  /* Checkbox column — reduce lateral padding */
  :global(.cf-col-select) {
    padding: 0 0.25rem !important;
  }

  /* Internal scrollbar */

  :global(.tabulator-tableholder) {
    overflow-y: auto;
    overflow-x: auto;
  }

  /* Footer / Pagination */

  :global(.tabulator-footer) {
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
    padding: 0.375rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  :global(.tabulator-page) {
    border: 1px solid #d1d5db;
    border-radius: 0.25rem;
    padding: 0.2rem 0.5rem;
    background: #ffffff;
    color: #374151;
    font-size: 0.75rem;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  :global(.tabulator-page:not([disabled]):hover) {
    background: #eff6ff;
    border-color: #93c5fd;
    color: #1d4ed8;
  }

  :global(.tabulator-page.active) {
    background: #2563eb;
    border-color: #2563eb;
    color: #ffffff;
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
