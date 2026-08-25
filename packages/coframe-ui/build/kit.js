/**
 * Shared SvelteKit configuration for every Coframe client.
 *
 * SPA mode (static adapter, fallback to index.html) and the aliases:
 *   $coframe      this library, consumed from source
 *   $app-plugins  the client's own registry and formatters
 *   $plugins0…N   the backend plugin roots, in the order config.yaml declares
 *                 them; the globs over them are emitted by plugin-globs.js
 *
 * There is deliberately no plain `$plugins`: with several roots it would have
 * to pick one, and which one is "the app's own" is not something to guess.
 */
import adapter from '@sveltejs/adapter-static';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = resolve(__dirname, '..');

/** @param {import('../../../apps.config.js').ResolvedApp} app  from resolveApp() */
export function coframeKit(app) {
  /** @type {Record<string, string>} */
  const alias = {
    $coframe: UI_ROOT,
    '$app-plugins': resolve('src/app-plugins')
  };
  app.pluginRoots.forEach((root, i) => {
    alias[`$plugins${i}`] = root;
  });

  return {
    kit: {
      adapter: adapter({
        fallback: 'index.html' // SPA mode: unknown routes → index.html
      }),
      alias
    }
  };
}
