/**
 * Generic plugin component loader.
 * Creates a PluginLoader from a component registry map or an import.meta.glob result.
 * Each project supplies its own registry in src/app-plugins/registry.ts.
 */

import type { Component } from 'svelte';
import type { PluginComponentMeta, PluginLoader, ComponentLoaderFn } from './types';

/**
 * Derive a component ID from a glob path.
 *
 * Convention: `.../plugin_name[/client]/ComponentName.svelte`
 *             → `plugin_name.componentname`
 *
 * The `client/` segment is optional — components can live directly in the
 * plugin folder or in any subfolder named `client/`.
 *
 * @example
 * pathToComponentId('/abs/libapp/library/client/Hello.svelte') // → 'library.hello'
 * pathToComponentId('/abs/libapp/library/Hello.svelte')        // → 'library.hello'
 */
function pathToComponentId(path: string): string {
  // Normalise away any intermediate /client/ segment, then match plugin + name.
  const normalized = path.replace(/\/client\//g, '/');
  const m = normalized.match(/([^/]+)\/([^/]+)\.svelte$/i);
  if (!m) return '';
  return `${m[1]}.${m[2].toLowerCase()}`;
}

/**
 * Build a PluginLoader from an `import.meta.glob` result.
 *
 * The glob must target all `client/*.svelte` files under $plugins (lazy).
 * IDs are auto-derived: `plugin_name/client/Name.svelte` → `plugin_name.name`
 */
export function createPluginLoaderFromGlob(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  modules: Record<string, () => Promise<any>>,
): PluginLoader {
  const components: Record<string, ComponentLoaderFn> = {};
  for (const [path, loader] of Object.entries(modules)) {
    const id = pathToComponentId(path);
    if (id) components[id] = loader;
  }
  return createPluginLoader(components);
}

/**
 * @example
 * const loader = createPluginLoader({
 *   'library.hello': () => import('$plugins/libapp/library/client/HelloWorld.svelte'),
 * });
 * const Hello = await loader.loadComponent('library.hello');
 */
export function createPluginLoader(components: Record<string, ComponentLoaderFn>): PluginLoader {
  // Build metadata from IDs: 'library.hello' → { plugin: 'library', name: 'hello' }
  const metadata: PluginComponentMeta[] = Object.keys(components).map((id) => {
    const [plugin, ...nameParts] = id.split('.');
    return { id, plugin, name: nameParts.join('.') };
  });

  return {
    async loadComponent(id: string): Promise<Component | null> {
      const loader = components[id];
      if (!loader) {
        console.warn(`[PluginLoader] Component not found: ${id}`);
        return null;
      }
      try {
        const mod = await loader();
        return mod.default as Component;
      } catch (err) {
        console.error(`[PluginLoader] Failed to load ${id}:`, err);
        return null;
      }
    },

    getAvailableComponents(): PluginComponentMeta[] {
      return metadata;
    },

    hasComponent(id: string): boolean {
      return id in components;
    }
  };
}
