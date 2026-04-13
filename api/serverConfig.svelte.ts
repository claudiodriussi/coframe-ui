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

// ── Client-side widget map for SQLAlchemy base types ────────────────────────
// Used as fallback when walking the inheritance chain.
// Kept in the client, not the server, because different clients (web, mobile,
// desktop) may map the same base type to a different input control.
export const BASE_WIDGET_MAP: Record<string, string> = {
  String:      'text',
  Text:        'textarea',
  Integer:     'number',
  Float:       'number',
  Numeric:     'number',
  Boolean:     'checkbox',
  DateTime:    'datetime-local',
  Date:        'date',
  Time:        'time',
  JSON:        'json',
  LargeBinary: 'file',
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

// ── Table schema ─────────────────────────────────────────────────────────────

export interface TableColumnInfo {
  name: string;
  type?: string;
  label?: string;
  virtual?: boolean;
  editable?: boolean;
  nullable?: boolean;
  secret?: boolean;
  [key: string]: unknown;
}

export interface TableInfo {
  /** PK column name(s). Single element for normal tables, two for M2M composite PKs. */
  pk_fields: string[];
  columns: TableColumnInfo[];
  mixins?: string[];
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

// ── ServerConfigStore ────────────────────────────────────────────────────────

class ServerConfigStore {
  types       = $state<TypeRegistry>({});
  config      = $state<ServerConfigData>({});
  tables      = $state<TableRegistry>({});
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
      const res = await api.endpoint<{ config: ServerConfigData; types: TypeRegistry; tables: TableRegistry }>(
        'get_server_config',
        { include_builtin: includeBuiltin },
      );

      if (res.status === 'success' && res.data) {
        this.config      = res.data.config  ?? {};
        this.types       = res.data.types   ?? {};
        this.tables      = res.data.tables  ?? {};
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

  /** Resolve widget for a type name using the current registry. */
  resolveWidget(typeName: string): string | undefined {
    return resolveWidget(typeName, this.types);
  }

  /** Clear cache so the next load() triggers a fresh fetch. */
  reset() {
    this.types   = {};
    this.config  = {};
    this.tables  = {};
    this.loaded  = false;
    this.error   = null;
  }
}

export const serverConfig = new ServerConfigStore();
