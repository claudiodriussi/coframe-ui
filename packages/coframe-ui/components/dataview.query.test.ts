import { describe, it, expect } from 'vitest';
import { buildQuery, mergeDomain, extractFieldKey } from './dataview.query';
import type { RuleRow } from './dataview.rules';
import type { ViewSource } from './dataview.types';

const src = (extra: Partial<ViewSource> = {}): ViewSource =>
  ({ model: 'Partner', ...extra }) as ViewSource;

const rule = (field: string, op: string, value?: unknown): RuleRow =>
  ({ rule: { field, op: op as never, value }, join: 'and' });

describe('sibling groups', () => {
  it('says nothing when the view declares nothing', () => {
    expect(buildQuery(src(), undefined, {}).filters).toBeUndefined();
  });

  it('wraps a lone group so the payload always has the same shape', () => {
    const q = buildQuery(src({ domain: [{ active: true }] }), undefined, {});
    expect(q.filters).toEqual({ conditions: [{ active: true }] });
  });

  it('places domain, view filters and rules side by side', () => {
    const q = buildQuery(
      src({ domain: [{ active: true }], filters: { conditions: [{ kind: 'C' }] } }),
      undefined, {},
      { rules: [rule('city', 'eq', 'Udine')] },
    );
    expect(q.filters).toEqual({
      conditions: [
        [{ active: true }],
        [{ kind: 'C' }],
        [{ city: 'Udine' }],
      ],
    });
  });

  it('keeps an OR node whole instead of spilling its branches', () => {
    // Unwrapping {op: or, conditions} would AND the branches together, which
    // is a different query and a silently narrower one.
    const filters = { op: 'or', conditions: [{ a: 1 }, { b: 2 }] };
    const q = buildQuery(src({ domain: [{ active: true }], filters }), undefined, {});
    expect(q.filters).toEqual({ conditions: [[{ active: true }], [filters]] });
  });

  it('drops rules the user has not finished rather than narrowing to nothing', () => {
    const q = buildQuery(src(), undefined, {}, { rules: [rule('city', 'eq', '')] });
    expect(q.filters).toBeUndefined();
  });

  it('emits the rules as an OR node when there are two blocks', () => {
    const rules: RuleRow[] = [
      rule('city', 'eq', 'Udine'),
      { rule: { field: 'kind', op: 'eq' as never, value: 'C' }, join: 'or' },
    ];
    const q = buildQuery(src(), undefined, {}, { rules });
    expect(q.filters).toEqual({
      conditions: [{ op: 'or', conditions: [[{ city: 'Udine' }], [{ kind: 'C' }]] }],
    });
  });
});

describe('quick search', () => {
  it('travels as a key of its own, never as a condition', () => {
    const q = buildQuery(src({ domain: [{ active: true }] }), undefined, {}, { search: 'rossi' });
    expect(q.search).toBe('rossi');
    expect(q.filters).toEqual({ conditions: [{ active: true }] });
  });

  it('is absent when the box is empty or holds only spaces', () => {
    expect(buildQuery(src(), undefined, {}, { search: '' }).search).toBeUndefined();
    expect(buildQuery(src(), undefined, {}, { search: '   ' }).search).toBeUndefined();
  });

  it('is trimmed, so a stray space is not a different set', () => {
    expect(buildQuery(src(), undefined, {}, { search: '  rossi ' }).search).toBe('rossi');
  });

  it('leaves the rules alone', () => {
    const q = buildQuery(src(), undefined, {}, {
      search: 'rossi',
      rules: [rule('city', 'eq', 'Udine')],
    });
    expect(q.search).toBe('rossi');
    expect(q.filters).toEqual({ conditions: [{ city: 'Udine' }] });
  });
});

describe('trigger variables still apply', () => {
  it('substitutes inside the domain before grouping', () => {
    const q = buildQuery(
      src({ domain: [{ author_id: '$trigger.id' }] }), undefined, { id: 7 },
    );
    expect(q.filters).toEqual({ conditions: [{ author_id: 7 }] });
  });
});

describe('helpers', () => {
  it('reads the field key of a select expression', () => {
    expect(extractFieldKey('CASE WHEN 1 THEN 2 END as display_name')).toBe('display_name');
    expect(extractFieldKey('Author.first_name')).toBe('first_name');
    expect(extractFieldKey('title')).toBe('title');
  });

  it('mergeDomain answers undefined when there is nothing to merge', () => {
    expect(mergeDomain(src(), {})).toBeUndefined();
  });
});
