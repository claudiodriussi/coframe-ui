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
