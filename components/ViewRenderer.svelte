<script lang="ts">
  import PluginComponent from './PluginComponent.svelte';
  import DataView from './DataView.svelte';
  import type { ViewDescriptor } from './DataView.svelte';
  import { pluginLoader } from '$app-plugins/registry';

  interface Props {
    view: Record<string, unknown>;
    trigger?: Record<string, unknown>;
    collapsed?: boolean;
    onEvent?: (name: string, data: unknown) => void;
  }

  let { view, trigger, collapsed, onEvent }: Props = $props();
</script>

{#if view.type === 'plugin'}
  <PluginComponent
    loader={pluginLoader}
    componentId={view.component as string}
    {...(view.props as Record<string, unknown> ?? {})}
  />

{:else if view.type === 'table' || view.type === 'tree'}
  <DataView
    view={view as ViewDescriptor}
    trigger={trigger}
    collapsed={collapsed}
    onEvent={onEvent}
  />

{:else}
  <div class="flex h-full items-center justify-center text-sm text-gray-400">
    view type <code class="mx-1 rounded bg-gray-100 px-1">{view.type}</code> not yet implemented
  </div>
{/if}
