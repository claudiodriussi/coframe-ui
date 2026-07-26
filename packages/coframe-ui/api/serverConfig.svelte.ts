/**
 * Server configuration and type registry — loaded once at app startup.
 *
 * Singleton store: fetched once via get_server_config, cached in memory.
 * Loaded eagerly in app/+layout.svelte so all components have it available.
 *
 * Provides:
 *   serverConfig.config   — client-relevant config from config.yaml (dataview section, etc.)
 *   serverConfig.types    — type registry for widget resolution (former get_type_schema)
 *
 * Design principle: server is client-agnostic and only serialises what is
 * declared in YAML. The client owns the mapping from SQLAlchemy base types
 * to input widgets (BASE_WIDGET_MAP).
 */

import { api } from './client';

// ── Client-side rendering maps for base types ────────────────────────────────
// Kept in the client: different clients (web, mobile, desktop) may render
// the same type differently. Server is UI-agnostic.

export const BASE_WIDGET_MAP: Record<string, string> = {
  String:      'text',
  Text:        'textarea',
  Integer:     'number',
  Float:       'number',
  Numeric:     'number',
  Boolean:     'checkbox',
  DateTime:    'datetime',
  Date:        'date',
  Time:        'time',
  JSON:        'json',
  LargeBinary: 'file',
};

export const BASE_FORMATTER_MAP: Record<string, string> = {
  Integer:  'integer',
  Float:    'decimal',
  Numeric:  'decimal',
  Decimal:  'decimal',
  Money:    'money',
  Date:     'date',
  DateTime: 'datetime',
  FK:       'fk_label',
};

export const BASE_ALIGN_MAP: Record<string, 'left' | 'right' | 'center'> = {
  Integer:  'right',
  Float:    'right',
  Numeric:  'right',
  Decimal:  'right',
  Money:    'right',
  Boolean:  'center',
};

// ── Types — mirror DbType.to_client_dict() server output ────────────────────

export interface TypeColumnInfo {
  name: string;
  type?: string;
  nullable?: boolean;
  unique?: boolean;
  default?: unknown;
  label?: string;
  help?: string;
  [key: string]: unknown;
}

export interface TypeInfo {
  /** Inheritance chain, nearest parent first. e.g. ['Money','Numeric'] for Price */
  inheritance: string[];
  /** Nearest parent type name (= inheritance[0]) */
  base?: string;
  /** SQLAlchemy Python class name, e.g. 'str', 'Decimal' */
  python_type?: string;
  /** True for SQLAlchemy built-in types, not visible unless include_builtin=true */
  builtin: boolean;
  // YAML-declared attrs
  widget?: string;
  nullable?: boolean;
  length?: number;
  precision?: number;
  scale?: number;
  label?: string;
  help?: string;
  default?: unknown;
  primary_key?: boolean;
  autoincrement?: boolean;
  index?: boolean;
  unique?: boolean;
  validate?: string;
  /** Composite types expand into multiple DB columns */
  columns?: TypeColumnInfo[];
  [key: string]: unknown;
}

export type TypeRegistry = Record<string, TypeInfo>;

// ── Schema registry ───────────────────────────────────────────────────────────

export interface SchemaFieldInfo {
  type?: string;
  widget?: string;
  formatter?: string;
  align?: string;
  table?: string;        // FK: target table
  label_field?: string;  // FK: display field
  [key: string]: unknown;
}

export type SchemaRegistry = Record<string, Record<string, SchemaFieldInfo>>;

// ── Table schema ─────────────────────────────────────────────────────────────

export interface TableColumnInfo {
  name: string;
  type?: string;
  label?: string;
  virtual?: boolean;
  editable?: boolean;
  nullable?: boolean;
  secret?: boolean;
  /** Column default (from model YAML). May be a `$`-token (e.g. "$op_date"),
   *  a JSON scalar, or a codegen expression string. See DataForm create-mode. */
  default?: unknown;
  /** Deferred default: filled server-side at save, never prefilled in a form. */
  deferred?: boolean;
  foreign_key?: { target: string; field: string };
  [key: string]: unknown;
}

export interface TableInfo {
  /** PK column name(s). Single element for normal tables, two for M2M composite PKs. */
  pk_fields: string[];
  columns: TableColumnInfo[];
  mixins?: string[];
  /** Column to show as label in FK comboboxes (resolved server-side). */
  display_field?: string;
  /** Real columns used for SQL LIKE search in FK comboboxes. */
  search_fields?: string[];
}

export type TableRegistry = Record<string, TableInfo>;

// ── Server config shape ──────────────────────────────────────────────────────

export interface DataviewConfig {
  /** Global DataView page size default (overridable per-view via source.limit in YAML) */
  page_size?: number;
  /**
   * (future) Per-category page size matching DATA_MODEL.md §1 tags.
   * reference: 500 | master: 100 | transaction: 100 | log: 50 | detail: null
   */
  page_size_by_type?: Record<string, number | null>;
}

