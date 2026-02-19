/**
 * Coframe build-time configuration.
 * Imported by svelte.config.js and vite.config.ts.
 *
 * When migrating to a different project, only this file needs to change
 * for filesystem paths. Runtime config is in .env.* files.
 */
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  // Path to backend plugin components directory.
  // Plugin .svelte files live here alongside their Python/YAML counterparts.
  pluginsDir: resolve(__dirname, '../../coframe/devtest/plugins')
};
