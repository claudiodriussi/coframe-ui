/**
 * Chrome composition types.
 *
 * Model: Chrome -> blueprint (structure) + composition (area -> components).
 * A blueprint exposes anonymous areas (`area1..areaN`); the composition maps
 * each area to the components that fill it, pulled from the component registry.
 */

/** One component instance placed into an area. */
export interface CompItem {
  /** Registry id (e.g. 'logo', 'menu-tree', 'work-area'). */
  component: string;
  /** Props forwarded to the component. */
  props?: Record<string, unknown>;
}

/**
 * A horizontal bar area (header/statusbar): components split into start/center/end.
 * A vertical area (sidebar) is just an ordered `CompItem[]`.
 */
export interface BarContent {
  start?: CompItem[];
  center?: CompItem[];
  end?: CompItem[];
}

export type AreaContent = CompItem[] | BarContent;

export interface Composition {
  /** Blueprint id; falls back to the `blueprint` prop / 'classic'. */
  blueprint?: string;
  /** area id -> content. Omitted areas fall back to the blueprint defaults. */
  areas: Record<string, AreaContent>;
}
