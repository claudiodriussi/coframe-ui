<script lang="ts">
  import SplitPane from './SplitPane.svelte';
  import ViewRenderer from './ViewRenderer.svelte';

  interface SplitArea {
    id: string;
    pos?: 'left' | 'right' | 'top' | 'bottom';
    width?: number;
    [key: string]: unknown;
  }

  interface Panel {
    title?: string;
    content?: Record<string, unknown>;
    panels?: SplitArea[];
  }

  interface Props {
    panel: Panel;
  }

  let { panel }: Props = $props();

  // For now: support a single right/left split.
  // Multiple splits or top/bottom can be added later.
  const split = $derived(panel.panels?.[0] as SplitArea | undefined);
  const splitWidth = $derived(split?.width ?? 300);

  // SplitPane works in percentages — convert the fixed pixel hint to a rough %
  // using 1200px as reference viewport width.
  const REF_WIDTH = 1200;
  const sidePercent = $derived(Math.round((splitWidth / REF_WIDTH) * 100));
  const mainPercent = $derived(100 - sidePercent);

  const isRight = $derived(!split || split.pos === 'right');
</script>

<div class="flex h-full flex-col">
  {#if panel.title}
    <div class="border-b border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700">
      {panel.title}
    </div>
  {/if}

  <div class="min-h-0 flex-1">
    {#if split}
      <SplitPane
        direction="horizontal"
        defaultSizes={isRight ? [mainPercent, sidePercent] : [sidePercent, mainPercent]}
        minSize={120}
        gutterSize={5}
        collapseTarget={isRight ? 'b' : 'a'}
        storageKey="panel-{panel.title ?? 'default'}"
      >
        {#snippet a()}
          {#if isRight}
            <div class="h-full overflow-hidden p-2">
              {#if panel.content}
                <ViewRenderer view={panel.content} />
              {/if}
            </div>
          {:else}
            <div class="h-full overflow-hidden p-2">
              <ViewRenderer view={split} />
            </div>
          {/if}
        {/snippet}
        {#snippet b()}
          {#if isRight}
            <div class="h-full overflow-hidden p-2">
              <ViewRenderer view={split} />
            </div>
          {:else}
            <div class="h-full overflow-hidden p-2">
              {#if panel.content}
                <ViewRenderer view={panel.content} />
              {/if}
            </div>
          {/if}
        {/snippet}
      </SplitPane>
    {:else}
      <div class="h-full overflow-hidden p-2">
        {#if panel.content}
          <ViewRenderer view={panel.content} />
        {/if}
      </div>
    {/if}
  </div>
</div>
