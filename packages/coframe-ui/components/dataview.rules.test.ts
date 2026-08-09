import { describe, it, expect } from 'vitest';
import {
  toBlocks, toRows, duplicateBlock, isComplete,
  serializeRule, serializeRuleSet, operatorsFor,
  type Rule, type RuleRow,
} from './dataview.rules';

const r = (field: string, op: Rule['op'], value?: unknown): Rule => ({ field, op, value });
const row = (rule: Rule, join: RuleRow['join'] = 'and'): RuleRow => ({ rule, join });

describe('flat list ↔ blocks', () => {
  it('keeps a single block when every row is joined by AND', () => {
    const rows = [row(r('a', 'eq', 1)), row(r('b', 'eq', 2))];
    expect(toBlocks(rows)).toEqual([[r('a', 'eq', 1), r('b', 'eq', 2)]]);
  });

  it('opens a new block on every OR', () => {
    const rows = [
      row(r('a', 'eq', 1)),
      row(r('b', 'eq', 2)),
      row(r('c', 'eq', 3), 'or'),
    ];
    expect(toBlocks(rows)).toEqual([
      [r('a', 'eq', 1), r('b', 'eq', 2)],
      [r('c', 'eq', 3)],
    ]);
  });

  it('ignores the join of the first row', () => {
    expect(toBlocks([row(r('a', 'eq', 1), 'or')])).toEqual([[r('a', 'eq', 1)]]);
  });

  it('round-trips through toRows', () => {
    const rows = [
      row(r('a', 'eq', 1)),
      row(r('b', 'eq', 2)),
      row(r('c', 'eq', 3), 'or'),
      row(r('d', 'eq', 4)),
    ];
    expect(toRows(toBlocks(rows))).toEqual(rows);
  });

  it('has no rows and no blocks when empty', () => {
    expect(toBlocks([])).toEqual([]);
    expect(toRows([])).toEqual([]);
  });
});

describe('duplicateBlock', () => {
  it('appends a copy as a new alternative', () => {
    const blocks = [[r('a', 'eq', 1)]];
    const out = duplicateBlock(blocks, 0);
    expect(out).toHaveLength(2);
    expect(out[1]).toEqual([r('a', 'eq', 1)]);
  });

  it('copies the rules instead of sharing them', () => {
    const blocks = [[r('a', 'eq', 1)]];
    const out = duplicateBlock(blocks, 0);
    (out[1][0] as Rule).value = 99;
    expect(out[0][0].value).toBe(1);
  });

  it('leaves the set alone for an index that is not there', () => {
    const blocks = [[r('a', 'eq', 1)]];
    expect(duplicateBlock(blocks, 5)).toBe(blocks);
  });
});

describe('completeness', () => {
  it('needs no value for the operators that carry none', () => {
    expect(isComplete(r('a', 'empty'))).toBe(true);
    expect(isComplete(r('a', 'notempty'))).toBe(true);
    expect(isComplete(r('a', 'istrue'))).toBe(true);
  });

  it('rejects a missing or blank value', () => {
    expect(isComplete(r('a', 'eq'))).toBe(false);
    expect(isComplete(r('a', 'eq', ''))).toBe(false);
    expect(isComplete(r('a', 'eq', null))).toBe(false);
  });

  it('accepts falsy values that are values', () => {
    expect(isComplete(r('a', 'eq', 0))).toBe(true);
    expect(isComplete(r('a', 'eq', false))).toBe(true);
  });

  it('wants exactly two bounds for between', () => {
    expect(isComplete(r('a', 'between', [1, 10]))).toBe(true);
    expect(isComplete(r('a', 'between', [1]))).toBe(false);
    expect(isComplete(r('a', 'between', [1, null]))).toBe(false);
    expect(isComplete(r('a', 'between', 1))).toBe(false);
  });

  it('wants a non-empty list for in', () => {
    expect(isComplete(r('a', 'in', ['TV', 'UD']))).toBe(true);
    expect(isComplete(r('a', 'in', []))).toBe(false);
    expect(isComplete(r('a', 'in', 'TV'))).toBe(false);
  });

  it('rejects a rule without a field', () => {
    expect(isComplete(r('', 'eq', 1))).toBe(false);
  });
});

