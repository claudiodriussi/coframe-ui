/**
 * @deprecated — import from serverConfig.svelte.ts in new code.
 *
 * Backward-compatibility re-export so existing imports continue to work
 * without changes (playground demo, etc.).
 */
export {
  serverConfig as typeSchema,
  serverConfig,
  resolveWidget,
  BASE_WIDGET_MAP,
} from './serverConfig.svelte';

export type {
  TypeInfo,
  TypeRegistry,
  TypeColumnInfo,
  ServerConfigData,
  DataviewConfig,
} from './serverConfig.svelte';
