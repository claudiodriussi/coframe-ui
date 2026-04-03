/**
 * dataview.types.ts — shared type definitions for DataView and related components.
 *
 * Centralised here to avoid circular imports between DataView.svelte,
 * DataViewToolbar.svelte, DataViewTable.svelte, and dataview.query.ts.
 */

export interface ViewSource {
  model?: string;
  endpoint?: string;
  joins?: Array<string | Record<string, unknown>>;
  where?: unknown[];
  filters?: unknown;
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
  hozAlign?: 'left' | 'center' | 'right';  // Tabulator native
  align?: 'left' | 'center' | 'right';      // user-friendly alias for hozAlign
  formatter?: 'date' | 'datetime' | 'time' | string;
  formatterParams?: Record<string, unknown>;
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
  type: 'table' | 'tree' | 'kanban' | 'cards' | string;
  title?: string;
  source?: ViewSource;
  columns?: ViewColumn[];
  actions?: ViewActions;
  policy?: ViewPolicy;
  tree?: ViewTreeConfig;
  /** List of available view types for the toolbar switcher (e.g. ['table','kanban']). */
  allow_views?: string[];
  [key: string]: unknown;
}