describe('serializeRule', () => {
  it('writes equality in the short form', () => {
    expect(serializeRule(r('title', 'eq', 'x'))).toEqual({ title: 'x' });
  });

  it('turns contains and startswith into ilike patterns', () => {
    expect(serializeRule(r('title', 'contains', 'ros'))).toEqual({ title: ['ilike', '%ros%'] });
    expect(serializeRule(r('title', 'startswith', 'ros'))).toEqual({ title: ['ilike', 'ros%'] });
  });

  it('escapes wildcards typed by the user', () => {
    expect(serializeRule(r('title', 'contains', '50%'))).toEqual({ title: ['ilike', '%50\\%%'] });
    expect(serializeRule(r('code', 'startswith', 'a_b'))).toEqual({ code: ['ilike', 'a\\_b%'] });
  });

  it('spreads the two bounds of between', () => {
    expect(serializeRule(r('year', 'between', [2020, 2024])))
      .toEqual({ year: ['between', 2020, 2024] });
  });

  it('passes the list of in as one value', () => {
    expect(serializeRule(r('province', 'in', ['TV', 'UD'])))
      .toEqual({ province: ['in', ['TV', 'UD']] });
  });

  it('drops the value for the null checks', () => {
    expect(serializeRule(r('note', 'empty'))).toEqual({ note: ['isnull'] });
    expect(serializeRule(r('note', 'notempty'))).toEqual({ note: ['isnotnull'] });
  });

  it('resolves the boolean operators to their value', () => {
    expect(serializeRule(r('active', 'istrue'))).toEqual({ active: true });
    expect(serializeRule(r('active', 'isfalse'))).toEqual({ active: false });
  });

  it('writes the comparisons verbatim', () => {
    expect(serializeRule(r('price', 'ge', 100))).toEqual({ price: ['ge', 100] });
  });

  it('never serialises the display labels', () => {
    const rule: Rule = { field: 'method', op: 'in', value: [3, 7], labels: ['Cash', 'Wire'] };
    expect(serializeRule(rule)).toEqual({ method: ['in', [3, 7]] });
  });
});

describe('serializeRuleSet', () => {
  it('gives nothing for an empty set', () => {
    expect(serializeRuleSet([])).toBeUndefined();
    expect(serializeRuleSet([[]])).toBeUndefined();
  });

  it('keeps a single block flat', () => {
    expect(serializeRuleSet([[r('a', 'eq', 1), r('b', 'ge', 2)]]))
      .toEqual([{ a: 1 }, { b: ['ge', 2] }]);
  });

  it('wraps two blocks in an or node', () => {
    expect(serializeRuleSet([[r('a', 'eq', 1)], [r('b', 'eq', 2)]])).toEqual([
      { op: 'or', conditions: [[{ a: 1 }], [{ b: 2 }]] },
    ]);
  });

  it('drops incomplete rules', () => {
    expect(serializeRuleSet([[r('a', 'eq', 1), r('b', 'eq')]]))
      .toEqual([{ a: 1 }]);
  });

  it('drops a block left empty, and unwraps the or when one remains', () => {
    expect(serializeRuleSet([[r('a', 'eq', 1)], [r('b', 'eq')]]))
      .toEqual([{ a: 1 }]);
  });

  it('gives nothing when no rule is complete', () => {
    expect(serializeRuleSet([[r('a', 'eq')], [r('b', 'in', [])]])).toBeUndefined();
  });

  it('builds the payment-method case', () => {
    const blocks = [[
      { field: 'method_id', op: 'in', value: [3, 7], labels: ['Cash', 'Wire'] } as Rule,
      r('amount', 'ge', 1000),
    ]];
    expect(serializeRuleSet(blocks)).toEqual([
      { method_id: ['in', [3, 7]] },
      { amount: ['ge', 1000] },
    ]);
  });
});

describe('operatorsFor', () => {
  it('answers per primitive', () => {
    expect(operatorsFor('boolean')).toEqual(['istrue', 'isfalse']);
    expect(operatorsFor('number')).toContain('between');
  });

  it('keeps foreign keys to identity — no contains on a display', () => {
    expect(operatorsFor('fk')).toEqual(['eq', 'in', 'empty', 'notempty']);
  });

  it('falls back to the string operators for an unknown primitive', () => {
    expect(operatorsFor('nope')).toEqual(operatorsFor('string'));
  });

  it('lets a schema type override the list', () => {
    expect(operatorsFor('string', ['eq'])).toEqual(['eq']);
  });
});
