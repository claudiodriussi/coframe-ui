import { getContext, setContext } from 'svelte';
import type { PluginLoader } from './types';

const KEY = Symbol('pluginLoader');

export const setPluginLoader = (loader: PluginLoader) => setContext(KEY, loader);
export const getPluginLoader = (): PluginLoader | undefined => getContext(KEY);