export interface ServerConfigData {
  dataview?: DataviewConfig;
  [key: string]: unknown;
}

// ── Widget resolution ────────────────────────────────────────────────────────

/**
 * Resolve the effective widget for a named type, walking the inheritance chain.
 *
 * Priority:
 *   1. Own explicit `widget` attr (declared in YAML)
 *   2. Ancestor's `widget` attr (nearest ancestor wins)
 *   3. BASE_WIDGET_MAP lookup for SQLAlchemy base type names in the chain
 *   4. undefined — caller decides the fallback
 */
export function resolveWidget(typeName: string, registry: TypeRegistry): string | undefined {
  // Handle direct base-type lookup (e.g. 'String' not in registry)
  if (!registry[typeName]) return BASE_WIDGET_MAP[typeName];

  const info = registry[typeName];

  // 1. Own explicit widget
  if (info.widget) return info.widget;

  // 2+3. Walk inheritance chain (parent → grandparent → …)
  for (const ancestor of info.inheritance) {
    const ancestorInfo = registry[ancestor];
    if (ancestorInfo?.widget) return ancestorInfo.widget;
    if (BASE_WIDGET_MAP[ancestor]) return BASE_WIDGET_MAP[ancestor];
  }

  // 4. Last-resort via python_type
  if (info.python_type && BASE_WIDGET_MAP[info.python_type]) {
    return BASE_WIDGET_MAP[info.python_type];
  }

  return undefined;
}

export function resolveFormatter(typeName: string, registry: TypeRegistry): string | undefined {
  if (BASE_FORMATTER_MAP[typeName]) return BASE_FORMATTER_MAP[typeName];
  const info = registry[typeName];
  if (!info) return undefined;
  if (info.formatter) return info.formatter as string;
  for (const ancestor of info.inheritance) {
    if (BASE_FORMATTER_MAP[ancestor]) return BASE_FORMATTER_MAP[ancestor];
    const a = registry[ancestor];
    if (a?.formatter) return a.formatter as string;
  }
  return undefined;
}

export function resolveAlign(typeName: string, registry: TypeRegistry): 'left' | 'right' | 'center' | undefined {
  if (BASE_ALIGN_MAP[typeName]) return BASE_ALIGN_MAP[typeName];
  const info = registry[typeName];
  if (!info) return undefined;
  if (info.align) return info.align as 'left' | 'right' | 'center';
  for (const ancestor of info.inheritance) {
    if (BASE_ALIGN_MAP[ancestor]) return BASE_ALIGN_MAP[ancestor];
    const a = registry[ancestor];
    if (a?.align) return a.align as 'left' | 'right' | 'center';
  }
  return undefined;
}

// ── ServerConfigStore ────────────────────────────────────────────────────────

class ServerConfigStore {
  types       = $state<TypeRegistry>({});
  config      = $state<ServerConfigData>({});
  tables      = $state<TableRegistry>({});
  schemas     = $state<SchemaRegistry>({});
  loaded      = $state(false);
  loading     = $state(false);
  error       = $state<string | null>(null);
  /** Whether the current load included SQLAlchemy built-in types */
  withBuiltin = $state(false);

  /**
   * Fetch server config and type schema from the server.
   *
   * Eager: called once in app/+layout.svelte before any panel renders.
   * No-op if already loaded with the same `includeBuiltin` setting.
   */
  async load(includeBuiltin = false): Promise<void> {
    if (this.loaded && this.withBuiltin === includeBuiltin) return;
    if (this.loading) return;

    this.loading = true;
    this.error   = null;

    try {
      const res = await api.endpoint<{ config: ServerConfigData; types: TypeRegistry; tables: TableRegistry; schemas: SchemaRegistry }>(
        'get_server_config',
        { include_builtin: includeBuiltin },
      );

      if (res.status === 'success' && res.data) {
        this.config      = res.data.config  ?? {};
        this.types       = res.data.types   ?? {};
        this.tables      = res.data.tables  ?? {};
        this.schemas     = res.data.schemas ?? {};
        this.loaded      = true;
        this.withBuiltin = includeBuiltin;
      } else {
        this.error = res.message ?? 'Unknown error';
      }
    } catch (e) {
      this.error = String(e);
    } finally {
      this.loading = false;
    }
  }

  resolveWidget(typeName: string): string | undefined {
    return resolveWidget(typeName, this.types);
  }

  resolveFormatter(typeName: string): string | undefined {
    return resolveFormatter(typeName, this.types);
  }

  resolveAlign(typeName: string): 'left' | 'right' | 'center' | undefined {
    return resolveAlign(typeName, this.types);
  }

  /** Clear cache so the next load() triggers a fresh fetch. */
  reset() {
    this.types   = {};
    this.config  = {};
    this.tables  = {};
    this.schemas = {};
    this.loaded  = false;
    this.error   = null;
  }
}

export const serverConfig = new ServerConfigStore();
