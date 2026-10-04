interface KitebaseApiConfig {
  baseUrl: string;
  prefix: string;
  endpointPrefix: string;
  // The backend's address for the host's own pages (client.login/logout): set
  // in dev only, where the client runs on Vite's port; '' in a build.
  hostOrigin: string;
}

export interface KitebaseFormDefaults {
  toolbar_position: 'top' | 'bottom';
  button_align: 'left' | 'right';
  button_style: 'label' | 'icon' | 'icon-label';
}

interface KitebaseConfig {
  api: KitebaseApiConfig;
  form: KitebaseFormDefaults;
}

let _config: KitebaseConfig = {
  api: {
    baseUrl:        import.meta.env.VITE_API_BASE_URL        ?? '',
    prefix:         import.meta.env.VITE_API_PREFIX          ?? 'kitebase',
    endpointPrefix: import.meta.env.VITE_API_ENDPOINT_PREFIX ?? 'endpoint',
    hostOrigin:     import.meta.env.VITE_HOST_ORIGIN         ?? '',
  },
  form: {
    toolbar_position: 'top',
    button_align: 'left',
    button_style: 'icon',
  },
};

export const initKitebase = (cfg: { api?: Partial<KitebaseApiConfig>; form?: Partial<KitebaseFormDefaults> }) => {
  if (cfg.api)  _config = { ..._config, api:  { ..._config.api,  ...cfg.api  } };
  if (cfg.form) _config = { ..._config, form: { ..._config.form, ...cfg.form } };
};

export const getConfig = (): KitebaseConfig => _config;

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
