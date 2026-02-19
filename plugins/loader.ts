// TODO: port from svelte-v1/src/lib/plugins/loader.ts
// Generic plugin loader - creates a PluginLoader from a component registry map

import type { ComponentLoaderFn, PluginComponentMeta, PluginLoader } from './types';

export function createPluginLoader(
  components: Record<string, ComponentLoaderFn>
): PluginLoader {
  // placeholder
  const metadata: PluginComponentMeta[] = [];
  return {
    async loadComponent(_id: string) { return null; },
    getAvailableComponents() { return metadata; },
    hasComponent(_id: string) { return false; }
  };
}
