/**
 * Project-specific plugin registry.
 * Maps plugin component IDs to dynamic imports from $plugins (backend plugin dir).
 *
 * $plugins → coframe/devtest/plugins/  (via svelte.config.js alias)
 */
import { createPluginLoader } from '$coframe/plugins/loader';

export const pluginLoader = createPluginLoader({
  'library.hello': () => import('$plugins/libapp/library/client/HelloWorld.svelte'),
});
