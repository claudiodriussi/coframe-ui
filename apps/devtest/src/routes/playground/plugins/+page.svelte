<script lang="ts">
  /**
   * Plugin system demo.
   *
   * Demonstrates:
   * 1. Dynamic component loading from the registry
   * 2. Callback props — the host page wires local Svelte functions into plugin components
   * 3. Server-driven composition pattern (simulated here in-page)
   *
   * In a real app the server returns { component: 'library.hello', callbacks: { onAction: 'handleSave' } }
   * and the host page maps callback names → local functions before passing them to PluginComponent.
   */

  import { onMount } from 'svelte';
  import PluginComponent from '$coframe/components/PluginComponent.svelte';
  import { pluginLoader } from '$app-plugins/registry';
  import type { PluginComponentMeta } from '$coframe/plugins/types';

  let available = $state<PluginComponentMeta[]>([]);
  let selected = $state<string | null>(null);
  let propsMsg = $state('Testing from playground!');
  let propsUser = $state('Developer');

  // Callback log — captures events fired by plugin components
  interface CallbackEvent {
    component: string;
    event: unknown;
    ts: string;
  }
  let callbackLog = $state<CallbackEvent[]>([]);

  // This is the local Svelte function the plugin will call back into.
  // It has full access to page-local state, routing, stores, etc.
  function handlePluginAction(data: unknown) {
    callbackLog = [
      { component: selected ?? '?', event: data, ts: new Date().toLocaleTimeString() },
      ...callbackLog
    ];
  }

  // Simulates server-driven composition:
  // server says "use this component with these callbacks" →
  // host resolves callback names → local functions → passes as props
  const serverConfig = {
    component: 'library.hello',
    props: { message: 'Loaded from server config', userName: 'Server User' },
    callbacks: { onAction: handlePluginAction } // ← key pattern
  };

  onMount(() => {
    available = pluginLoader.getAvailableComponents();
    if (available.length > 0) selected = available[0].id;

    (window as any).pluginTest = { pluginLoader, available };
    console.log('Plugin test utilities → window.pluginTest');
  });
</script>

<h1 class="mb-6 text-2xl font-semibold">Plugin System Test</h1>

<!-- Status -->
<section class="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
  <h2 class="mb-3 text-lg font-medium">Registry Status</h2>
  <div class="flex gap-6 text-sm">
    <span><span class="font-medium">Registered components:</span> {available.length}</span>
    <span
      ><span class="font-medium">Selected:</span>
      <span class="text-blue-600">{selected ?? 'none'}</span></span
    >
  </div>
  {#if available.length === 0}
    <p class="mt-2 text-sm text-red-600">
      No components registered. Edit <code>src/app-plugins/registry.ts</code>.
    </p>
  {:else}
    <ul class="mt-3 flex flex-wrap gap-2">
      {#each available as c}
        <button
          onclick={() => (selected = c.id)}
          class="rounded border px-3 py-1 text-sm transition-colors {selected === c.id
            ? 'border-blue-500 bg-blue-50 text-blue-700'
            : 'border-gray-200 hover:border-blue-300'}"
        >
          <span class="font-mono">{c.id}</span>
          <span class="ml-1 text-xs text-gray-400">({c.plugin})</span>
        </button>
      {/each}
    </ul>
  {/if}
</section>

<!-- Interactive demo: manual props + callback wiring -->
{#if selected}
  <section class="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
    <h2 class="mb-3 text-lg font-medium">Interactive — manual props</h2>
    <div class="mb-4 flex max-w-md flex-col gap-3">
      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium">message</span>
        <input
          type="text"
          bind:value={propsMsg}
          class="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
      <label class="flex flex-col gap-1 text-sm">
        <span class="font-medium">userName</span>
        <input
          type="text"
          bind:value={propsUser}
          class="rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
        />
      </label>
    </div>
    <!-- onAction is wired to a local Svelte function — this is the callback pattern -->
    <PluginComponent
      loader={pluginLoader}
      componentId={selected}
      message={propsMsg}
      userName={propsUser}
      onAction={handlePluginAction}
    />
  </section>
{/if}

<!-- Server-driven demo -->
<section class="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-5">
  <h2 class="mb-2 text-lg font-medium text-blue-900">Server-driven composition</h2>
  <p class="mb-4 text-sm text-blue-800">
    Component ID, props and callback names come from the server. The host page maps callback names →
    local Svelte functions. The plugin has no knowledge of the host — it just calls
    <code>props.onAction(data)</code>.
  </p>
  <div class="mb-4 rounded border border-blue-200 bg-white p-3">
    <p class="mb-1 text-xs font-medium uppercase text-gray-500">Server config (simulated)</p>
    <pre class="text-xs text-gray-700">{JSON.stringify(
        { ...serverConfig, callbacks: { onAction: '→ handlePluginAction()' } },
        null,
        2
      )}</pre>
  </div>
  <PluginComponent
    loader={pluginLoader}
    componentId={serverConfig.component}
    {...serverConfig.props}
    onAction={serverConfig.callbacks.onAction}
  />
</section>

<!-- Callback log -->
<section class="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
  <div class="mb-3 flex items-center justify-between">
    <h2 class="text-lg font-medium">Callback log</h2>
    <button
      onclick={() => (callbackLog = [])}
      class="text-xs text-gray-400 hover:text-gray-600"
    >Clear</button>
  </div>
  {#if callbackLog.length === 0}
    <p class="text-sm italic text-gray-400">
      Click "Fire onAction callback" in a component above.
    </p>
  {:else}
    <div class="space-y-2">
      {#each callbackLog as entry}
        <div class="rounded border border-gray-100 bg-gray-50 p-3">
          <div class="mb-1 flex justify-between text-xs text-gray-500">
            <span class="font-mono">{entry.component}</span>
            <span>{entry.ts}</span>
          </div>
          <pre class="text-xs">{JSON.stringify(entry.event, null, 2)}</pre>
        </div>
      {/each}
    </div>
  {/if}
</section>

<!-- Architecture note -->
<section class="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-5 text-sm text-gray-700">
  <h2 class="mb-2 font-medium">Plugin + Callback Architecture</h2>
  <ol class="list-inside list-decimal space-y-1">
    <li>
      <strong>Registry</strong> (<code>src/app-plugins/registry.ts</code>) — maps IDs → dynamic
      imports
    </li>
    <li>
      <strong>PluginComponent</strong> — loads the component lazily, forwards
      <code>...props</code> including callbacks
    </li>
    <li>
      <strong>Plugin component</strong> — declares <code>onAction?: (data) =&gt; void</code> in its
      Props; calls it on user events
    </li>
    <li>
      <strong>Host page</strong> — provides local Svelte functions as callbacks; has full access to
      stores, routing, state
    </li>
    <li>
      <strong>Server config</strong> — names the component ID and which callbacks to wire; host
      resolves names → functions
    </li>
  </ol>
</section>

<a href="/playground" class="text-sm text-blue-600 hover:underline">← Playground</a>
