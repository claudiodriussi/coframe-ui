<script lang="ts">
  /**
   * DataTable.svelte — wrapper Tabulator.js con interfaccia Svelte 5
   *
   * Props:
   *   data           any[]                   righe dati
   *   columns        ColumnDef[]             definizioni colonne
   *   selectable     boolean                 colonna checkbox selezione (default: false)
   *   mode           'virtual' | 'page'      virtual scroll o paginazione locale (default: virtual)
   *   pageSize       number                  righe per pagina — solo mode='page' (default: 20)
   *   rowHeight      number                  altezza riga px — utile per virtual scroll (opzionale)
   *   initialSort    SortDef[]               ordinamento iniziale
   *
   * Metodi esposti via bind:this:
   *   download(format, filename?)            scarica CSV o JSON
   *   setData(data)                          sostituisce i dati
   *   clearSelection()                       deseleziona tutte le righe
   *   getSelectedData()                      array righe selezionate
   *
   * Callback:
   *   onRowClick(rowData)                    click su una riga (non sulla checkbox)
   *   onCellClick(rowData, field, value)     click su una cella specifica (non sulla checkbox)
   *   onSelectionChange(rowsData[])          cambio selezione checkbox
   *   onDataLoaded(count)                    dati caricati o aggiornati
   */
  import { onMount, onDestroy } from 'svelte';
  import 'tabulator-tables/dist/css/tabulator.min.css';

  // ── Tipi pubblici ──────────────────────────────────────────────────────────

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
    onRowClick?: (row: any) => void;
    onCellClick?: (cell: CellInfo) => void;
    onSelectionChange?: (rows: any[]) => void;
    onDataLoaded?: (count: number) => void;
  } = $props();

  // ── Stato interno ──────────────────────────────────────────────────────────

  let container: HTMLDivElement;
  let table: any = null;
  let observer: ResizeObserver | null = null;

  // ── Build config Tabulator ─────────────────────────────────────────────────

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
        // cellClick toglie il doppio evento: il click sulla cella checkbox
        // gestisce solo la selezione; la riga non scatena onRowClick
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
      // "100%" → Tabulator imposta l'elemento root al 100% del container e
      // calcola internamente tableHolder = totale - header - footer.
      // Un valore numerico (px) controllerebbe solo il tableHolder, causando
      // un overflow che innesca il ResizeObserver → feedback loop → bianco.
      height: '100%',
      layout: 'fitDataStretch',
      headerSort: true,
      movableColumns: true,
      resizableColumnFit: false,
      selectableRows: selectable ? true : false,
      placeholder: 'Nessun dato da visualizzare',
    };

    if (mode === 'page') {
      opts.pagination = true;
      opts.paginationMode = 'local';
      opts.paginationSize = pageSize;
      opts.paginationSizeSelector = [10, 20, 50, 100];
    }

    if (rowHeight) opts.rowHeight = rowHeight;

    if (initialSort.length > 0) {
      opts.initialSort = initialSort.map((s) => ({ column: s.field, dir: s.dir }));
    }

    return opts;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  onMount(async () => {
    const { TabulatorFull } = await import('tabulator-tables');

    table = new TabulatorFull(container, buildOptions());

    // cellClick — intercetta riga e colonna; salta la colonna checkbox (field vuoto)
    table.on('cellClick', (_e: MouseEvent, cell: any) => {
      const field: string = cell.getField();
      if (!field) return; // colonna rowSelection non ha field
      const row = cell.getRow().getData();
      const value: unknown = cell.getValue();
      onCellClick?.({ field, value, row });
      onRowClick?.(row);
    });

    if (selectable) {
      // rowSelectionChanged: data = array dati, rows = array RowComponent
      table.on('rowSelectionChanged', (selectedData: any[]) => {
        onSelectionChange?.(selectedData);
      });
    }

    table.on('dataLoaded', (loadedData: any[]) => {
      onDataLoaded?.(loadedData.length);
    });

    // ResizeObserver: notifica Tabulator dei resize del container (es. SplitPane).
    // Con height:"100%" il CSS gestisce già l'altezza; redraw(true) aggiorna
    // le righe visibili nel virtual scroll dopo che il container ha cambiato dimensione.
    observer = new ResizeObserver(() => {
      if (table) table.redraw(true);
    });
    observer.observe(container);
  });

  onDestroy(() => {
    observer?.disconnect();
    table?.destroy();
    table = null;
  });

  // ── Reattività props → Tabulator ──────────────────────────────────────────
  // $effect traccia solo le prop reattive (data, columns); `table` è let normale
  // quindi non è tracciato — l'effect non ri-scatta quando table viene assegnato
  // in onMount. Al primo run table è null → no-op. Scatta solo su cambi successivi.

  $effect(() => {
    if (table && data) table.replaceData(data);
  });

  $effect(() => {
    if (table && columns) table.setColumns(buildColumns());
  });

  // ── API pubblica (bind:this={ref} → ref.download / ref.setData / ...) ─────

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
</script>

<div bind:this={container} class="cf-datatable"></div>

<style>
  .cf-datatable {
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  /* ── Reset base Tabulator → design system Coframe ─────────────────────── */

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

  /* Righe */

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

  /* Celle */

  :global(.tabulator-cell) {
    padding: 0.5rem 0.75rem;
    border-right: none;
    color: inherit;
  }

  /* Colonna checkbox — riduce il padding laterale */
  :global(.cf-col-select) {
    padding: 0 0.25rem !important;
  }

  /* Scrollbar interna */

  :global(.tabulator-tableholder) {
    overflow-y: auto;
    overflow-x: auto;
  }

  /* Footer / Paginazione */

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

  /* Placeholder dato vuoto */

  :global(.tabulator-placeholder) {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 0.875rem;
    padding: 2rem;
  }
</style>
