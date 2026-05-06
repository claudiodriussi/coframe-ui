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

export function createStack() {
  const { subscribe, update } = writable<StackPage[]>([]);

  return {
    subscribe,

    push(
      component: AnyComponent,
      props: Record<string, unknown> = {},
      onReturn?: (data?: unknown) => void
    ): string {
      const id = crypto.randomUUID();
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
