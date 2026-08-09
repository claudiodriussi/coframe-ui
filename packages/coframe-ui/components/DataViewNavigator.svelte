<script lang="ts">
  /**
   * DataViewNavigator.svelte — icon-only CRUD toolbar for DataView.
   *
   * Replaces DataViewToolbar. Derives button visibility from:
   *   1. Mode defaults (browser / lookup / readonly)
   *   2. + show: [...] from NavigatorConfig
   *   3. - hide: [...] from NavigatorConfig
   *
   * Toolbar command buttons (scope: row/selection/global) are injected
   * between the CRUD group and the filter group.
   *
   * Auto-items (load_more, commands) obey their own condition AND hide list.
   */

  import {
    Plus, Pencil, Trash2, Check, X,
    Funnel, Search,
    Group, Download, Printer,
    RefreshCw, Ellipsis,
    ChevronDown, SquareCheckBig,
  } from 'lucide-svelte';
  import type { NavigatorConfig, CommandItem } from './dataview.types';
  import { _, _t } from '../i18n';

  const LOAD_MORE_OPTIONS = [50, 100, 500];

  // ── Props ──────────────────────────────────────────────────────────────────

  let {
    config = undefined as NavigatorConfig | undefined,
    // Data state
    filterMode = false,
    loading = false,
    loadingMore = false,
    hasMore = false,
    rowCount = 0,
    filteredCount = null as number | null,
    totalCount = null as number | null,
    selectedCount = 0,
    activeRowId = null as unknown,
    // Actions
    onAdd = undefined as (() => void) | undefined,
    onEdit = undefined as (() => void) | undefined,
    onDelete = undefined as (() => void) | undefined,
    onAccept = undefined as (() => void) | undefined,
    onCancel = undefined as (() => void) | undefined,
    selectMode = false,
    onToggleFilter = undefined as (() => void) | undefined,
    onToggleSelect = undefined as (() => void) | undefined,
    onExport = undefined as (() => void) | undefined,
    onRefresh = undefined as (() => void) | undefined,
    onLoadMore = undefined as ((n: number) => void) | undefined,
    onCommand = undefined as ((cmd: CommandItem) => void) | undefined,
    // Quick search — the everyday gesture, so it lives in the row that already
    // exists rather than in one of its own (querybuilder.md §7).
    searchable = false,
    searchValue = '',
    onSearch = undefined as ((text: string) => void) | undefined,
  }: {
    config?: NavigatorConfig;
    filterMode?: boolean;
    loading?: boolean;
    loadingMore?: boolean;
    hasMore?: boolean;
    rowCount?: number;
    filteredCount?: number | null;
    totalCount?: number | null;
    selectedCount?: number;
    activeRowId?: unknown;
    onAdd?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onAccept?: () => void;
    onCancel?: () => void;
    selectMode?: boolean;
    onToggleFilter?: () => void;
    onToggleSelect?: () => void;
    onExport?: () => void;
    onRefresh?: () => void;
    onLoadMore?: (n: number) => void;
    onCommand?: (cmd: CommandItem) => void;
    searchable?: boolean;
    searchValue?: string;
    onSearch?: (text: string) => void;
  } = $props();

  // ── Visibility resolution ──────────────────────────────────────────────────

  const mode = $derived(config?.mode ?? 'browser');

  // Default visible buttons per mode
  const MODE_DEFAULTS: Record<string, Set<string>> = {
    browser:  new Set(['add', 'edit', 'delete', 'select', 'filter', 'export']),
    lookup:   new Set(['add', 'edit', 'delete', 'accept', 'cancel', 'filter']),
    batch:    new Set(['edit', 'accept', 'cancel', 'select', 'filter']),
    readonly: new Set(['filter', 'export']),
  };

  const visibleSet = $derived.by(() => {
    const base = new Set(MODE_DEFAULTS[mode] ?? MODE_DEFAULTS.browser);
    for (const id of config?.show ?? []) base.add(id);
    for (const id of config?.hide ?? []) base.delete(id);
    return base;
  });

  function isVisible(id: string): boolean {
    return visibleSet.has(id);
  }

  // ── Toolbar commands (scope: toolbar:true) ─────────────────────────────────

  const toolbarCmds = $derived(
    (config?.commands ?? []).filter(c => c.toolbar)
  );

  // ── Row-active state ───────────────────────────────────────────────────────

  const hasRow = $derived(activeRowId != null);
  const hasSel = $derived(selectedCount > 0);

  // ── Load more dropdown ─────────────────────────────────────────────────────

  let loadMoreOpen = $state(false);

  // ── Quick search ───────────────────────────────────────────────────────────
  // Typing is local: the query leaves on Enter, never while typing. Every
  // emission is an ILIKE over several columns of a table that may hold a
  // million rows, and running one at each pause spends it on text the user has
  // not finished thinking. It also makes the box editable — clear it, retype,
  // correct a letter — without a set changing underneath.
  //
  // Escape and the × clear it and ask for the whole set back: one query, meant.

  let searchText = $state(searchValue);
  let emitted = searchValue;

  // Follow the value from outside (a restored view, a reset) without undoing
  // what the user is typing: only a value we did not send ourselves wins.
  $effect(() => {
    if (searchValue !== emitted) {
      emitted = searchValue;
      searchText = searchValue;
    }
  });

  function emitSearch(text: string) {
    emitted = text;
    onSearch?.(text);
  }

  function handleSearchInput(e: Event) {
    searchText = (e.target as HTMLInputElement).value;
  }

  function handleSearchKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      if (searchText !== emitted) emitSearch(searchText);
    } else if (e.key === 'Escape' && searchText) {
      e.stopPropagation();   // the stack listens for Escape: clearing is not leaving
      searchText = '';
      emitSearch('');
    }
  }

  function clearSearch() {
    searchText = '';
    if (emitted !== '') emitSearch('');
  }
