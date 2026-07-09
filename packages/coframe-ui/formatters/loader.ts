/**
 * Helper to register formatter modules discovered via import.meta.glob.
 *
 * The glob itself must live in a file under src/ where Vite can reliably
 * resolve the $plugins alias. See src/app-plugins/formatters.ts.
 *
 * Usage (in the file that owns the glob):
 *
 *   import { registerFormatters } from '$coframe/formatters/loader';
 *   registerFormatters(
 *     import.meta.glob('$plugins/** /formatters.ts', { eager: true })
 *   );
 */

import { formatterRegistry, type CellFormatter } from './registry';

export function registerFormatters(
  modules: Record<string, unknown>,
): void {
  for (const mod of Object.values(modules)) {
    const fmts = (mod as { default?: Record<string, CellFormatter> }).default;
    if (!fmts) continue;
    for (const [name, fn] of Object.entries(fmts)) {
      formatterRegistry.register(name, fn);
    }
  }
}
