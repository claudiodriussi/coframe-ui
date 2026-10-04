import { describe, it, expect } from 'vitest';
import {
  newAggregate, loadedAggregate, addRow, removeRow, setValues, serialize,
  liveRows, rowsOf, isDirty, cloneNode, collectionNodes,
  type TreeNode,
} from './aggregate';

/** What `load_tree` hands back: real ids, no `op` anywhere. */
const loaded = (): TreeNode => ({
  id: 7,
  values: { title: '1984', isbn: '0-452-28423-4' },
  children: {
    authors: [
      { id: 42, values: { author_id: 3, notes: 'first' }, children: {} },
      { id: 43, values: { author_id: 4, notes: null }, children: {} },
    ],
  },
});

describe('what travels, and what stays home', () => {
  it('sends the root alone when nothing was touched', () => {
    const agg = loadedAggregate('book_form', loaded());
    const { root } = serialize(agg);

    // The root always carries the touch the lock will want; the untouched rows
    // below it are pruned rather than re-sent as updates.
    expect(root).toEqual({ op: 'update', id: 7, values: {}, children: {} });
  });

  it('sends only the keys the user changed', () => {
    const agg = loadedAggregate('book_form', loaded());
    setValues(agg.root, { title: 'Nineteen Eighty-Four', isbn: '0-452-28423-4' });

    expect(serialize(agg).root.values).toEqual({ title: 'Nineteen Eighty-Four' });
  });

  it('does not mistake a reloaded null for a change', () => {
    const agg = loadedAggregate('book_form', loaded());
    const row = rowsOf(agg.root, 'authors')[1];

    expect(setValues(row, { notes: undefined })).toBe(false);
    expect(row.op).toBeUndefined();
  });

  it('carries a new row whole, without the parent key', () => {
    const agg = loadedAggregate('book_form', loaded());
    addRow(agg, agg.root, 'authors', { author_id: 9 });

    const { root } = serialize(agg);
    expect(root.children.authors).toEqual([
      { op: 'create', id: -1, values: { author_id: 9 }, children: {} },
    ]);
  });

  it('drops a row that was created and then removed', () => {
    const agg = loadedAggregate('book_form', loaded());
    const row = addRow(agg, agg.root, 'authors', { author_id: 9 });
    removeRow(agg.root, 'authors', row.id);

    expect(serialize(agg).root.children).toEqual({});
    expect(liveRows(agg.root, 'authors')).toHaveLength(2);
  });

  it('reads a collection that does not exist without creating it', () => {
    // A count beside a button label reads the buffer while rendering, and
    // Svelte refuses a write inside a derived: on a new record, where nothing
    // has been added yet, creating the key on read blanked the whole form.
    const agg = newAggregate('book_form');

    expect(liveRows(agg.root, 'authors')).toEqual([]);
    expect(agg.root.children).toEqual({});
  });

  it('keeps a saved row in the buffer, wearing its deletion', () => {
    const agg = loadedAggregate('book_form', loaded());
    removeRow(agg.root, 'authors', 42);

    expect(rowsOf(agg.root, 'authors')).toHaveLength(2);
    expect(liveRows(agg.root, 'authors').map((r) => r.id)).toEqual([43]);
    expect(serialize(agg).root.children.authors).toEqual([
      { op: 'delete', id: 42, values: {}, children: {} },
    ]);
  });

  it('sends a deleted row alone — its parts go with it', () => {
    const agg = loadedAggregate('book_form', {
      id: 7, values: {}, children: {
        chapters: [{
          id: 1, values: {}, children: { notes: [{ id: 5, values: {}, children: {} }] },
        }],
      },
    });
    setValues(rowsOf(rowsOf(agg.root, 'chapters')[0], 'notes')[0], { text: 'edited' });
    removeRow(agg.root, 'chapters', 1);

    expect(serialize(agg).root.children.chapters).toEqual([
      { op: 'delete', id: 1, values: {}, children: {} },
    ]);
  });
});

