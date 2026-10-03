import { untrack } from 'svelte';

function toStr(v: unknown): string {
  return v != null && v !== '' ? String(v) : '';
}

/**
 * Shared $state + $effect sync pattern for string-backed widgets.
 * Call once during component initialisation (sync, in <script>).
 * Reading internal via untrack in $effect prevents user typing from
 * re-triggering the sync loop (see pitfalls.md).
 */
export function syncStringState(getValue: () => unknown) {
  let internal = $state(untrack(() => toStr(getValue())));

  $effect(() => {
    const incoming = toStr(getValue());
    if (incoming !== untrack(() => internal)) internal = incoming;
  });

  return {
    get current() { return internal; },
    set current(v: string) { internal = v; }
  };
}

/**
 * Dispatch df:enter on Enter key so DataForm can advance focus.
 * Use only in single-line inputs — not textarea (Enter = newline there).
 */
export function dispatchEnter(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    (e.currentTarget as HTMLElement).dispatchEvent(
      new CustomEvent('df:enter', { bubbles: true })
    );
  }
}

/**
 * The keys of a field that opens something, the same on every widget:
 * F4 (or Alt+ArrowDown, as on native drop-downs) opens what the field shows —
 * a list, a calendar — and F3 opens the full search where the field has one.
 * F2 stays free: elsewhere it means "edit this".
 *
 * Returns true when a handler took the key. A key the field cannot serve is
 * left to the browser.
 */
export function popupKeys(
  e: KeyboardEvent,
  handlers: { open?: () => void; search?: () => void },
): boolean {
  const open = e.key === 'F4' || (e.altKey && e.key === 'ArrowDown');
  const handler = open ? handlers.open : e.key === 'F3' ? handlers.search : undefined;
  if (!handler) return false;
  e.preventDefault();
  handler();
  return true;
}
