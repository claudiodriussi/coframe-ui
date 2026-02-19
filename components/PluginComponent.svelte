<script lang="ts">
  /**
   * Generic wrapper that loads a plugin component by ID and renders it.
   * Any extra props (including callback functions) are forwarded to the component.
   *
   * Usage:
   *   <PluginComponent
   *     loader={pluginLoader}
   *     componentId="library.hello"
   *     message="Hi"
   *     onAction={(data) => handleAction(data)}
   *   />
   */

  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import type { PluginLoader } from '$coframe/plugins/types';

  interface Props {
    componentId: string;
    loader: PluginLoader;
    [key: string]: unknown;
  }

  let { componentId, loader, ...props }: Props = $props();

  let LoadedComponent = $state<Component | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      LoadedComponent = (await loader.loadComponent(componentId)) as Component | null;
      if (!LoadedComponent) {
        error = `Component "${componentId}" not found in registry`;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  });
</script>

{#if loading}
  <div class="flex items-center gap-2 p-4 text-sm text-gray-500">
    <div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
    Loading {componentId}…
  </div>
{:else if error}
  <div class="rounded border border-red-200 bg-red-50 p-4 text-sm">
    <p class="font-medium text-red-800">Plugin load error</p>
    <p class="mt-1 font-mono text-xs text-red-600">{error}</p>
  </div>
{:else if LoadedComponent}
  <LoadedComponent {...props} />
{/if}
