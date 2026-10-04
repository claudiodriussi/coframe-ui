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
  import { api } from '$kitebase/api/client';
  import { pickerView } from './lookup';
  import type { RuleRow } from './dataview.rules';
  import { _ } from '../i18n';
  import { stack as globalStack } from '$kitebase/stack/stack.svelte';
  import type { StackInstance } from '$kitebase/stack/stack.svelte';
  import { serverConfig } from '$kitebase/api/serverConfig.svelte';
  import DataView from './DataView.svelte';
  import type { ViewDescriptor } from './dataview.types';

  const stack = getContext<StackInstance>('kb:stack') ?? globalStack;

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
<div class="kb-picker" onkeydown={handleKey}>
  <div class="kb-picker-header">
    <button
      class="kb-picker-back"
      onclick={() => stack.pop(null)}
      title={_('Cancel')}
      aria-label={_('Cancel')}
    >←</button>
    {#if shownTitle}
      <h2 class="kb-picker-title">{shownTitle}</h2>
    {/if}
  </div>
  <div class="kb-picker-body">
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
  .kb-picker {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--kb-bg);
  }

  .kb-picker-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    border-bottom: 1px solid var(--kb-border);
    background: var(--kb-surface);
    flex-shrink: 0;
  }

  .kb-picker-back {
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    background: none;
    border-radius: 0.25rem;
    color: var(--kb-text-subtle);
    cursor: pointer;
  }

  .kb-picker-back:hover {
    background: var(--kb-surface-hover);
    color: var(--kb-text);
  }

  .kb-picker-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--kb-text);
    margin: 0;
  }

  .kb-picker-body {
    flex: 1;
    min-height: 0;
  }
</style>
