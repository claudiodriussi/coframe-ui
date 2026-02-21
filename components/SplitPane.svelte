<script lang="ts">
  /**
   * SplitPane.svelte — wrapper split.js con collasso e persistenza
   *
   * Props:
   *   direction      'horizontal' | 'vertical'      orientamento (default: 'horizontal')
   *   defaultSizes   [number, number]                percentuali iniziali (default: [50, 50])
   *   minSize        number | [number, number]        minimo in px durante il drag (default: 0)
   *   maxSize        number | [number, number]        massimo in px durante il drag (opzionale)
   *   gutterSize     number                           spessore gutter in px (default: 6)
   *   collapseTarget 'a' | 'b'                       quale pannello collassa con il pulsante (default: 'b')
   *   storageKey     string                           chiave localStorage: "split.{key}" (opzionale)
   *   a              Snippet                          contenuto pannello A (sinistra/alto)
   *   b              Snippet                          contenuto pannello B (destra/basso)
   *
   * Comportamento gutter:
   *   click sul pulsante  → collassa/espande il pannello target
   *   doppio-click gutter → reset a defaultSizes + rimuove chiave localStorage
   *
   * localStorage:
   *   Chiave: "split.{storageKey}"
   *   Valore: JSON "[40.5, 59.5]" (percentuali, aggiornate ad ogni drag-end)
   *   Ripristinato al mount. Rimosso dal doppio-click reset.
   */
  import Split from 'split.js';
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';

  type Direction    = 'horizontal' | 'vertical';
  type CollapseTarget = 'a' | 'b';

  let {
    direction      = 'horizontal',
    defaultSizes   = [50, 50] as [number, number],
    minSize        = 0,
    maxSize        = undefined as number | number[] | undefined,
    gutterSize     = 6,
    collapseTarget = 'b',
    storageKey     = undefined as string | undefined,
    a,
    b,
  }: {
    direction?:      Direction;
    defaultSizes?:   [number, number];
    minSize?:        number | number[];
    maxSize?:        number | number[];
    gutterSize?:     number;
    collapseTarget?: CollapseTarget;
    storageKey?:     string;
    a: Snippet;
    b: Snippet;
  } = $props();

  let paneA: HTMLDivElement;
  let paneB: HTMLDivElement;
  let instance:  ReturnType<typeof Split> | null = null;
  let toggleBtn: HTMLButtonElement | null = null;

  // Stato collasso (reattivo per class:cf-pane-collapsed)
  let collapsed = $state(false);

  // Ultime dimensioni prima del collasso (inizializzato in onMount)
  let savedSizes: [number, number] = [50, 50];

  // — Frecce ——————————————————————————————————————————————————
  // \uFE0E forza la presentazione testuale dei caratteri Unicode
  // evitando che il browser li mostri come emoji colorati (es. ▶ arancio).
  //
  // Logica: la freccia punta VERSO il pannello target quando è visibile
  // (click = collassa) e SI ALLONTANA da esso quando è collassato (click = espandi).
  //
  // horizontal, target='b': ▶ collassa B a destra  / ◀ espandi B da destra
  // horizontal, target='a': ◀ collassa A a sinistra / ▶ espandi A da sinistra
  // vertical,   target='b': ▼ collassa B in basso   / ▲ espandi B dal basso
  // vertical,   target='a': ▲ collassa A in alto     / ▼ espandi A dall'alto
  const arrowCollapse = $derived(
    direction === 'horizontal'
      ? (collapseTarget === 'b' ? '▶\uFE0E' : '◀\uFE0E')
      : (collapseTarget === 'b' ? '▼\uFE0E' : '▲\uFE0E')
  );
  const arrowExpand = $derived(
    direction === 'horizontal'
      ? (collapseTarget === 'b' ? '◀\uFE0E' : '▶\uFE0E')
      : (collapseTarget === 'b' ? '▲\uFE0E' : '▼\uFE0E')
  );

  // — LocalStorage ——————————————————————————————————————————
  function storeGet(): [number, number] | null {
    if (!storageKey) return null;
    try {
      const raw = localStorage.getItem(`split.${storageKey}`);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  function storeSet(sizes: number[]) {
    if (storageKey) localStorage.setItem(`split.${storageKey}`, JSON.stringify(sizes));
  }

  function storeClear() {
    if (storageKey) localStorage.removeItem(`split.${storageKey}`);
  }

  // — Sincronizza freccia sul pulsante DOM ———————————————————
  function syncArrow() {
    if (!toggleBtn) return;
    toggleBtn.textContent = collapsed ? arrowExpand : arrowCollapse;
    toggleBtn.title = collapsed ? 'Espandi pannello' : 'Comprimi pannello';
  }

  // — Toggle collasso ————————————————————————————————————————
  function toggleCollapse() {
    if (collapsed) {
      // Ripristina
      collapsed = false;
      instance?.setSizes(savedSizes);
    } else {
      // Collassa: salva posizione corrente poi porta il pannello a 0
      savedSizes = (instance?.getSizes() ?? [...defaultSizes]) as [number, number];
      storeSet(savedSizes);
      collapsed = true;
      // setSizes bypassa minSize → va sempre a 0 indipendentemente dalla prop
      if (collapseTarget === 'a') {
        instance?.setSizes([0, 100]);
      } else {
        instance?.setSizes([100, 0]);
      }
    }
    syncArrow();
  }

  // — Reset (doppio click gutter) ————————————————————————————
  function resetSizes() {
    collapsed  = false;
    savedSizes = [...defaultSizes] as [number, number];
    storeClear();
    instance?.setSizes([...defaultSizes]);
    syncArrow();
  }

  // — Ciclo di vita ——————————————————————————————————————————
  onMount(() => {
    const initial = storeGet() ?? [...defaultSizes];
    savedSizes = [...initial] as [number, number];

    const opts: Parameters<typeof Split>[1] = {
      direction,
      sizes:      initial,
      minSize,
      gutterSize,
      snapOffset: 0,   // nessuno snap automatico verso minSize durante il drag

      onDragEnd: (sizes) => {
        if (!collapsed) {
          savedSizes = sizes as [number, number];
          storeSet(sizes);
        }
      },

      gutter: (_index, dir) => {
        const el = document.createElement('div');
        el.className = `cf-gutter cf-gutter-${dir}`;

        const btn = document.createElement('button');
        btn.className = 'cf-gutter-btn';
        btn.type = 'button';
        btn.textContent = arrowCollapse;
        btn.title = 'Comprimi pannello';

        btn.addEventListener('click', (e) => {
          e.stopPropagation();  // non avviare il drag
          toggleCollapse();
        });

        el.addEventListener('dblclick', (e) => {
          if (e.target === btn) return;
          resetSizes();
        });

        toggleBtn = btn;
        el.appendChild(btn);
        return el;
      },
    };

    if (maxSize !== undefined) opts.maxSize = maxSize;

    instance = Split([paneA, paneB], opts);
  });

  onDestroy(() => {
    instance?.destroy();
  });
</script>

<div class="cf-split-wrapper cf-split-{direction}">
  <div
    bind:this={paneA}
    class="cf-split-pane cf-pane-a"
    class:cf-pane-collapsed={collapsed && collapseTarget === 'a'}
  >
    {@render a()}
  </div>
  <div
    bind:this={paneB}
    class="cf-split-pane cf-pane-b"
    class:cf-pane-collapsed={collapsed && collapseTarget === 'b'}
  >
    {@render b()}
  </div>
</div>

<style>
  /* Wrapper: occupa tutto lo spazio disponibile dal genitore */
  .cf-split-wrapper {
    display: flex;
    width: 100%;
    height: 100%;
    overflow: hidden;
  }

  .cf-split-horizontal { flex-direction: row; }
  .cf-split-vertical   { flex-direction: column; }

  /* Pannelli: overflow gestito per scroll interno */
  .cf-split-pane {
    overflow: auto;
    min-width: 0;   /* fix flex shrink below content width */
    min-height: 0;
  }

  /* Pane collassato a 0px: impedisce che il contenuto fuoriesca */
  .cf-pane-collapsed {
    overflow: hidden !important;
  }

  /* ---- Gutter (elementi creati da split.js, fuori scope Svelte) ---- */

  :global(.cf-gutter) {
    background: #e5e7eb;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: background 0.15s;
    user-select: none;
  }

  :global(.cf-gutter:hover) {
    background: #d1d5db;
  }

  :global(.cf-gutter-horizontal) { cursor: col-resize; }
  :global(.cf-gutter-vertical)   { cursor: row-resize; }

  /* Pulsante toggle sul gutter.
     appearance:none annulla gli stili che @tailwindcss/forms applica ai <button>.
     \uFE0E nel textContent forza la presentazione testuale delle frecce Unicode
     (senza, alcuni OS mostrano ▶ come emoji arancio). */
  :global(.cf-gutter-btn) {
    appearance: none;
    -webkit-appearance: none;
    position: absolute;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ffffff;
    border: 1px solid #d1d5db;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
    cursor: pointer;
    font-size: 9px;
    color: #6b7280;
    z-index: 1;
    padding: 0;
    line-height: 1;
    pointer-events: all;
    font-variant-emoji: text;   /* fallback CSS per emoji presentation */
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  :global(.cf-gutter-btn:hover) {
    background: #eff6ff;
    border-color: #93c5fd;
    color: #1d4ed8;
  }

  :global(.cf-gutter-btn:focus-visible) {
    outline: 2px solid #2563eb;
    outline-offset: 2px;
  }
</style>
