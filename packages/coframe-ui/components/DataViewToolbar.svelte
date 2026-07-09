<script lang="ts">
  /**
   * DataViewToolbar.svelte — toolbar for DataView.
   *
   * Receives all UI state and callbacks from DataView; owns no data state.
   * The load-more button lives here (previously a separate footer strip).
   *
   * Future: icon-only buttons with statusbar/tooltip description.
   * Future: allow_views switcher (shows type buttons when allowViews.length > 1).
   * Future: group-by selector (shows when view descriptor has a `group` config).
   */

  const LOAD_MORE_OPTIONS = [50, 100, 500];

  let {
    toolbarItems = [] as string[],
    filterMode = false,
    selectMode = false,
    loading = false,
    loadingMore = false,
    hasMore = false,
    rowCount = 0,
    filteredCount = null as number | null,
    totalCount = null as number | null,
    selectedCount = 0,
    // Future: view-type switcher — no-op until a second renderer is implemented.
    allowViews = [] as string[],
    activeViewType = '' as string,
    onToggleFilter = undefined as (() => void) | undefined,
    onToggleSelect = undefined as (() => void) | undefined,
    onExport = undefined as (() => void) | undefined,
    onLoadMore = undefined as ((n: number) => void) | undefined,
    onSwitchView = undefined as ((type: string) => void) | undefined,
  }: {
    toolbarItems?: string[];
    filterMode?: boolean;
    selectMode?: boolean;
    loading?: boolean;
    loadingMore?: boolean;
    hasMore?: boolean;
    rowCount?: number;
    filteredCount?: number | null;
    totalCount?: number | null;
    selectedCount?: number;
    allowViews?: string[];
    activeViewType?: string;
    onToggleFilter?: () => void;
    onToggleSelect?: () => void;
    onExport?: () => void;
    onLoadMore?: (n: number) => void;
    onSwitchView?: (type: string) => void;
  } = $props();

  let loadMoreOpen = $state(false);
</script>

