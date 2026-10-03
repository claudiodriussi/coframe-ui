import { describe, it, expect } from 'vitest';
import { lookupPageId, pickerView } from './lookup';

describe('lookup page', () => {
  it('is the list of the target table by default', () => {
    expect(lookupPageId({}, 'Utente')).toBe('utente_list');
  });

  it('is the page the field declares', () => {
    expect(lookupPageId({ lookup: { page: 'utente_attivi' } }, 'Utente')).toBe('utente_attivi');
  });
});

describe('picker view', () => {
  const page = {
    title: 'Utenti',
    content: {
      type: 'table',
      source: { model: 'Utente', joins: [{ Committente: 'x' }], order_by: ['nome'] },
      columns: [{ field: 'nome' }, { field: 'Committente.nome as committente' }],
      navigator: { commands: [{ id: 'archive', endpoint: 'archivable' }] },
    },
    panels: [{ id: 'detail' }],
  };

  it('keeps the view as written and switches the navigator to lookup', () => {
    const view = pickerView(page)!;
    expect(view.source).toEqual(page.content.source);
    expect(view.columns).toEqual(page.content.columns);
    expect(view.navigator).toEqual({
      commands: [{ id: 'archive', endpoint: 'archivable' }],
      mode: 'lookup',
    });
  });

  it('does not touch the page it was given', () => {
    pickerView(page);
    expect(page.content.navigator).not.toHaveProperty('mode');
  });

  it('is null when there is no table to pick from', () => {
    expect(pickerView(null)).toBeNull();
    expect(pickerView({ content: { type: 'form' } })).toBeNull();
  });
});
