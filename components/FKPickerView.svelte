<script lang="ts">
  /**
   * FKPickerView.svelte — stack page for FK field selection.
   *
   * Full DataView in 'lookup' mode: add/edit/delete work normally.
   * Selection gestures (double-click, Enter, Accept ✓) pop the stack
   * with the selected row. Cancel (×) or ← pop with null.
   */
  import { stack } from '$coframe/stack/stack.svelte';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';
  import DataView from './DataView.svelte';
  import type { ViewDescriptor } from './dataview.types';

  interface Props {
    table: string;
    title?: string;
  }

  let { table, title = '' }: Props = $props();

  let columns = $derived.by(() => {
    const info = serverConfig.tables[table];
    if (!info) return [];
    return info.columns
      .filter(c => !c.virtual && !c.secret)
      .slice(0, 6)
      .map(c => ({ field: c.name, title: c.label ?? c.name }));
  });

  let viewDescriptor = $derived<ViewDescriptor>({
    type: 'table',
    source: { model: table },
    columns: columns.length > 0 ? columns : undefined,
    navigator: { mode: 'lookup' },
  });

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
      title="Annulla"
      aria-label="Annulla"
    >←</button>
    {#if title}
      <h2 class="cf-form-view-title">{title}</h2>
    {/if}
  </div>
  <div class="cf-form-view-body">
    <DataView view={viewDescriptor} onEvent={handleEvent} />
  </div>
</div>
