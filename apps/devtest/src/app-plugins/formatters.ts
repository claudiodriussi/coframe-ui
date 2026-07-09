/**
 * Auto-discovers and registers all plugin formatter modules.
 *
 * The glob runs here (under src/) so that Vite can reliably resolve
 * the $plugins alias. Import this module once at app startup.
 */

import { registerFormatters } from '$coframe/formatters/loader';

registerFormatters(
  import.meta.glob('$plugins/**/formatters.ts', { eager: true }),
);
