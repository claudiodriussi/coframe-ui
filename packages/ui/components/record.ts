/**
 * `$record.x` — a value of the record being edited, read from the live draft.
 *
 * The draft, not the loaded record: a value typed and not yet saved is the one
 * the user means. Other `$` tokens pass through untouched, so whoever receives
 * the map can still resolve its own (`$op_date`, ...).
 */

const PREFIX = '$record.';

export function resolveRecordTokens(
  map: Record<string, unknown> | undefined,
  record: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(map ?? {}).map(([k, v]) =>
      typeof v === 'string' && v.startsWith(PREFIX)
        ? [k, record[v.slice(PREFIX.length)]]
        : [k, v]
    )
  );
}

/**
 * The initial values of a row created in a collection.
 *
 * `prefill` is a suggestion read from the parent's draft: the fields stay
 * visible and editable, and a value the parent does not have yet is left out
 * rather than written as empty. `defaults` is the other half of the domain, so it
 * wins over a prefill naming the same field.
 */
export function rowDefaults(
  node: { prefill?: Record<string, unknown>; defaults?: Record<string, unknown> },
  record: Record<string, unknown>,
): Record<string, unknown> {
  const prefilled = Object.fromEntries(
    Object.entries(resolveRecordTokens(node.prefill, record)).filter(([, v]) => v != null)
  );
  return { ...prefilled, ...(node.defaults ?? {}) };
}
