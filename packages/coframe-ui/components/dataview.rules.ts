/**
 * dataview.rules.ts — the user-built WHERE clause.
 *
 * Pure functions: no Svelte state, no side effects. The editor holds a flat list
 * of rows, each bound to the previous one by AND or OR; blocks are *derived* from
 * that list, never built by hand. With the standard precedence — AND binds tighter
 * than OR — a flat list is exactly an OR of AND groups, so the grouping the editor
 * draws is a rendering of the list and nothing else. Depth is two by construction:
 * there is no way to express a parenthesis, and so no way to reach a state the
 * editor cannot draw.
 *
 * The output is a querybuilder condition group, meant to sit beside the view's
 * domain as a sibling — see mergeDomain in dataview.query.ts.
 */

// ── Operators ──────────────────────────────────────────────────────────────
// The operators the user picks are not the ones the querybuilder applies:
// "contains" is an ilike whose wildcards this module supplies, "is empty" carries
// no value at all. Serialisation maps one onto the other.

export type RuleOperator =
  | 'contains' | 'startswith'
  | 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le'
  | 'between' | 'in'
  | 'istrue' | 'isfalse'
  | 'empty' | 'notempty';

/** How many values the operator needs — drives both the widget and completeness. */
export type ValueArity = 'none' | 'one' | 'two' | 'many';

export const OPERATOR_ARITY: Record<RuleOperator, ValueArity> = {
  contains: 'one', startswith: 'one',
  eq: 'one', ne: 'one', gt: 'one', ge: 'one', lt: 'one', le: 'one',
  between: 'two', in: 'many',
  istrue: 'none', isfalse: 'none',
  empty: 'none', notempty: 'none',
};

/**
 * Operators offered per primitive type. A schema type may override this list
 * (an interval, a delimited set): the base map answers for the primitives, which
 * are not an application decision.
 *
 * Foreign keys are identity only — there is deliberately no "contains" on an FK,
 * because a display may be a concatenation (code + description, primary key
 * included) and the predicate would then depend on presentation settings. The
 * well-defined form is a path to a named column of the target, which belongs to
 * the relational step.
 */
export const OPERATORS_BY_PRIMITIVE: Record<string, RuleOperator[]> = {
  string: ['contains', 'startswith', 'eq', 'ne', 'in', 'empty', 'notempty'],
  number: ['eq', 'ne', 'gt', 'ge', 'lt', 'le', 'between', 'in', 'empty', 'notempty'],
  date: ['eq', 'lt', 'gt', 'between', 'empty', 'notempty'],
  datetime: ['eq', 'lt', 'gt', 'between', 'empty', 'notempty'],
  boolean: ['istrue', 'isfalse'],
  fk: ['eq', 'in', 'empty', 'notempty'],
};

export function operatorsFor(primitive: string, override?: RuleOperator[]): RuleOperator[] {
  return override ?? OPERATORS_BY_PRIMITIVE[primitive] ?? OPERATORS_BY_PRIMITIVE.string;
}

// ── Model ──────────────────────────────────────────────────────────────────

export interface Rule {
  /** Column name, or a declared path once relational steps land. */
  field: string;
  op: RuleOperator;
  /** Scalar for one, [lo, hi] for two, array for many. Absent when arity is none. */
  value?: unknown;
  /**
   * Display labels for values that are records, kept beside the ids they belong
   * to. Presentation only: never serialised, never sent. The lookup hands them
   * over at the moment of choosing, so they cost nothing; a rule arriving from
   * outside the session (declared in YAML, or reloaded from a saved query) has
   * none, and shows its ids until the picker is reopened.
   */
  labels?: string[];
}

/** `join` binds the row to the one above it; it is ignored on the first row. */
export interface RuleRow {
  rule: Rule;
  join: 'and' | 'or';
}

/** Conditions in AND. */
export type Block = Rule[];

/** Blocks in OR — disjunctive normal form, depth two by construction. */
export type RuleSet = Block[];

