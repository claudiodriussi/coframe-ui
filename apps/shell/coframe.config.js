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

// Projects that ship with the workspace have their own root; real app-instances
// live under coframe/apps/<app>/ (git-excluded) and follow the convention.
/** @type {Record<string, string>} */
const WORKSPACE_ROOTS = {
  devtest: '../../../../coframe/devtest/plugins',
  demo: '../../../../commons/demo/plugins'
};

const pluginsDir = resolve(
  __dirname,
  WORKSPACE_ROOTS[app] ?? `../../../../coframe/apps/${app}/plugins`
);

export default {
  // Which project this shell instance is bound to (backend app-instance name).
  app,
  // Path to that project's backend plugin components directory.
  // Plugin .svelte files sit alongside their Python/YAML counterparts.
  pluginsDir
};
