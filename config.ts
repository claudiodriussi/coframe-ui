/**
 * Runtime configuration - reads VITE_* environment variables.
 * Values are set in .env.development / .env.production.
 * See .env.example for documentation of available variables.
 */

const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';
const apiPrefix = import.meta.env.VITE_API_PREFIX ?? 'coframe';

export const config = {
  api: {
    // Base URL of the backend (empty = same origin in production)
    baseUrl: apiBase,
    // Route prefix matching backend config.yaml → api.prefix
    prefix: apiPrefix,
    // Full API root: used by the axios client
    get root(): string {
      return apiBase ? `${apiBase}/${apiPrefix}` : `/${apiPrefix}`;
    }
  }
} as const;
