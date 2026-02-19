/**
 * Generic plugin component loader.
 * Creates a PluginLoader from a component registry map.
 * Each project supplies its own registry in src/app-plugins/registry.ts.
 */

import type { Component } from 'svelte';
import type { PluginComponentMeta, PluginLoader, ComponentLoaderFn } from './types';

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
