// Build-time modules, with no file on disk.
// `virtual:kitebase/plugins` carries one glob per backend plugin root; it is
// emitted by packages/ui/build/plugin-globs.js.
declare module 'virtual:kitebase/plugins' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const pluginGlobs: Record<string, () => Promise<any>>;
  export const formatterGlobs: Record<string, unknown>;
}
