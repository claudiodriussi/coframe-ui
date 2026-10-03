<script lang="ts">
  /**
   * FKPickerView.svelte — stack page for FK field selection.
   *
   * Shows the list page of the target table (`page`) as written, in 'lookup'
   * mode: add/edit/delete work normally. Without such a page it falls back to a
   * view built from the table's first columns.
   * Selection gestures (double-click, Enter, Accept ✓) pop the stack
   * with the selected row. Cancel (×) or ← pop with null.
   */
  import { getContext, onMount } from 'svelte';
  import { api } from '$coframe/api/client';
  import { pickerView } from './lookup';
  import type { RuleRow } from './dataview.rules';
  import { _ } from '../i18n';
  import { stack as globalStack } from '$coframe/stack/stack.svelte';
  import type { StackInstance } from '$coframe/stack/stack.svelte';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';
  import DataView from './DataView.svelte';
  import type { ViewDescriptor } from './dataview.types';

  const stack = getContext<StackInstance>('cf:stack') ?? globalStack;

  interface Props {
    table: string;
    /** Page id of the list to pick from. */
    page?: string;
    /** What the field's search starts from: rules the user may remove. */
    rules?: RuleRow[];
    /** The field's current value: the row the grid opens on, when loaded. */
    current?: unknown;
    title?: string;
  }

  let { table, page, rules, current, title = '' }: Props = $props();

  /** The page's view; null until loaded, or when the page offers no table. */
  let pageView = $state<ViewDescriptor | null>(null);
  let pageTitle = $state('');
  let loaded = $state(false);

  onMount(async () => {
    if (page) {
      try {
        const res = await api.endpoint('get_page', { id: page });
        if (res.status === 'success') {
          pageView = pickerView(res.data);
          pageTitle = String((res.data as { title?: unknown })?.title ?? '');
        }
      } catch (_) {}
    }
    loaded = true;
  });

  let columns = $derived.by(() => {
    const info = serverConfig.tables[table];
    if (!info) return [];
    return info.columns
      .filter(c => !c.virtual && !c.secret)
      .slice(0, 6)
      .map(c => ({ field: c.name, title: c.label ?? c.name }));
  });

  let fallbackView = $derived<ViewDescriptor>({
    type: 'table',
    source: { model: table },
    columns: columns.length > 0 ? columns : undefined,
    navigator: { mode: 'lookup' },
  });

  let viewDescriptor = $derived(pageView ?? fallbackView);
  let shownTitle = $derived(pageTitle || title);

  /**
   * Escape leaves without choosing, from anywhere in the page — unless something
   * inside has already answered it: the search box clearing its text, the grid
   * cancelling on its own.
   */
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && !e.defaultPrevented) {
      e.stopPropagation();
      stack.pop(null);
    }
  }

  function handleEvent(name: string, data: unknown) {
    if (name === 'row_dblclick' || name === 'row_accept') {
      stack.pop(data);
    } else if (name === 'row_cancel') {
      stack.pop(null);
    }
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="cf-picker" onkeydown={handleKey}>
  <div class="cf-picker-header">
    <button
      class="cf-picker-back"
      onclick={() => stack.pop(null)}
      title={_('Cancel')}
      aria-label={_('Cancel')}
    >←</button>
    {#if shownTitle}
      <h2 class="cf-picker-title">{shownTitle}</h2>
    {/if}
  </div>
  <div class="cf-picker-body">
    {#if loaded}
      <DataView
        view={viewDescriptor}
        initialRules={rules}
        focusRowId={current ?? undefined}
        autofocus
        onEvent={handleEvent}
      />
    {/if}
  </div>
</div>

<!-- The page fills the stack and the grid fills the page: Tabulator measures its
     container, and one that grows with its content leaves nothing to scroll. -->
<style>
  .cf-picker {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--cf-bg);
  }

  .cf-picker-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    border-bottom: 1px solid var(--cf-border);
    background: var(--cf-surface);
    flex-shrink: 0;
  }

  .cf-picker-back {
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    background: none;
    border-radius: 0.25rem;
    color: var(--cf-text-subtle);
    cursor: pointer;
  }

  .cf-picker-back:hover {
    background: var(--cf-surface-hover);
    color: var(--cf-text);
  }

  .cf-picker-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--cf-text);
    margin: 0;
  }

  .cf-picker-body {
    flex: 1;
    min-height: 0;
  }
</style>