</script>

{#if loadMoreOpen}
  <div class="cf-nav-overlay" role="presentation" onclick={() => (loadMoreOpen = false)}></div>
{/if}

<div class="cf-navigator">

  <!-- ── Left group ─────────────────────────────────────────────────────── -->
  <div class="cf-nav-left">

    <!-- CRUD group -->
    {#if isVisible('add')}
      <button class="cf-nav-btn" title={_('Add (Ins)')} onclick={onAdd}>
        <Plus size={14} />
      </button>
    {/if}

    {#if isVisible('edit')}
      <button class="cf-nav-btn" title={_('Edit (Enter)')} disabled={!hasRow} onclick={onEdit}>
        <Pencil size={14} />
      </button>
    {/if}

    {#if isVisible('delete')}
      <button class="cf-nav-btn cf-nav-btn-danger" title={_('Delete (Del)')} disabled={!hasRow} onclick={onDelete}>
        <Trash2 size={14} />
      </button>
    {/if}

    {#if isVisible('accept')}
      {@const acceptDisabled = mode === 'batch' ? false : !hasRow}
      <button class="cf-nav-btn cf-nav-btn-primary" title={_('Accept (Enter)')} disabled={acceptDisabled} onclick={onAccept}>
        <Check size={14} />
      </button>
    {/if}

    {#if isVisible('cancel')}
      <button class="cf-nav-btn" title={_('Cancel (Esc)')} onclick={onCancel}>
        <X size={14} />
      </button>
    {/if}

    <!-- Toolbar commands (declared in YAML with toolbar:true) -->
    {#each toolbarCmds as cmd (cmd.id)}
      {@const disabled = cmd.scope === 'row' ? !hasRow : cmd.scope === 'selection' ? !hasSel : false}
      <button
        class="cf-nav-btn"
        title={cmd.label}
        {disabled}
        onclick={() => onCommand?.(cmd)}
      >
        <Ellipsis size={14} />
        <span class="cf-nav-label">{cmd.label}</span>
      </button>
    {/each}

    <!-- Separator before data tools -->
    {#if (isVisible('add') || isVisible('edit') || isVisible('delete') || toolbarCmds.length > 0) && (isVisible('filter') || isVisible('search') || isVisible('export') || isVisible('refresh'))}
      <span class="cf-nav-sep" aria-hidden="true"></span>
    {/if}

    <!-- Select (multi-row checkboxes) -->
    {#if isVisible('select')}
      <button
        class="cf-nav-btn"
        class:cf-nav-btn-active={selectMode}
        title={_('Multiple selection')}
        onclick={onToggleSelect}
      >
        <SquareCheckBig size={14} />
      </button>
    {/if}

    <!-- Filter -->
    {#if isVisible('filter')}
      <button
        class="cf-nav-btn"
        class:cf-nav-btn-active={filterMode}
        title={_('Column filter')}
        onclick={onToggleFilter}
      >
        <Funnel size={14} />
      </button>
    {/if}

    <!-- Search (placeholder — server-side query, Sprint 5) -->
    {#if isVisible('search')}
      <button class="cf-nav-btn" title={_('Advanced search')} disabled>
        <Search size={14} />
      </button>
    {/if}

    <!-- GroupBy (placeholder — Sprint 4) -->
    {#if isVisible('groupby')}
      <button class="cf-nav-btn" title={_('Group by')} disabled>
        <Group size={14} />
      </button>
    {/if}

    <!-- Export -->
    {#if isVisible('export')}
      <button class="cf-nav-btn" title={_('Export CSV (F7)')} onclick={onExport}>
        <Download size={14} />
      </button>
    {/if}

    <!-- Print (placeholder) -->
    {#if isVisible('print')}
      <button class="cf-nav-btn" title={_('Print (F5)')} disabled>
        <Printer size={14} />
      </button>
    {/if}

    <!-- Refresh -->
    {#if isVisible('refresh')}
      <button class="cf-nav-btn" title={_('Refresh (F6)')} onclick={onRefresh}>
        <RefreshCw size={14} />
      </button>
    {/if}

    <!-- Load More (auto — visible if hasMore/loadingMore AND not in hide list) -->
    {#if (hasMore || loadingMore) && !(config?.hide ?? []).includes('load_more')}
      <div class="cf-nav-loadmore-wrap">
        <button
          class="cf-nav-btn cf-nav-loadmore-btn"
          title={_('Load more')}
          onclick={() => (loadMoreOpen = !loadMoreOpen)}
          disabled={loadingMore}
        >
          {#if loadingMore}
            <div class="cf-nav-spinner" aria-hidden="true"></div>
          {:else}
            <ChevronDown size={14} />
          {/if}
        </button>

        {#if loadMoreOpen}
          <div class="cf-nav-loadmore-menu" role="menu">
            {#each LOAD_MORE_OPTIONS as n (n)}
              <button class="cf-nav-menu-item" role="menuitem"
                onclick={() => { loadMoreOpen = false; onLoadMore?.(n); }}>
                {_t('Load {n} rows', { n })}
              </button>
            {/each}
            <div class="cf-nav-menu-sep" role="separator"></div>
            <button class="cf-nav-menu-item" role="menuitem"
              onclick={() => { loadMoreOpen = false; onLoadMore?.(0); }}>
              {_('Load all')}
            </button>
          </div>
        {/if}
      </div>
    {/if}

  </div>

  <!-- ── Quick search — elastic filler, no row of its own ───────────────── -->
  {#if searchable}
    <div class="cf-nav-search">
      <button
        class="cf-nav-search-go"
        title={_('Search (Enter)')}
        aria-label={_('Search (Enter)')}
        onclick={() => { if (searchText !== emitted) emitSearch(searchText); }}
      >
        <Search size={13} />
      </button>
      <input
        type="text"
        class="cf-nav-search-input"
        placeholder={_('Search…')}
        value={searchText}
        oninput={handleSearchInput}
        onkeydown={handleSearchKey}
        aria-label={_('Search…')}
      />
      {#if searchText}
        <button class="cf-nav-search-clear" title={_('Clear search')} onclick={clearSearch}>
          <X size={12} />
        </button>
      {/if}
    </div>
  {/if}

  <!-- ── Right group: count + spinner ──────────────────────────────────── -->
  <div class="cf-nav-right">
    {#if loading}
      <div class="cf-nav-spinner" aria-label="Loading"></div>
    {/if}
    <span class="cf-nav-count">
      {#if filteredCount !== null}{filteredCount} / {/if}{rowCount}{#if totalCount !== null} / {totalCount}{/if}
      {#if selectedCount > 0}<span class="cf-nav-sel"> · {selectedCount} sel.</span>{/if}
    </span>
  </div>

</div>

<style>
  .cf-navigator {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.2rem 0.5rem;
    border-bottom: 1px solid var(--cf-border);
    background: var(--cf-surface);
    flex-shrink: 0;
    gap: 0.25rem;
    min-height: 1.9rem;
  }

  .cf-nav-left {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    flex-wrap: nowrap;
  }

  .cf-nav-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  /* ── Quick search ────────────────────────────────────────────────────────
     Elastic filler between the buttons and the counts: it takes the width
     nobody else wants and no height at all, so a view without a search pays
     nothing for the possibility of one. */

  .cf-nav-search {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    flex: 1 1 auto;
    min-width: 4rem;
    max-width: 22rem;
    margin: 0 0.4rem;
    padding: 0 0.35rem;
    height: 1.45rem;
    border: 1px solid var(--cf-border-input);
    border-radius: 0.25rem;
    background: var(--cf-bg);
    color: var(--cf-text-subtle);
  }

  .cf-nav-search:focus-within {
    border-color: var(--cf-accent, #3b82f6);
  }

  .cf-nav-search-input {
    flex: 1 1 auto;
    min-width: 0;
    border: none;
    outline: none;
    background: none;
    color: var(--cf-text);
    font-size: 0.72rem;
    line-height: 1.2;
  }

  .cf-nav-search-clear,
  .cf-nav-search-go {
    display: inline-flex;
    align-items: center;
    border: none;
    background: none;
    padding: 0;
    color: var(--cf-text-subtle);
    cursor: pointer;
  }

  .cf-nav-search-clear:hover,
  .cf-nav-search-go:hover {
    color: var(--cf-text);
  }

  /* ── Buttons ─────────────────────────────────────────────────────────── */

  .cf-nav-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.2rem 0.35rem;
    border: 1px solid transparent;
    border-radius: 0.25rem;
    background: none;
    color: var(--cf-text);
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s, color 0.1s;
    line-height: 1;
  }

  .cf-nav-btn:hover:not(:disabled) {
    background: var(--cf-surface-hover);
    border-color: var(--cf-border);
  }

  .cf-nav-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .cf-nav-btn-active {
    background: color-mix(in srgb, var(--cf-accent, #3b82f6) 12%, transparent);
    border-color: color-mix(in srgb, var(--cf-accent, #3b82f6) 40%, transparent);
    color: var(--cf-accent, #3b82f6);
  }

  .cf-nav-btn-primary {
    color: var(--cf-accent, #3b82f6);
  }

  .cf-nav-btn-danger:not(:disabled) {
    color: var(--cf-danger, #ef4444);
  }

  .cf-nav-label {
    font-size: 0.7rem;
    font-weight: 500;
  }

  /* ── Separator ───────────────────────────────────────────────────────── */

  .cf-nav-sep {
    display: inline-block;
    width: 1px;
    height: 1rem;
    background: var(--cf-border);
    margin: 0 0.2rem;
    flex-shrink: 0;
    align-self: center;
  }

  /* ── Load more ───────────────────────────────────────────────────────── */

  .cf-nav-loadmore-wrap {
    position: relative;
  }

  .cf-nav-loadmore-btn {
    border-color: var(--cf-border-input);
    background: var(--cf-bg);
  }

  .cf-nav-overlay {
    position: fixed;
    inset: 0;
    z-index: 10;
  }

  .cf-nav-loadmore-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    background: var(--cf-bg);
    border: 1px solid var(--cf-border);
    border-radius: 0.375rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    min-width: 9rem;
    z-index: 11;
    overflow: hidden;
  }

  .cf-nav-menu-item {
    display: block;
    width: 100%;
    padding: 0.35rem 0.75rem;
    text-align: left;
    font-size: 0.75rem;
    color: var(--cf-text);
    background: none;
    border: none;
    cursor: pointer;
    transition: background 0.1s;
  }

  .cf-nav-menu-item:hover {
    background: var(--cf-surface-hover);
  }

  .cf-nav-menu-sep {
    height: 1px;
    background: var(--cf-border);
    margin: 0.15rem 0;
  }

  /* ── Count & spinner ─────────────────────────────────────────────────── */

  .cf-nav-count {
    font-size: 0.68rem;
    color: var(--cf-text-subtle);
    white-space: nowrap;
  }

  .cf-nav-sel {
    color: var(--cf-accent, #3b82f6);
  }

  .cf-nav-spinner {
    width: 0.8rem;
    height: 0.8rem;
    border: 2px solid var(--cf-border);
    border-top-color: var(--cf-accent, #3b82f6);
    border-radius: 50%;
    animation: cf-spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  @keyframes cf-spin { to { transform: rotate(360deg); } }
</style>
