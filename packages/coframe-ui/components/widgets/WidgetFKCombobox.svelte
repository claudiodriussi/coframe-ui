<script lang="ts">
  /**
   * WidgetFKCombobox.svelte — FK field widget with server-side search.
   *
   * Keyboard: ↑↓ navigate options, Enter selects, Escape closes/restores,
   * Tab closes. "Search more…" is the last navigable item (opens picker).
   *
   * field.foreign_key: { target: string; field: string }  — from auto-form
   * serverConfig.tables[target].display_field             — label column
   * serverConfig.tables[target].search_fields             — searchable columns
   */
  import { untrack, getContext } from 'svelte';
  import { _ } from '../../i18n';
  import { api } from '$coframe/api/client';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';
  import { stack as globalStack } from '$coframe/stack/stack.svelte';
  import type { StackInstance } from '$coframe/stack/stack.svelte';
  import FKPickerView from '../FKPickerView.svelte';
  import type { FormField } from '../dataform.types';

  const stack = getContext<StackInstance>('cf:stack') ?? globalStack;

  interface Props {
    value: unknown;
    onchange: (v: unknown) => void;
    onblur?: () => void;
    readonly?: boolean;
    field: FormField;
  }

  let { value, onchange, onblur, readonly = false, field }: Props = $props();

  let fkTarget  = $derived((field.foreign_key as { target?: string; field?: string } | undefined)?.target);
  let fkPkField = $derived((field.foreign_key as { target?: string; field?: string } | undefined)?.field ?? 'id');

  let displayField = $derived(fkTarget ? serverConfig.tables[fkTarget]?.display_field : undefined);
  let searchFields = $derived(fkTarget ? (serverConfig.tables[fkTarget]?.search_fields ?? []) : []);

  let currentLabel = $state(untrack(() => ''));
  let query        = $state(untrack(() => ''));
  let options      = $state<Array<{ id: unknown; label: string }>>([]);
  let open         = $state(false);
  let searching    = $state(false);
  // -1 = none; 0..options.length-1 = option; options.length = "Search more…"
  let highlighted  = $state(-1);
  let inputEl      = $state<HTMLInputElement | undefined>();
  let listEl       = $state<HTMLUListElement | undefined>();

  // Reset highlight when options list changes
  $effect(() => {
    void options;
    highlighted = -1;
  });

  // Load the label whenever value changes from outside
  $effect(() => {
    const v = value;
    const df = displayField;
    const tbl = fkTarget;
    const pk = fkPkField;
    if (v == null || v === '') {
      currentLabel = '';
      query = '';
      return;
    }
    if (!tbl || !df) return;
    _loadLabel(v, tbl, pk, df);
  });

  // All parameters explicit — no outer-scope $derived access inside async body.
  async function _loadLabel(v: unknown, table: string, pkField: string, df: string) {
    try {
      const res = await api.endpoint('query', {
        format: 'records',
        query: {
          table,
          columns: [pkField, df],
          filters: { conditions: { column: pkField, op: 'eq', value: v } },
          limit: 1,
        },
      });
      if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        const label = String((res.data[0] as Record<string, unknown>)[df] ?? '');
        currentLabel = label;
        query = label;
      }
    } catch (_) {}
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function handleInput(e: Event) {
    const q = (e.target as HTMLInputElement).value;
    query = q;
    if (!q.trim()) {
      options = [];
      open = false;
      clearTimeout(debounceTimer);
      return;
    }
    open = true;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => _search(q), 300);
  }

  async function _search(q: string) {
    const df = displayField;
    const sf = searchFields;
    if (!fkTarget || !df || sf.length === 0) return;

    searching = true;
    try {
      const filterConditions = sf.length === 1
        ? { column: sf[0], op: 'ilike', value: `%${q}%` }
        : { op: 'or', conditions: sf.map(f => ({ column: f, op: 'ilike', value: `%${q}%` })) };

      const res = await api.endpoint('query', {
        format: 'records',
        query: {
          table: fkTarget,
          columns: [fkPkField, df],
          filters: { conditions: filterConditions },
          limit: 10,
        },
      });
      if (res.status === 'success' && Array.isArray(res.data)) {
        options = res.data.map((r) => {
          const row = r as Record<string, unknown>;
          return { id: row[fkPkField], label: String(row[df] ?? '') };
        });
      }
    } finally {
      searching = false;
    }
  }

  function selectOption(opt: { id: unknown; label: string }) {
    currentLabel = opt.label;
    query = opt.label;
    options = [];
    open = false;
    highlighted = -1;
    onchange(opt.id);
    onblur?.();
  }

  function clearValue() {
    currentLabel = '';
    query = '';
    options = [];
    open = false;
    highlighted = -1;
    onchange(null);
    onblur?.();
  }

  // Total navigable items: options + "Search more…"
  function totalItems() { return options.length + 1; }

  function scrollHighlightedIntoView() {
    if (!listEl || highlighted < 0) return;
    const items = listEl.querySelectorAll<HTMLElement>('[role="option"]');
    items[highlighted]?.scrollIntoView({ block: 'nearest' });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      open = false;
      highlighted = -1;
      query = currentLabel;
      onblur?.();
      return;
    }

    if (e.key === 'Tab') {
      open = false;
      highlighted = -1;
      query = currentLabel;
      // let Tab propagate for focus advance
      return;
    }

    if (!open) {
      // Open on ArrowDown/Up when closed
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (query.trim()) open = true;
      }
      // Enter on closed dropdown with no selection: dispatch df:enter for form focus advance
      if (e.key === 'Enter') {
        e.preventDefault();
        (e.currentTarget as HTMLElement).dispatchEvent(
          new CustomEvent('df:enter', { bubbles: true })
        );
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlighted = highlighted < totalItems() - 1 ? highlighted + 1 : 0;
      scrollHighlightedIntoView();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlighted = highlighted > 0 ? highlighted - 1 : totalItems() - 1;
      scrollHighlightedIntoView();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted === options.length) {
        // "Search more…" is highlighted
        openPicker();
      } else if (highlighted >= 0 && highlighted < options.length) {
        selectOption(options[highlighted]);
      }
      return;
    }
  }

  function handleBlur() {
    setTimeout(() => {
      open = false;
      highlighted = -1;
      query = currentLabel;
      onblur?.();
    }, 150);
  }

  function openPicker() {
    open = false;
    if (!fkTarget) return;
    // Snapshot derived values at push time — closures must not access $derived inside async.
    const _table   = fkTarget;
    const _pkField = fkPkField;
    const _df      = displayField;
    stack.push(
      FKPickerView,
      { table: _table, title: `Select ${field.label ?? _table}` },
      (row: unknown) => {
        if (!row || typeof row !== 'object') return;
        const r = row as Record<string, unknown>;
        const id = r[_pkField];
        if (id == null) return;
        // Show id immediately so the field is never visually empty on return.
        currentLabel = String(id);
        query = String(id);
        onchange(id);
        // Then replace with the real label (row may lack virtual display fields).
        if (_df) _loadLabel(id, _table, _pkField, _df);
      }
    );
  }
