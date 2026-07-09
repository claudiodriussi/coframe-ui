import { serverConfig } from '$coframe/api/serverConfig.svelte';

const _translations: Record<string, Record<string, string>> = {};

export function registerTranslations(locale: string, dict: Record<string, string>): void {
  _translations[locale] = { ...(_translations[locale] ?? {}), ...dict };
}

// Lazy locale-module loaders keyed by path (e.g. './it.ts'). The glob is relative
// to this file, so it survives coframe-ui being relocated or packaged — callers no
// longer need a fragile relative import into coframe-ui's internals.
const _localeLoaders = import.meta.glob('./*.ts') as Record<string, () => Promise<unknown>>;

/** Lazily load & register a locale's translations (side-effect import). No-op for 'en'/unknown. */
export async function loadLocale(locale: string): Promise<void> {
  if (!locale || locale === 'en') return;
  const loader = _localeLoaders[`./${locale}.ts`];
  if (!loader) return;
  try {
    await loader();
  } catch (_) {
    /* locale file missing or failed to load — keep English fallback */
  }
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
