// Plugin system types

export interface PluginComponentMeta {
  id: string;       // e.g. 'library.hello'
  plugin: string;   // e.g. 'library'
  name: string;     // e.g. 'hello'
}

export type ComponentLoaderFn = () => Promise<{ default: unknown }>;

export interface PluginLoader {
  loadComponent(id: string): Promise<unknown | null>;
  getAvailableComponents(): PluginComponentMeta[];
  hasComponent(id: string): boolean;
}