</script>

{#if readonly}
  <span
    class="block rounded-btn border px-3 py-2 text-sm"
    style="border-color: var(--cf-border); background: var(--cf-surface-subtle); color: var(--cf-text)"
  >
    {currentLabel || '—'}
  </span>

{:else}
  <div class="relative">
    <input
      bind:this={inputEl}
      type="text"
      class="input w-full pr-16 {field.error ? 'input-error' : ''}"
      placeholder={field.placeholder as string | undefined ?? _('Search…')}
      value={query}
      oninput={handleInput}
      onkeydown={handleKeydown}
      onblur={handleBlur}
      aria-label={field.label ?? field.name}
      aria-autocomplete="list"
    />

    <!-- Clear (×) — shown when a value is selected -->
    {#if currentLabel}
      <button
        type="button"
        tabindex="-1"
        class="absolute right-8 top-1/2 -translate-y-1/2 p-1"
        style="color: var(--cf-text-subtle)"
        onmousedown={(e) => { e.preventDefault(); clearValue(); }}
        aria-label={_('Clear selection')}
      >
        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    {/if}

    <!-- Chevron -->
    <button
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 p-1"
      style="color: var(--cf-text-subtle)"
      onmousedown={(e) => e.preventDefault()}
      onclick={() => { open = !open; if (open) inputEl?.focus(); }}
      aria-label={_('Select')}
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- Dropdown -->
    {#if open}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md shadow-lg"
        style="top: 100%; border: 1px solid var(--cf-border); background: var(--cf-surface)"
        onmousedown={(e) => e.preventDefault()}
      >
        <ul bind:this={listEl} class="max-h-48 overflow-auto py-1" role="listbox">
          {#if searching}
            <li class="px-3 py-2 text-sm" style="color: var(--cf-text-subtle)">{_('Searching…')}</li>
          {:else if options.length === 0 && query.trim()}
            <li class="px-3 py-2 text-sm" style="color: var(--cf-text-subtle)">{_('No results')}</li>
          {:else}
            {#each options as opt, i (opt.id)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <li
                role="option"
                aria-selected={String(value) === String(opt.id)}
                class="cursor-pointer px-3 py-2 text-sm
                       {highlighted === i ? 'bg-blue-50' : 'hover:bg-blue-50'}
                       {String(value) === String(opt.id) ? 'font-semibold text-brand' : ''}"
                onclick={() => selectOption(opt)}
              >
                {opt.label}
              </li>
            {/each}
          {/if}
        </ul>

        <!-- Search more… -->
        <div style="border-top: 1px solid var(--cf-border-subtle, var(--cf-border))">
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <div
            role="option"
            aria-selected="false"
            tabindex="-1"
            class="cursor-pointer px-3 py-2 text-xs
                   {highlighted === options.length ? 'bg-blue-50' : 'hover:bg-gray-50'}"
            style="color: var(--cf-text-subtle)"
            onclick={openPicker}
          >
            {_('Search more…')}
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}
