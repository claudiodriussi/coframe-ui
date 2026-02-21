/**
 * Lazy-loaded type schema from the Coframe backend.
 *
 * Singleton store — fetched once, cached in memory.
 * Provides client-side widget resolution walking the inheritance chain.
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

// ── TypeSchemaStore ──────────────────────────────────────────────────────────

class TypeSchemaStore {
  types       = $state<TypeRegistry>({});
  loaded      = $state(false);
  loading     = $state(false);
  error       = $state<string | null>(null);
  /** Whether the current load included SQLAlchemy built-in types */
  withBuiltin = $state(false);

  /**
   * Fetch type schema from the server.
   *
   * Lazy: no-op if already loaded with the same `includeBuiltin` setting.
   * Console logs are intentional — they document lazy-load behaviour for the
   * playground demo.
   */
  async load(includeBuiltin = false): Promise<void> {
    if (this.loaded && this.withBuiltin === includeBuiltin) {
      console.log('[typeSchema] already loaded (includeBuiltin=%s) — skip', includeBuiltin);
      return;
    }
    if (this.loading) {
      console.log('[typeSchema] load already in progress — skip');
      return;
    }

    console.log('[typeSchema] fetching… (includeBuiltin=%s)', includeBuiltin);
    this.loading = true;
    this.error   = null;

    try {
      const res = await api.endpoint<{ types: TypeRegistry }>('get_type_schema', {
        include_builtin: includeBuiltin,
      });

      if (res.status === 'success' && res.data) {
        this.types       = res.data.types;
        this.loaded      = true;
        this.withBuiltin = includeBuiltin;
        console.log(
          '[typeSchema] loaded %d types (includeBuiltin=%s):',
          Object.keys(this.types).length,
          includeBuiltin,
          this.types,
        );
      } else {
        this.error = res.message ?? 'Unknown error';
        console.error('[typeSchema] load failed:', this.error);
      }
    } catch (e) {
      this.error = String(e);
      console.error('[typeSchema] exception:', e);
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
    this.loaded  = false;
    this.error   = null;
    console.log('[typeSchema] reset — next load() will re-fetch');
  }
}

export const typeSchema = new TypeSchemaStore();
