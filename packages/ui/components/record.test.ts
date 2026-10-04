import { describe, it, expect } from 'vitest';
import { resolveRecordTokens, rowDefaults } from './record';

const draft = { operatore_id: 100, utente_id: 10, committente_id: null };

describe('$record tokens', () => {
  it('reads the value from the draft', () => {
    expect(resolveRecordTokens({ op: '$record.operatore_id' }, draft)).toEqual({ op: 100 });
  });

  it('leaves literals and other tokens to whoever receives the map', () => {
    expect(resolveRecordTokens({ kind: 'A', day: '$op_date' }, draft))
      .toEqual({ kind: 'A', day: '$op_date' });
  });

  it('answers undefined for a field the draft does not have', () => {
    expect(resolveRecordTokens({ x: '$record.missing' }, draft)).toEqual({ x: undefined });
  });
});

describe('row defaults', () => {
  it('prefills from the parent draft', () => {
    const node = { prefill: { operatore_id: '$record.operatore_id', utente_id: '$record.utente_id' } };
    expect(rowDefaults(node, draft)).toEqual({ operatore_id: 100, utente_id: 10 });
  });

  it('leaves out what the parent has not filled in yet', () => {
    const node = { prefill: { committente_id: '$record.committente_id', x: '$record.missing' } };
    expect(rowDefaults(node, draft)).toEqual({});
  });

  it('lets defaults win: they are the half of the domain the row must satisfy', () => {
    const node = { prefill: { kind: '$record.kind' }, defaults: { kind: 'appendix' } };
    expect(rowDefaults(node, { kind: 'chapter' })).toEqual({ kind: 'appendix' });
  });

  it('is empty when the node says nothing', () => {
    expect(rowDefaults({}, draft)).toEqual({});
  });
});
