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
    title?: string;
  }

  let { table, page, title = '' }: Props = $props();

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

  function handleEvent(name: string, data: unknown) {
    if (name === 'row_dblclick' || name === 'row_accept') {
      stack.pop(data);
    } else if (name === 'row_cancel') {
      stack.pop(null);
    }
  }
</script>

<div class="cf-form-view">
  <div class="cf-form-view-header">
    <button
      class="cf-form-view-back"
      onclick={() => stack.pop(null)}
      title={_('Cancel')}
      aria-label={_('Cancel')}
    >←</button>
    {#if shownTitle}
      <h2 class="cf-form-view-title">{shownTitle}</h2>
    {/if}
  </div>
  <div class="cf-form-view-body">
    {#if loaded}
      <DataView view={viewDescriptor} onEvent={handleEvent} />
    {/if}
  </div>
</div>
