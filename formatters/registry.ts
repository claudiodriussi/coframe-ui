/**
 * Formatter registry — maps string names to Tabulator cell formatter functions.
 *
 * Resolution order in DataView (for `formatter: name` in column YAML):
 *   1. DATE_FORMATTERS  — built-in coframe: date, datetime, time
 *   2. formatterRegistry — registered by plugins via formatters.ts files
 *   3. raw string       — passed to Tabulator as built-in formatter name
 *                         (e.g. "star", "progress", "tickCross", "color", ...)
 *
 * Shorthand params:
 *   YAML `formatter: name,arg1,arg2` splits on commas.
 *   Built-in Tabulator formatters (star, progress) have schemas in DataView.
 *   Custom formatters can declare their own shorthand parser at registration:
 *     formatterRegistry.register('my_fmt', fn, {
 *       shorthand: ([a, b]) => ({ min: Number(a), max: Number(b) })
 *     });
 */

export type CellFormatter   = (cell: any, params: any, onRendered?: any) => string | HTMLElement;
export type ShorthandParser = (args: string[]) => Record<string, unknown>;

interface FormatterEntry {
  fn:        CellFormatter;
  shorthand?: ShorthandParser;
}

const _registry = new Map<string, FormatterEntry>();

export const formatterRegistry = {
  register(name: string, fn: CellFormatter, opts?: { shorthand?: ShorthandParser }): void {
    _registry.set(name, { fn, shorthand: opts?.shorthand });
  },
  get(name: string): CellFormatter | undefined {
    return _registry.get(name)?.fn;
  },
  getShorthand(name: string): ShorthandParser | undefined {
    return _registry.get(name)?.shorthand;
  },
};
