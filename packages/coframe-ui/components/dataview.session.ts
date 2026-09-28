/**
 * What a view remembers across an accidental reload — and nothing more.
 *
 * sessionStorage, not localStorage: it survives F5 and belongs to one window,
 * so two windows on the same table do not write over each other, and a closed
 * window leaves nothing behind for the next person at the desk.
 *
 * Only the view the user was working on comes back, and only once: the first
 * view that mounts after a reload restores itself if it is that view, and every
 * later opening — from the menu, from another list — starts from its descriptor.
 * A list that remembered its filters every time it was opened would show a set
 * nobody asked for.
 */

const PREFIX = 'dataview.';
const LAST = 'dataview.__last';

const isReload = (() => {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    return nav?.type === 'reload';
  } catch { return false; }
})();

// The reload is a fact of the document, true for as long as the page lives:
// reading it again at every mount is what made every list restore itself.
let reloadConsumed = !isReload;

// The state used to live in localStorage, shared by every window and never
// expiring. Dropped once, so an old entry cannot come back through any path.
try {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k?.startsWith(PREFIX)) localStorage.removeItem(k);
  }
} catch { /* storage unavailable: nothing to clean */ }

/** The saved state of `key`, if this is the first view after a reload and the last one used. */
export function takeRestorable<T>(key: string): T | null {
  if (reloadConsumed) return null;
  reloadConsumed = true;
  try {
    if (sessionStorage.getItem(LAST) !== key) return null;
    return JSON.parse(sessionStorage.getItem(PREFIX + key) ?? 'null') as T | null;
  } catch { return null; }
}

/** Save the state of `key` and mark it as the view in use. */
export function remember(key: string, state: unknown): void {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(state));
    sessionStorage.setItem(LAST, key);
  } catch { /* storage full or unavailable: the view still works */ }
}
