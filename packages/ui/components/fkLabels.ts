/**
 * fkLabels.ts — showing what a foreign key stands for, in a grid.
 *
 * A label is not a column of the row: it is the **resolution of a key**. It is not
 * in the record, it cannot be, and it costs a query — so it is *declared*, never
 * inferred. A column names the path from the key to the field to show:
 *
 *     - field: author_id                 the key, bare — no query
 *     - field: author_id.full_name       the name — one query for the column
 *
 * Both may be declared, and then both are shown. It is the same notation a list
 * uses for a joined column (`Publisher.name`), and the same rule for where the
 * value lands: the last segment. So `DataView` needs to know nothing about any of
 * this — it already maps a dotted column onto that key.
 *
 * Why the client resolves it at all: a row the user just added is not in the
 * database, so no query of the server's can attach a name to it. The mechanism is
 * needed here regardless, and one mechanism covers both provenances.
 *
 * Pure on purpose: what to ask for and what to show are functions, the asking
 * belongs to whoever holds the cache.
 */

export interface FkSpec {
  /** Column of the row that holds the key. */
  field: string;
  /** Where the label lands in the display row — the path's last segment. */
  key: string;
  /** Table the key points at. */
  target: string;
  /** Its primary key column. */
  targetPk: string;
  /** The column of the target to show. */
  displayField: string;
}

/** What a table's metadata says, in the shape `serverConfig.tables` provides. */
interface TableLike {
  pk_fields?: string[];
  display_field?: string;
  columns?: Array<{ name: string; foreign_key?: { target: string; field: string } }>;
}

/** Keys already resolved: `{key: {id: label}}`. */
export type LabelCache = Record<string, Record<string, string>>;

/**
 * The lookups the declared columns ask for.
 *
 * A path whose first segment is not a foreign key of this table cannot be
 * resolved from here: it is said out loud rather than left as an empty column
 * nobody can explain.
 */
export function fkSpecs(
  model: string,
  columnFields: string[],
  tables: Record<string, TableLike>,
  onProblem: (message: string) => void = (m) => console.warn(m),
): FkSpec[] {
  const table = tables[model];
  if (!table?.columns) return [];

  const specs: FkSpec[] = [];
  for (const path of columnFields) {
    const segments = path.split('.');
    if (segments.length === 1) continue;          // a plain column: nothing to resolve

    const [field, ...rest] = segments;
    if (rest.length > 1) {
      onProblem(`Column '${path}' of '${model}': a lookup crosses one key, not a chain`);
      continue;
    }

    const fk = table.columns.find((c) => c.name === field)?.foreign_key;
    if (!fk) {
      onProblem(`Column '${path}' of '${model}': '${field}' is not a foreign key`);
      continue;
    }

    specs.push({
      field,
      key: rest[0],
      target: fk.target,
      targetPk: fk.field || tables[fk.target]?.pk_fields?.[0] || 'id',
      displayField: rest[0],
    });
  }
  return specs;
}

/** The keys present in these rows that the cache cannot answer for yet. */
export function missingKeys(
  rows: Array<Record<string, unknown>>,
  spec: FkSpec,
  cache: LabelCache
): Array<string | number> {
  const known = cache[spec.key] ?? {};
  const wanted = new Set<string | number>();
  for (const row of rows) {
    const key = row[spec.field];
    if (key === null || key === undefined || key === '') continue;
    if (String(key) in known) continue;
    wanted.add(key as string | number);
  }
  return [...wanted];
}

/**
 * The rows as the grid should show them: the labels added beside the keys.
 *
 * Added, never substituted — a column that asked for the key keeps it, and a row
 * declaring both shows both. A label that has not arrived leaves its cell empty:
 * that cell holds a name, and a key put there in its place would read as one.
 */
export function withLabels(
  rows: Array<Record<string, unknown>>,
  specs: FkSpec[],
  cache: LabelCache
): Array<Record<string, unknown>> {
  if (specs.length === 0) return rows;

  return rows.map((row) => {
    const shown = { ...row };
    for (const spec of specs) {
      const key = row[spec.field];
      if (key === null || key === undefined || key === '') continue;
      const label = cache[spec.key]?.[String(key)];
      if (label !== undefined) shown[spec.key] = label;
    }
    return shown;
  });
}
