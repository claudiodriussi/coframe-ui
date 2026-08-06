/**
 * Plugin component registry.
 * Auto-discovers every Svelte component under the app's plugin roots.
 *
 * ID convention: plugin_name[/client]/Name.svelte → plugin_name.name
 * e.g. library/client/Hello.svelte → library.hello
 *      library/Hello.svelte        → library.hello
 *
 * The globs are emitted per root by the build (virtual:coframe/plugins), so a
 * root added to the backend config.yaml shows up here with no edit.
 */
import { createPluginLoaderFromGlob } from '$coframe/plugins/loader';
import { pluginGlobs } from 'virtual:coframe/plugins';

export const pluginLoader = createPluginLoaderFromGlob(pluginGlobs);
