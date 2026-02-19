/**
 * Stack navigation — writable store (Svelte 4 store API, funziona in Svelte 5).
 *
 * Uso:
 *   stack.push(Component, props, onReturn?)  → apre una pagina sopra
 *   stack.pop(returnData?)                   → torna indietro, chiama onReturn con i dati
 *   stack.clear()                            → reset (chiamare nell'onMount cleanup)
 *   stack.subscribe(...)                     → reattività standard store
 *
 * Il browser Back è gestito dalla pagina host con popstate + history.pushState
 * (vedi +page.svelte del playground/stack per il pattern).
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

function createStack() {
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
