/**
 * Shared types for CoframeTable and DataTable.svelte.
 */

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

export interface CoframeTableConfig {
  data: any[];
  columns: ColumnDef[];
  selectable: boolean;
  filterMode: boolean;
  mode: 'virtual' | 'page';
  pageSize: number;
  rowHeight?: number;
  initialSort: SortDef[];
  treeMode: boolean;
  treeChildField: string;
  treeStartExpanded: boolean;
  onRowClick?: (row: any) => void;
  onCellClick?: (cell: CellInfo) => void;
  onSelectionChange?: (rows: any[]) => void;
  onDataLoaded?: (count: number) => void;
  onFiltered?: (count: number) => void;
  onSorted?: () => void;
  onReady?: () => void;
}
