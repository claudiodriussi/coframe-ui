<script lang="ts">
  /**
   * FKPickerView.svelte — stack page for FK field selection.
   *
   * Pushed onto the stack by WidgetFKCombobox when the user clicks "Cerca altro…".
   * Builds columns from serverConfig, shows DataView in read-only mode.
   * On row double-click, pops the stack with the selected row.
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
    navigator: false,
  });

  function handleEvent(name: string, data: unknown) {
    if (name === 'row_dblclick') stack.pop(data);
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
    <span class="ml-auto text-xs" style="color: var(--cf-text-subtle)">
      Doppio click per selezionare
    </span>
  </div>
  <div class="cf-form-view-body">
    <DataView view={viewDescriptor} onEvent={handleEvent} />
  </div>
</div>
