<script lang="ts">
  import { api } from '$coframe/api/client';
  import PanelRenderer from '$coframe/components/PanelRenderer.svelte';
  import Panel from '$coframe/components/Panel.svelte';

  let panel = $state<Record<string, unknown> | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);

  async function loadPanel() {
    try {
      const res = await api.endpoint('get_page', { id: 'book_with_reviews' });
      if (res.status === 'success') {
        panel = res.data as Record<string, unknown>;
      } else {
        error = res.message ?? 'Unknown error';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  $effect(() => { loadPanel(); });
</script>

<div class="flex h-full flex-col gap-3">

  <div class="flex-shrink-0 space-y-1">
    <h1 class="text-2xl font-semibold">Trigger System</h1>
    <p class="text-sm text-gray-500">
      Click or navigate (↑↓) the book list — the right and bottom panels
      react via <code class="rounded bg-gray-100 px-1">row_click</code> trigger.
      Collapse either panel with the gutter button: it stops receiving data while hidden.
    </p>
  </div>

  <div class="flex-1 min-h-0 overflow-hidden rounded border border-gray-200 shadow-sm">
    {#if loading}
      <div class="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
        <div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        Loading…
      </div>

    {:else if error}
      <div class="flex h-full items-center justify-center p-4">
        <div class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Error:</strong> {error}
        </div>
      </div>

    {:else if panel}
      <Panel class="h-full">
        <PanelRenderer {panel} />
      </Panel>
    {/if}
  </div>

  <a href="/playground" class="flex-shrink-0 text-sm text-blue-600 hover:underline">← Playground</a>

</div>
