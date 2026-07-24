/**
 * Coframe build-time configuration for the generic `shell` client.
 * Imported by svelte.config.js and vite.config.ts.
 *
 * The shell is project-agnostic: it hosts Chrome + plugin-contributed UI and is
 * selected onto a concrete project by the COFRAME_APP env var, which picks the
 * backend plugins directory. Runtime knobs (API base, dev port) live in .env.* files.
 *
 * COFRAME_APP defaults to 'devtest' — the demonstration bed where Chrome is
 * validated before real app-instances (artmob, currently on standby) inherit it.
 * Override to target another project:
 *   COFRAME_APP=<project> pnpm --filter shell dev
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = process.env.COFRAME_APP || 'devtest';

// devtest lives in its own root (coframe/devtest/), separate from real
// app-instances which live under coframe/apps/<app>/ (git-excluded).
const pluginsDir = app === 'devtest'
  ? resolve(__dirname, '../../../../coframe/devtest/plugins')
  : resolve(__dirname, `../../../../coframe/apps/${app}/plugins`);

export default {
  // Which project this shell instance is bound to (backend app-instance name).
  app,
  // Path to that project's backend plugin components directory.
  // Plugin .svelte files sit alongside their Python/YAML counterparts.
  pluginsDir
};
