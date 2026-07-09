<script lang="ts">
  import { api } from '$coframe/api/client';
  import PanelRenderer from '$coframe/components/PanelRenderer.svelte';
  import Panel from '$coframe/components/Panel.svelte';

  let panel = $state<Record<string, unknown> | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);

  async function loadPanel() {
    try {
      const res = await api.endpoint('get_page', { id: 'book_demo_nested' });
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

  <div class="flex-shrink-0">
    <h1 class="text-2xl font-semibold">Panel Nested Splits</h1>
    <p class="mt-0.5 text-xs text-gray-500">
      Stress test: split annidati nelle aree laterali.
      L'area <strong>right</strong> contiene uno split top/bottom;
      l'area <strong>bottom</strong> contiene uno split left/right.
    </p>
  </div>

  {#if panel}
    <details class="flex-shrink-0">
      <summary class="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
        raw descriptor — book_demo_nested
      </summary>
      <pre class="mt-2 max-h-48 overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-600"
        >{JSON.stringify(panel, null, 2)}</pre>
    </details>
  {/if}

  <div class="flex-1 min-h-0 overflow-hidden rounded border border-gray-200 shadow-sm">
    {#if loading}
      <div class="flex h-full items-center justify-center gap-2 text-sm text-gray-500">
        <div class="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        Loading panel…
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
