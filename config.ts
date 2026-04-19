interface CoframeApiConfig {
  baseUrl: string;
  prefix: string;
  endpointPrefix: string;
}

export interface CoframeFormDefaults {
  toolbar_position: 'top' | 'bottom';
  button_align: 'left' | 'right';
  button_style: 'label' | 'icon' | 'icon-label';
}

interface CoframeConfig {
  api: CoframeApiConfig;
  form: CoframeFormDefaults;
}

let _config: CoframeConfig = {
  api: {
    baseUrl:        import.meta.env.VITE_API_BASE_URL        ?? '',
    prefix:         import.meta.env.VITE_API_PREFIX          ?? 'coframe',
    endpointPrefix: import.meta.env.VITE_API_ENDPOINT_PREFIX ?? 'endpoint',
  },
  form: {
    toolbar_position: 'top',
    button_align: 'left',
    button_style: 'icon',
  },
};

export const initCoframe = (cfg: { api?: Partial<CoframeApiConfig>; form?: Partial<CoframeFormDefaults> }) => {
  if (cfg.api)  _config = { ..._config, api:  { ..._config.api,  ...cfg.api  } };
  if (cfg.form) _config = { ..._config, form: { ..._config.form, ...cfg.form } };
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
