/**
 * dataview.query.ts — query construction helpers for DataView.
 *
 * Pure functions: no Svelte state, no side effects.
 * Used by DataView.svelte for loadData/loadMore, and will be the foundation
 * for the visual where-rule editor.
 */

import type { ViewSource, ViewColumn } from './dataview.types';

// ── Field key extraction ───────────────────────────────────────────────────
// columns.field may be a plain name ("title"), a Model.field notation
// ("Author.first_name"), or a full QB select expression with alias
// ("CASE WHEN ... END as display_name"). The Tabulator field key is always
// the alias (everything after the last " as "), or the last dot-segment.

export function extractFieldKey(expr: string): string {
  const lower = expr.toLowerCase();
  const asIdx = lower.lastIndexOf(' as ');
  if (asIdx !== -1) return expr.slice(asIdx + 4).trim();
  const dot = expr.lastIndexOf('.');
  if (dot !== -1) return expr.slice(dot + 1);
  return expr;
}

// ── Trigger variable substitution ─────────────────────────────────────────
// Recursively replace $trigger.field with values from the trigger payload.
// When the entire string is a single $trigger.field reference, the raw typed
// value is returned (preserving number/boolean types for QB filter comparisons).
// When $trigger.* appears inside a larger string, values are stringified.

export function applyTriggerVars(value: unknown, trig: Record<string, unknown>): unknown {
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

// Returns true if value (or any nested value) contains a $trigger.* reference.
export function hasTriggerVars(value: unknown): boolean {
  if (typeof value === 'string') return /\$trigger\./.test(value);
  if (Array.isArray(value)) return value.some(hasTriggerVars);
  if (value && typeof value === 'object') return Object.values(value as object).some(hasTriggerVars);
  return false;
}

// ── Join normalisation ─────────────────────────────────────────────────────
// Convert a descriptor join item to QB-compatible object.

export function normalizeJoin(
  j: string | Record<string, unknown>,
  trig: Record<string, unknown>,
): Record<string, unknown> {
  if (typeof j === 'string') return { table: j };
  if (typeof j.table === 'string' && typeof j.on === 'string') {
    return { [j.table]: j.on };
  }
  // Pass-through (e.g. { via: ..., where: [...] }) — apply trigger substitution
  return applyTriggerVars(j, trig) as Record<string, unknown>;
}

// ── Query construction ─────────────────────────────────────────────────────
// Builds a QB-compatible query object from a ViewSource descriptor.
// NOTE: limit/offset are NOT set here — they are applied by the caller
// (loadData/loadMore) as pagination parameters.

export function buildQuery(
  src: ViewSource,
  columns: ViewColumn[] | undefined,
  trig: Record<string, unknown>,
): Record<string, unknown> {
  const q: Record<string, unknown> = { table: src.model };

  // select: use descriptor column fields (QB select expressions), always include id
  if (columns && columns.length > 0) {
    const fields = columns.map(c => c.field);
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
      typeof f === 'string' && f.startsWith('-') ? [f.slice(1), 'desc'] : f,
    );
  }

  if (src.group_by && src.group_by.length > 0) {
    q.group_by = src.group_by;
  }

  const filters = mergeDomain(src, trig);
  if (filters !== undefined) {
    q.filters = filters;
  }

  return q;
}

// ── Domain ─────────────────────────────────────────────────────────────────
// `domain` and `filters` share the querybuilder syntax, so either may be a
// bare condition, a list of conditions, or {conditions: [...]}.

function conditionsOf(f: unknown): unknown[] | null {
  if (f === undefined || f === null || f === '') return null;
  if (Array.isArray(f)) return f.length > 0 ? f : null;
  if (typeof f === 'object') {
    const inner = (f as Record<string, unknown>).conditions;
    if (Array.isArray(inner)) return inner.length > 0 ? inner : null;
  }
  return [f];
}

// Combine the view's domain with its filters. The two go in as sibling groups
// rather than one flat list: a condition list may open with ['op', 'or'], and
// concatenating would silently widen the domain to an OR branch.
export function mergeDomain(
  src: ViewSource,
  trig: Record<string, unknown>,
): unknown | undefined {
  const domain = conditionsOf(applyTriggerVars(src.domain, trig));
  if (!domain) {
    return src.filters ? applyTriggerVars(src.filters, trig) : undefined;
  }
  const filters = conditionsOf(applyTriggerVars(src.filters, trig));
  return { conditions: filters ? [domain, filters] : domain };
}
