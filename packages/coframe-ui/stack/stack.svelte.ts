/**
 * Stack navigation — writable store (Svelte 4 store API, works in Svelte 5).
 *
 * Usage:
 *   stack.push(Component, props, onReturn?)  → opens a page on top
 *   stack.pop(returnData?)                   → goes back, calls onReturn with data
 *   stack.clear()                            → reset (call in onMount cleanup)
 *   stack.subscribe(...)                     → standard store reactivity
 *
 * Browser Back is handled by the host page with popstate + history.pushState
 * (see +page.svelte in playground/stack for the pattern).
 */

import { writable } from 'svelte/store';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = any;

type StackPage = {
  id: string;
  component: AnyComponent;
  props?: Record<string, unknown>;
  onReturn?: (data?: unknown) => void;
};

/**
 * An id for a frame, unique within this page.
 *
 * Not `crypto.randomUUID()` alone: that exists only in a secure context —
 * HTTPS, or localhost. Served over plain HTTP from any other host, which is
 * what a compiled client on a LAN is, it is undefined and every push throws.
 * Nothing here needs a UUID's guarantees; it needs a key no other frame has.
 */
let counter = 0;
function frameId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `frame-${Date.now().toString(36)}-${(counter += 1)}`;
}

export function createStack() {
  const { subscribe, update } = writable<StackPage[]>([]);

  return {
    subscribe,

    push(
      component: AnyComponent,
      props: Record<string, unknown> = {},
      onReturn?: (data?: unknown) => void
    ): string {
      const id = frameId();
      update((pages) => [...pages, { id, component, props, onReturn }]);
      return id;
    },

    pop(returnData?: unknown): void {
      update((pages) => {
        if (pages.length === 0) return pages;
        const next = [...pages];
        const popped = next.pop();
        popped?.onReturn?.(returnData);
        return next;
      });
    },

    clear(): void {
      update(() => []);
    },

    get length(): number {
      let len = 0;
      subscribe((pages) => (len = pages.length))();
      return len;
    }
  };
}

export const stack = createStack();
export type StackInstance = ReturnType<typeof createStack>;
