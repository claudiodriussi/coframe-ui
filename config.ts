interface CoframeApiConfig {
  baseUrl: string;
  prefix: string;
  endpointPrefix: string;
}

interface CoframeConfig {
  api: CoframeApiConfig;
}

let _config: CoframeConfig = {
  api: {
    baseUrl:        import.meta.env.VITE_API_BASE_URL        ?? '',
    prefix:         import.meta.env.VITE_API_PREFIX          ?? 'coframe',
    endpointPrefix: import.meta.env.VITE_API_ENDPOINT_PREFIX ?? 'endpoint',
  }
};

export const initCoframe = (cfg: { api?: Partial<CoframeApiConfig> }) => {
  if (cfg.api) _config = { ..._config, api: { ..._config.api, ...cfg.api } };
};

export const getConfig = (): CoframeConfig => _config;

// Backwards-compatible accessor for internal lib use
export const config = {
  get api() {
    return {
      ..._config.api,
      get root(): string {
        const { baseUrl, prefix } = _config.api;
        return baseUrl ? `${baseUrl}/${prefix}` : `/${prefix}`;
      }
    };
  }
};
