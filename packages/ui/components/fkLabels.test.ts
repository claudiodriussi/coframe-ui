import { describe, it, expect } from 'vitest';
import { fkSpecs, missingKeys, withLabels, type LabelCache } from './fkLabels';

const tables = {
  BookAuthor: {
    pk_fields: ['id'],
    columns: [
      { name: 'id' },
      { name: 'book_id', foreign_key: { target: 'Book', field: 'id' } },
      { name: 'author_id', foreign_key: { target: 'Author', field: 'id' } },
      { name: 'notes' },
    ],
  },
  Author: { pk_fields: ['id'], display_field: 'full_name', columns: [] },
  Book: { pk_fields: ['id'], columns: [] },
};

const quiet = () => {};
const spec = fkSpecs('BookAuthor', ['author_id.full_name'], tables, quiet)[0];

describe('what a column asks for', () => {
  it('reads the path from the key to the field to show', () => {
    expect(spec).toEqual({
      field: 'author_id',
      key: 'full_name',
      target: 'Author',
      targetPk: 'id',
      displayField: 'full_name',
    });
  });

  it('asks nothing for a bare column — the key is a value, not a question', () => {
    expect(fkSpecs('BookAuthor', ['author_id', 'notes'], tables, quiet)).toEqual([]);
  });

  it('resolves the key and shows the name when both are declared', () => {
    expect(fkSpecs('BookAuthor', ['author_id', 'author_id.full_name'], tables, quiet))
      .toHaveLength(1);
  });

  it('says so when the path does not start at a foreign key', () => {
    const said: string[] = [];
    expect(fkSpecs('BookAuthor', ['notes.whatever'], tables, (m) => said.push(m))).toEqual([]);
    expect(said[0]).toContain('notes');
  });

  it('says so when the path is a chain', () => {
    const said: string[] = [];
    expect(fkSpecs('BookAuthor', ['author_id.publisher.name'], tables, (m) => said.push(m)))
      .toEqual([]);
    expect(said[0]).toContain('chain');
  });

  it('says nothing about a table it does not know yet', () => {
    expect(fkSpecs('BookAuthor', ['author_id.full_name'], {}, quiet)).toEqual([]);
  });
});

describe('what still has to be asked', () => {
  it('asks once for a key that repeats', () => {
    const rows = [{ author_id: 1 }, { author_id: 1 }, { author_id: 4 }];
    expect(missingKeys(rows, spec, {})).toEqual([1, 4]);
  });

  it('asks only for what the cache cannot answer', () => {
    const cache: LabelCache = { full_name: { '1': 'George Orwell' } };
    expect(missingKeys([{ author_id: 1 }, { author_id: 4 }], spec, cache)).toEqual([4]);
  });

  it('does not ask about an empty key', () => {
    expect(missingKeys([{ author_id: null }, { author_id: '' }, {}], spec, {})).toEqual([]);
  });
});

describe('what the grid shows', () => {
  const cache: LabelCache = { full_name: { '1': 'George Orwell' } };

  it('adds the name beside the key, and leaves the key alone', () => {
    expect(withLabels([{ id: 7, author_id: 1, notes: 'first' }], [spec], cache)).toEqual([
      { id: 7, author_id: 1, full_name: 'George Orwell', notes: 'first' },
    ]);
  });

  it('leaves the cell empty until the answer arrives', () => {
    expect(withLabels([{ id: 8, author_id: 4 }], [spec], cache)).toEqual([
      { id: 8, author_id: 4 },
    ]);
  });

  it('leaves the buffer alone — the row it returns is a copy', () => {
    const row = { id: 7, author_id: 1 };
    const shown = withLabels([row], [spec], cache);
    expect(row).toEqual({ id: 7, author_id: 1 });
    expect(shown[0]).not.toBe(row);
  });

  it('hands back the same rows when nothing was asked for', () => {
    const rows = [{ id: 7, notes: 'x' }];
    expect(withLabels(rows, [], cache)).toBe(rows);
  });
});
