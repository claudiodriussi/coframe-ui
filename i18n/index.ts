import { serverConfig } from '$coframe/api/serverConfig.svelte';

const _translations: Record<string, Record<string, string>> = {};

export function registerTranslations(locale: string, dict: Record<string, string>): void {
  _translations[locale] = { ...(_translations[locale] ?? {}), ...dict };
}

/** Translate a fixed string. Falls back to the English key if no translation found. */
export function _(key: string): string {
  const locale = serverConfig.config?.locale ?? 'en';
  if (!locale || locale === 'en') return key;
  return _translations[locale]?.[key] ?? key;
}

/** Translate a string with {var} placeholders. */
export function _t(key: string, vars: Record<string, unknown>): string {
  return _(key).replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}
