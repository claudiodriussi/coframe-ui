/**
 * Vite plugin serving `virtual:coframe/plugins`.
 *
 * Plugin components and formatters live next to their Python/YAML counterparts,
 * under one or more backend plugin roots. `import.meta.glob` only accepts
 * literal patterns, so the globs cannot be built from a runtime list — this
 * module emits them instead, one per root, behind a virtual module:
 *
 *   import { pluginGlobs, formatterGlobs } from 'virtual:coframe/plugins';
 *
 * The roots are exposed to the patterns as the aliases $plugins0…$pluginsN,
 * declared by the Kit config from the same resolved app (see kit.js).
 */
const VIRTUAL_ID = 'virtual:coframe/plugins';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/** @param {import('../../../apps.config.js').ResolvedApp} app */
export function coframePluginGlobs(app) {
  /** @param {string} pattern @param {string} [options] */
  const globs = (pattern, options = '') =>
    app.pluginRoots
      .map((_, i) => `import.meta.glob('$plugins${i}/${pattern}'${options})`)
      .join(',\n  ');

  return {
    name: 'coframe:plugin-globs',

    /** @param {string} id */
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
    },

    /** @param {string} id */
    load(id) {
      if (id !== RESOLVED_ID) return;
      // Object.assign and not a spread: a root nested in another is already
      // dropped upstream, so what collides here is two plugins of the same
      // name in different roots — last root wins, and the loader warns.
      return [
        `export const pluginGlobs = Object.assign({},`,
        `  ${globs('**/*.svelte')}`,
        `);`,
        `export const formatterGlobs = Object.assign({},`,
        `  ${globs('**/formatters.ts', ', { eager: true }')}`,
        `);`
      ].join('\n');
    }
  };
}
