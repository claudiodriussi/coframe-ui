/**
 * The page a foreign key field picks from ("Search more…").
 *
 * The page is declared (`lookup.page` on the field) or it is the list of the
 * target table, `{table}_list` in lower case like `{model}_form`. There is no
 * `_lookup` naming convention: a dedicated page is named, not guessed.
 */
import type { ViewDescriptor } from './dataview.types';

export function lookupPageId(field: object, table: string): string {
  const lookup = (field as { lookup?: { page?: unknown } }).lookup;
  return typeof lookup?.page === 'string' && lookup.page
    ? lookup.page
    : `${table.toLowerCase()}_list`;
}

/**
 * The list a picker shows, taken from a page descriptor: its table view as
 * written — joins, columns, order, navigator commands — with the navigator in
 * lookup mode. Side panels are not taken: a picker is the list and nothing
 * else. Null when the page holds no table view, so the caller falls back.
 */
export function pickerView(page: unknown): ViewDescriptor | null {
  const content = (page as { content?: Record<string, unknown> } | null)?.content;
  if (!content || content.type !== 'table') return null;
  const navigator = (content.navigator ?? {}) as Record<string, unknown>;
  return { ...content, navigator: { ...navigator, mode: 'lookup' } } as ViewDescriptor;
}
