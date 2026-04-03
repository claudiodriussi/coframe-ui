<script lang="ts">
  /**
   * SplitPane.svelte — split.js wrapper with collapse and persistence
   *
   * Props:
   *   direction      'horizontal' | 'vertical'      orientation (default: 'horizontal')
   *   defaultSizes   [number, number]                initial percentages (default: [50, 50])
   *   minSize        number | [number, number]        minimum in px during drag (default: 0)
   *   maxSize        number | [number, number]        maximum in px during drag (optional)
   *   gutterSize     number                           gutter thickness in px (default: 6)
   *   collapseTarget 'a' | 'b'                       which panel collapses with the button (default: 'b')
   *   storageKey     string                           localStorage key: "split.{key}" (optional)
   *   a              Snippet                          content of panel A (left/top)
   *   b              Snippet                          content of panel B (right/bottom)
   *
   * Gutter behaviour:
   *   button click        → collapses/expands the target panel
   *   double-click gutter → reset to defaultSizes + removes localStorage key
   *
   * localStorage:
   *   Key: "split.{storageKey}"
   *   Value: JSON "[40.5, 59.5]" (percentages, updated on every drag-end)
   *   Restored on mount. Removed by double-click reset.
   */
  import Split from 'split.js';
  import { onMount, onDestroy } from 'svelte';
  import type { Snippet } from 'svelte';

  type Direction    = 'horizontal' | 'vertical';
  type CollapseTarget = 'a' | 'b';

  let {
    direction        = 'horizontal',
    defaultSizes     = [50, 50] as [number, number],
    minSize          = 0,
    maxSize          = undefined as number | number[] | undefined,
    gutterSize       = 6,
    collapseTarget   = 'b',
    storageKey       = undefined as string | undefined,
    initialCollapsed = false,
    onCollapse       = undefined as ((isCollapsed: boolean) => void) | undefined,
    a,
    b,
  }: {
    direction?:        Direction;
    defaultSizes?:     [number, number];
    minSize?:          number | number[];
    maxSize?:          number | number[];
    gutterSize?:       number;
    collapseTarget?:   CollapseTarget;
    storageKey?:       string;
    initialCollapsed?: boolean;
    onCollapse?:       (isCollapsed: boolean) => void;
    a: Snippet;
    b: Snippet;
  } = $props();

  let paneA: HTMLDivElement;
  let paneB: HTMLDivElement;
  let instance:  ReturnType<typeof Split> | null = null;
  let toggleBtn: HTMLButtonElement | null = null;

  // Collapse state (reactive for class:cf-pane-collapsed)
  // Seeded from initialCollapsed when there is no localStorage entry.
  let collapsed = $state(false);

  // Last sizes before collapse (initialised in onMount)
  let savedSizes: [number, number] = [50, 50];

  // — Arrows ——————————————————————————————————————————————————
  // \uFE0E forces text presentation of Unicode characters,
  // preventing the browser from rendering them as coloured emoji (e.g. orange ▶).
  //
  // Logic: the arrow points TOWARDS the target panel when it is visible
  // (click = collapse) and AWAY from it when collapsed (click = expand).
  //
  // horizontal, target='b': ▶ collapse B to the right  / ◀ expand B from the right
  // horizontal, target='a': ◀ collapse A to the left   / ▶ expand A from the left
  // vertical,   target='b': ▼ collapse B downward       / ▲ expand B from below
  // vertical,   target='a': ▲ collapse A upward         / ▼ expand A from above
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

  // — Sync arrow on the DOM button ———————————————————
  function syncArrow() {
    if (!toggleBtn) return;
    toggleBtn.textContent = collapsed ? arrowExpand : arrowCollapse;
    toggleBtn.title = collapsed ? 'Expand panel' : 'Collapse panel';
  }

  // — Toggle collapse ————————————————————————————————————————
  function toggleCollapse() {
    if (collapsed) {
      collapsed = false;
      instance?.setSizes(savedSizes);
    } else {
      savedSizes = (instance?.getSizes() ?? [...defaultSizes]) as [number, number];
      storeSet(savedSizes);
      collapsed = true;
      if (collapseTarget === 'a') {
        instance?.setSizes([0, 100]);
      } else {
        instance?.setSizes([100, 0]);
      }
    }
    syncArrow();
    onCollapse?.(collapsed);
  }

  // — Reset (gutter double-click) ————————————————————————————
  function resetSizes() {
    collapsed  = false;
    savedSizes = [...defaultSizes] as [number, number];
    storeClear();
    instance?.setSizes([...defaultSizes]);
    syncArrow();
    onCollapse?.(false);
  }

  // — Lifecycle ——————————————————————————————————————————
  onMount(() => {
    const stored  = storeGet();
    // localStorage persistence is intentionally bypassed for collapse state:
    // initialCollapsed always wins. A proper strategy (save px sizes, restore
    // collapsed flag) will be designed separately.
    const startCollapsed = initialCollapsed;
    const initial = stored ?? [...defaultSizes];
    savedSizes = [...initial] as [number, number];
    if (startCollapsed) collapsed = true;

    // Residual size (px) of the collapsed pane. 0 = fully hidden, leaving only
    // the gutter button visible. Increase to keep a thin strip showing.
    const COLLAPSED_SIZE_PX = 0;

    // The collapse target uses COLLAPSED_SIZE_PX as its minimum so
    // setSizes([100,0]) / setSizes([0,100]) can reach it programmatically.
    // The other pane keeps the configured minimum to prevent accidental drag-collapse.
    const minA = Array.isArray(minSize) ? minSize[0] : minSize;
    const minB = Array.isArray(minSize) ? minSize[1] : minSize;
    const effectiveMinSize = collapseTarget === 'a'
      ? [COLLAPSED_SIZE_PX, minB]
      : [minA, COLLAPSED_SIZE_PX];

    const opts: Parameters<typeof Split>[1] = {
      direction,
      sizes:      initial,
      minSize:    effectiveMinSize,
      gutterSize,
      snapOffset: 0,   // no automatic snap towards minSize during drag

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
          e.stopPropagation();  // do not start drag
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

    if (startCollapsed) {
      instance.setSizes(collapseTarget === 'a' ? [0, 100] : [100, 0]);
      syncArrow();
      onCollapse?.(true);
    }
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
    background: var(--cf-border);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: background 0.15s;
    user-select: none;
  }

  :global(.cf-gutter:hover) {
    background: var(--cf-border-input);
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
    background: var(--cf-bg);
    border: 1px solid var(--cf-border-input);
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.12);
    cursor: pointer;
    font-size: 9px;
    color: var(--cf-text-muted);
    z-index: 1;
    padding: 0;
    line-height: 1;
    pointer-events: all;
    font-variant-emoji: text;   /* fallback CSS per emoji presentation */
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }

  :global(.cf-gutter-btn:hover) {
    background: var(--cf-accent-subtle);
    border-color: var(--cf-accent-border);
    color: var(--cf-accent-hover);
  }

  :global(.cf-gutter-btn:focus-visible) {
    outline: 2px solid var(--cf-accent);
    outline-offset: 2px;
  }
</style>