describe('the rows that are only on the way', () => {
  it('carries an untouched ancestor with no op', () => {
    const agg = loadedAggregate('book_form', {
      id: 7, values: {}, children: {
        chapters: [{
          id: 1, values: { title: 'Arrakis' },
          children: { notes: [{ id: 5, values: { text: 'spice' }, children: {} }] },
        }],
      },
    });
    setValues(rowsOf(rowsOf(agg.root, 'chapters')[0], 'notes')[0], { text: 'melange' });

    const chapter = serialize(agg).root.children.chapters[0];
    expect(chapter.op).toBeUndefined();
    expect(chapter.id).toBe(1);
    expect(chapter.values).toEqual({});          // nothing is written on the way
    expect(chapter.children.notes).toEqual([
      { op: 'update', id: 5, values: { text: 'melange' }, children: {} },
    ]);
  });

  it('prunes a branch where nothing at all happened', () => {
    const agg = loadedAggregate('book_form', {
      id: 7, values: {}, children: {
        chapters: [
          { id: 1, values: {}, children: { notes: [{ id: 5, values: {}, children: {} }] } },
          { id: 2, values: {}, children: {} },
        ],
      },
    });
    setValues(rowsOf(agg.root, 'chapters')[1], { title: 'Caladan' });

    expect(serialize(agg).root.children.chapters).toEqual([
      { op: 'update', id: 2, values: { title: 'Caladan' }, children: {} },
    ]);
  });
});

describe('temporary ids', () => {
  it('allocates from one counter for the whole tree', () => {
    const agg = loadedAggregate('book_form', loaded());
    const chapter = addRow(agg, agg.root, 'chapters', {});
    const note = addRow(agg, chapter, 'notes', {});
    const author = addRow(agg, agg.root, 'authors', {});

    expect([chapter.id, note.id, author.id]).toEqual([-1, -2, -3]);
  });

  it('starts a new record at -1 and keeps counting past it', () => {
    const agg = newAggregate('book_form', { title: 'Dune' });
    expect(agg.root).toMatchObject({ op: 'create', id: -1, values: { title: 'Dune' } });
    expect(addRow(agg, agg.root, 'authors', {}).id).toBe(-2);
  });

  it('writes a whole new tree in one call', () => {
    const agg = newAggregate('book_form', { title: 'Dune' });
    addRow(agg, agg.root, 'authors', { author_id: 9 });

    expect(serialize(agg)).toEqual({
      page: 'book_form',
      root: {
        op: 'create', id: -1, values: { title: 'Dune' },
        children: { authors: [{ op: 'create', id: -2, values: { author_id: 9 }, children: {} }] },
      },
    });
  });
});

describe('dirty and copies', () => {
  it('rises from any depth', () => {
    const agg = loadedAggregate('book_form', loaded());
    expect(isDirty(agg.root)).toBe(false);

    setValues(rowsOf(agg.root, 'authors')[0], { notes: 'second' });
    expect(isDirty(agg.root)).toBe(true);
  });

  it('leaves the buffer alone until a copy is handed back', () => {
    const agg = loadedAggregate('book_form', loaded());
    const copy = cloneNode(rowsOf(agg.root, 'authors')[0]);
    setValues(copy, { notes: 'edited elsewhere' });

    expect(rowsOf(agg.root, 'authors')[0].values.notes).toBe('first');
    expect(isDirty(agg.root)).toBe(false);
  });
});

describe('finding the collections a form declares', () => {
  it('reads them wherever the layout puts them', () => {
    const layout = [
      { type: 'section', columns: [{ fields: [{ name: 'title' }] }] },
      { type: 'collection', id: 'authors', model: 'BookAuthor', fk: 'book_id' },
      {
        type: 'tabs',
        pages: [{ label: 'More', layout: [
          { type: 'collection', id: 'reviews', model: 'Review', fk: 'book_id' },
        ] }],
      },
    ];

    expect(collectionNodes(layout).map((c) => c.id)).toEqual(['authors', 'reviews']);
  });

  it('does not look inside a node — a nested collection is declared in the row form', () => {
    const layout = [{
      type: 'collection', id: 'chapters', model: 'Chapter', fk: 'book_id',
      view: { type: 'table', layout: [{ type: 'collection', id: 'smuggled', model: 'User', fk: 'x' }] },
    }];

    expect(collectionNodes(layout).map((c) => c.id)).toEqual(['chapters']);
  });
});