// ── Flat list ↔ blocks ─────────────────────────────────────────────────────

/** Split the edited list into blocks: every row joined by OR opens a new one. */
export function toBlocks(rows: RuleRow[]): RuleSet {
  const blocks: RuleSet = [];
  rows.forEach((row, i) => {
    if (i === 0 || row.join === 'or') blocks.push([]);
    blocks[blocks.length - 1].push(row.rule);
  });
  return blocks;
}

/** Flatten blocks back into the edited list. Inverse of toBlocks. */
export function toRows(blocks: RuleSet): RuleRow[] {
  const rows: RuleRow[] = [];
  blocks.forEach((block, b) => {
    block.forEach((rule, i) => {
      rows.push({ rule, join: i === 0 && b > 0 ? 'or' : 'and' });
    });
  });
  return rows;
}

/**
 * Duplicate a block and append it as a new alternative. This is what makes the
 * normal form bearable: expressing `A AND (B OR C)` means repeating A, and
 * repeating it must be one click rather than retyping.
 */
export function duplicateBlock(blocks: RuleSet, index: number): RuleSet {
  const source = blocks[index];
  if (!source) return blocks;
  return [...blocks, source.map(r => ({ ...r }))];
}

// ── Completeness ───────────────────────────────────────────────────────────

/**
 * A rule the user has not finished is not a rule. Emitting it would silently
 * narrow the set — an empty text compared for equality matches nothing.
 */
export function isComplete(rule: Rule): boolean {
  const arity = OPERATOR_ARITY[rule.op];
  if (arity === undefined) return false;
  if (!rule.field) return false;

  switch (arity) {
    case 'none':
      return true;
    case 'two':
      return Array.isArray(rule.value) && rule.value.length === 2
        && rule.value.every(hasValue);
    case 'many':
      return Array.isArray(rule.value) && rule.value.length > 0;
    default:
      return hasValue(rule.value);
  }
}

function hasValue(v: unknown): boolean {
  return v !== undefined && v !== null && v !== '';
}

// ── Serialisation ──────────────────────────────────────────────────────────

function escapeLike(v: unknown): string {
  return String(v).replace(/([%_\\])/g, '\\$1');
}

/**
 * One rule as a querybuilder concise condition: `{field: value}` for equality,
 * `{field: [op, ...values]}` otherwise. The querybuilder applies ilike patterns
 * verbatim, so the wildcards are added here.
 */
export function serializeRule(rule: Rule): Record<string, unknown> {
  const f = rule.field;
  switch (rule.op) {
    case 'eq':         return { [f]: rule.value };
    case 'istrue':     return { [f]: true };
    case 'isfalse':    return { [f]: false };
    case 'contains':   return { [f]: ['ilike', `%${escapeLike(rule.value)}%`] };
    case 'startswith': return { [f]: ['ilike', `${escapeLike(rule.value)}%`] };
    case 'empty':      return { [f]: ['isnull'] };
    case 'notempty':   return { [f]: ['isnotnull'] };
    case 'between':    return { [f]: ['between', ...(rule.value as unknown[])] };
    case 'in':         return { [f]: ['in', rule.value] };
    default:           return { [f]: [rule.op, rule.value] };
  }
}

/**
 * The whole rule set as the contents of one condition group, ready to be placed
 * beside the domain. A single block stays a flat AND list; two or more become an
 * `or` node whose branches are those lists.
 *
 * Incomplete rules and the blocks left empty by dropping them never reach the
 * query: an empty block would otherwise widen the set to everything.
 * Returns undefined when nothing is left, so the caller can omit the slot.
 */
export function serializeRuleSet(blocks: RuleSet): unknown[] | undefined {
  const groups = blocks
    .map(block => block.filter(isComplete).map(serializeRule))
    .filter(group => group.length > 0);

  if (groups.length === 0) return undefined;
  if (groups.length === 1) return groups[0];
  return [{ op: 'or', conditions: groups }];
}
