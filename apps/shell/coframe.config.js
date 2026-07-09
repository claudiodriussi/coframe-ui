/**
 * Coframe build-time configuration for the generic `shell` client.
 * Imported by svelte.config.js and vite.config.ts.
 *
 * The shell is project-agnostic: it hosts Chrome + plugin-contributed UI and is
 * selected onto a concrete project by the COFRAME_APP env var, which picks the
 * backend plugins directory (coframe/<COFRAME_APP>/plugins). Runtime knobs
 * (API base, dev port) live in .env.* files.
 *
 * COFRAME_APP defaults to 'artmob' (the first project) so `pnpm install`'s
 * svelte-kit sync resolves without extra env. Override to target another project:
 *   COFRAME_APP=<project> pnpm --filter shell dev
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = process.env.COFRAME_APP || 'artmob';

export default {
  // Which project this shell instance is bound to (backend app-instance name).
  app,
  // Path to that project's backend plugin components directory.
  // Plugin .svelte files live here alongside their Python/YAML counterparts.
  pluginsDir: resolve(__dirname, `../../../../coframe/${app}/plugins`)
};
