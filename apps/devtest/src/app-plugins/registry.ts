/**
 * Project-specific plugin component registry.
 * Auto-discovers all Svelte components under $plugins.
 *
 * ID convention: plugin_name[/client]/Name.svelte → plugin_name.name
 * e.g. library/client/Hello.svelte → library.hello
 *      library/Hello.svelte        → library.hello
 *
 * $plugins → coframe/devtest/plugins/  (via svelte.config.js alias)
 */
import { createPluginLoaderFromGlob } from '$coframe/plugins/loader';

export const pluginLoader = createPluginLoaderFromGlob(
  import.meta.glob('$plugins/**/*.svelte'),
);