{#if loadMoreOpen}
  <div class="cf-loadmore-overlay" role="presentation" onclick={() => (loadMoreOpen = false)}></div>
{/if}

<div class="cf-dv-toolbar">
  <div class="cf-dv-toolbar-left">

    {#if toolbarItems.includes('add')}
      <button class="cf-dv-btn" title="Add" disabled>
        <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/>
        </svg>
        Add
      </button>
    {/if}

    {#if toolbarItems.includes('search')}
      <button class="cf-dv-btn" title="Search" disabled>
        <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
          <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clip-rule="evenodd"/>
        </svg>
        Search
      </button>
    {/if}

    {#if toolbarItems.includes('filter')}
      <button class="cf-dv-btn" title="Toggle column filters" onclick={onToggleFilter}>
        <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
          <path fill-rule="evenodd" d="M2.628 1.601C5.028 1.206 7.49 1 10 1s4.973.206 7.372.601a.75.75 0 0 1 .628.74v2.288a2.25 2.25 0 0 1-.659 1.59l-4.682 4.683a2.25 2.25 0 0 0-.659 1.59v3.037c0 .684-.31 1.33-.844 1.757l-1.937 1.55A.75.75 0 0 1 9 18.25v-5.757a2.25 2.25 0 0 0-.659-1.591L3.659 6.22A2.25 2.25 0 0 1 3 4.629V2.34a.75.75 0 0 1 .628-.74Z" clip-rule="evenodd"/>
        </svg>
        Filter
      </button>
    {/if}

    {#if toolbarItems.includes('select')}
      <button class="cf-dv-btn" title="Toggle row selection" onclick={onToggleSelect}>
        <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
          <path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clip-rule="evenodd"/>
        </svg>
        Select
      </button>
    {/if}

    {#if toolbarItems.includes('export')}
      <button class="cf-dv-btn" title="Export CSV" onclick={onExport}>
        <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
          <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z"/>
          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z"/>
        </svg>
        Export
      </button>
    {/if}

    {#if toolbarItems.includes('print')}
      <button class="cf-dv-btn" title="Print" disabled>
        <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
          <path fill-rule="evenodd" d="M5 2.75C5 1.784 5.784 1 6.75 1h6.5c.966 0 1.75.784 1.75 1.75v3.552c.377.046.752.097 1.126.153A2.212 2.212 0 0 1 18 8.653v4.097A2.25 2.25 0 0 1 15.75 15h-.241l.305 1.984A1.75 1.75 0 0 1 14.084 19H5.915a1.75 1.75 0 0 1-1.73-2.016L4.492 15H4.25A2.25 2.25 0 0 1 2 12.75V8.653c0-1.082.775-2.034 1.874-2.198.374-.056.749-.107 1.126-.153V2.75Zm1.5 0v3.44a41.892 41.892 0 0 1 7 0V2.75a.25.25 0 0 0-.25-.25h-6.5a.25.25 0 0 0-.25.25Zm-.875 8.5a.75.75 0 0 0 0 1.5h8.75a.75.75 0 0 0 0-1.5H5.625ZM6 15.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd"/>
        </svg>
        Print
      </button>
    {/if}

    <!-- ── Load more — moved from footer ──────────────────────────────────── -->
    {#if hasMore || loadingMore}
      <div class="cf-loadmore-wrap">
        <button
          class="cf-dv-btn cf-loadmore-btn"
          onclick={() => (loadMoreOpen = !loadMoreOpen)}
          disabled={loadingMore}
          title="Load more rows"
        >
          {#if loadingMore}
            <div class="cf-dv-spinner" aria-hidden="true"></div>
            Loading…
          {:else}
            Load more
            <svg viewBox="0 0 20 20" fill="currentColor" class="cf-dv-icon" aria-hidden="true">
              <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" clip-rule="evenodd"/>
            </svg>
          {/if}
        </button>

        {#if loadMoreOpen}
          <div class="cf-loadmore-menu" role="menu">
            {#each LOAD_MORE_OPTIONS as n (n)}
              <button class="cf-loadmore-item" role="menuitem" onclick={() => { loadMoreOpen = false; onLoadMore?.(n); }}>
                Load {n} rows
              </button>
            {/each}
            <div class="cf-loadmore-sep" role="separator"></div>
            <button class="cf-loadmore-item" role="menuitem" onclick={() => { loadMoreOpen = false; onLoadMore?.(0); }}>
              Load all
            </button>
          </div>
        {/if}
      </div>
    {/if}

    <!-- ── View type switcher — active when allowViews.length > 1 ─────────── -->
    <!-- Future: render icon buttons for each entry in allowViews -->

  </div>

  <div class="cf-dv-toolbar-right">
    {#if loading}
      <div class="cf-dv-spinner" aria-label="Loading"></div>
    {/if}
    <span class="cf-dv-count">
      {#if filteredCount !== null}{filteredCount} / {/if}{rowCount}{#if totalCount !== null} / {totalCount}{/if} rows{#if selectedCount > 0} · {selectedCount} sel.{/if}
    </span>
  </div>
</div>

<style>
  .cf-dv-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.3rem 0.625rem;
    border-bottom: 1px solid var(--cf-border);
    background: var(--cf-surface);
    flex-shrink: 0;
    gap: 0.5rem;
    min-height: 2rem;
  }

  .cf-dv-toolbar-left {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .cf-dv-toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cf-dv-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--cf-border-input);
    border-radius: 0.3rem;
    background: var(--cf-bg);
    color: var(--cf-text);
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
    appearance: none;
    line-height: 1.4;
  }

  .cf-dv-btn:hover:not(:disabled) {
    background: var(--cf-surface-hover);
    border-color: var(--cf-text-subtle);
  }

  .cf-dv-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .cf-dv-icon {
    width: 0.8rem;
    height: 0.8rem;
    flex-shrink: 0;
  }

  .cf-dv-spinner {
    width: 0.8rem;
    height: 0.8rem;
    border: 2px solid var(--cf-border);
    border-top-color: var(--cf-accent);
    border-radius: 50%;
    animation: cf-spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  @keyframes cf-spin { to { transform: rotate(360deg); } }

  .cf-dv-count {
    font-size: 0.68rem;
    color: var(--cf-text-subtle);
    white-space: nowrap;
  }

  /* ── Load more ────────────────────────────────────────────────────────── */

  .cf-loadmore-overlay {
    position: fixed;
    inset: 0;
    z-index: 10;
  }

  .cf-loadmore-wrap {
    position: relative;
  }

  .cf-loadmore-btn {
    gap: 0.3rem;
  }

  .cf-loadmore-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    background: var(--cf-bg);
    border: 1px solid var(--cf-border);
    border-radius: 0.375rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    min-width: 10rem;
    z-index: 11;
    overflow: hidden;
  }

  .cf-loadmore-item {
    display: block;
    width: 100%;
    padding: 0.4rem 0.75rem;
    text-align: left;
    font-size: 0.75rem;
    color: var(--cf-text);
    background: none;
    border: none;
    cursor: pointer;
    transition: background 0.1s;
  }

  .cf-loadmore-item:hover {
    background: var(--cf-surface-hover);
  }

  .cf-loadmore-sep {
    height: 1px;
    background: var(--cf-border);
    margin: 0.2rem 0;
  }
</style>
