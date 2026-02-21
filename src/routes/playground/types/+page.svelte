<script lang="ts">
  import { onMount } from 'svelte';
  import {
    typeSchema,
    resolveWidget,
    BASE_WIDGET_MAP,
    type TypeInfo,
  } from '$coframe/api/typeSchema.svelte';
  import { authStore } from '$coframe/auth/store.svelte';

  onMount(() => authStore.checkAuth());

  let filter       = $state('');
  let selectedType = $state<string | null>(null);

  // ── Filtered + sorted type list (reactive on typeSchema.types + filter) ───
  const filteredEntries = $derived(
    Object.entries(typeSchema.types)
      .filter(([name]) =>
        !filter || name.toLowerCase().includes(filter.toLowerCase()),
      )
      .sort(([a], [b]) => a.localeCompare(b)),
  );

  const selectedInfo = $derived<TypeInfo | null>(
    selectedType ? (typeSchema.types[selectedType] ?? null) : null,
  );

  const selectedWidget = $derived(
    selectedType ? resolveWidget(selectedType, typeSchema.types) : undefined,
  );

  // Full chain label: "Price → Money → Numeric"
  function chainLabel(name: string, info: TypeInfo): string {
    return [name, ...info.inheritance].join(' → ');
  }

  // ── Widget badge styling (inline styles — avoids Tailwind class scanning) ─
  const WIDGET_STYLE: Record<string, string> = {
    text:            'background:#f3f4f6;color:#374151',
    textarea:        'background:#ede9fe;color:#5b21b6',
    number:          'background:#dbeafe;color:#1d4ed8',
    checkbox:        'background:#d1fae5;color:#065f46',
    'datetime-local':'background:#fed7aa;color:#9a3412',
    date:            'background:#fed7aa;color:#9a3412',
    time:            'background:#fed7aa;color:#9a3412',
    json:            'background:#fef3c7;color:#92400e',
    currency:        'background:#e0e7ff;color:#3730a3',
    password:        'background:#fee2e2;color:#991b1b',
    email:           'background:#e0f2fe;color:#0369a1',
    tel:             'background:#f9fafb;color:#4b5563',
    url:             'background:#e0f2fe;color:#0369a1',
    color:           'background:#fce7f3;color:#9d174d',
    filepath:        'background:#fef3c7;color:#92400e',
    markdown:        'background:#ede9fe;color:#5b21b6',
    file:            'background:#fef3c7;color:#92400e',
  };

  function widgetStyle(widget: string | undefined): string {
    if (!widget) return 'background:#f9fafb;color:#9ca3af;font-style:italic';
    return WIDGET_STYLE[widget] ?? 'background:#f3f4f6;color:#374151';
  }

  // ── Status helpers ────────────────────────────────────────────────────────
  const statusDotStyle = $derived(
    typeSchema.loading ? 'background:#f59e0b' :
    typeSchema.error   ? 'background:#ef4444' :
    typeSchema.loaded  ? 'background:#22c55e' :
                         'background:#d1d5db',
  );

  const statusText = $derived(
    typeSchema.loading
      ? 'caricamento in corso…'
      : typeSchema.error
        ? `errore: ${typeSchema.error}`
        : typeSchema.loaded
          ? `${Object.keys(typeSchema.types).length} tipi caricati${typeSchema.withBuiltin ? ' (+ builtin)' : ''}`
          : 'non caricato — premi un pulsante per avviare il fetch',
  );
</script>

<div class="space-y-6">

  <!-- ── Header ─────────────────────────────────────────────────────────── -->
  <div>
    <h1 class="mb-1 text-2xl font-bold text-gray-800">Type Schema</h1>
    <p class="text-sm text-gray-500">
      Caricamento <strong>lazy</strong> da <code class="rounded bg-gray-100 px-1 text-xs">POST /endpoint/get_type_schema</code>.
      Apri la console per vedere ogni step: skip, fetch, dati raw.
    </p>
  </div>

  <!-- ── Auth warning ──────────────────────────────────────────────────── -->
  {#if !authStore.isAuthenticated}
    <div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <strong>Autenticazione richiesta.</strong>
      Gli endpoint Coframe richiedono un JWT valido.
      <a href="/playground/api" class="ml-1 font-medium underline hover:text-amber-900">
        Vai alla pagina API per fare il login →
      </a>
    </div>
  {/if}

  <!-- ── Status + buttons ───────────────────────────────────────────────── -->
  <div class="card flex flex-wrap items-center gap-4">
    <!-- Status dot + text -->
    <div class="flex flex-1 items-center gap-2">
      <span
        class="inline-block h-2.5 w-2.5 rounded-full"
        style={statusDotStyle}
      ></span>
      <span class="text-sm text-gray-600">{statusText}</span>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-2">
      <button
        class="btn btn-primary"
        disabled={typeSchema.loading || !authStore.isAuthenticated}
        onclick={() => typeSchema.load(false)}
      >
        {typeSchema.loading ? '⏳' : '↓'} Carica tipi
      </button>
      <button
        class="btn btn-secondary"
        disabled={typeSchema.loading || !authStore.isAuthenticated}
        onclick={() => typeSchema.load(true)}
      >
        + Builtin
      </button>
      <button
        class="btn"
        disabled={typeSchema.loading || !typeSchema.loaded}
        onclick={() => { typeSchema.reset(); selectedType = null; filter = ''; }}
      >
        Reset
      </button>
    </div>
  </div>

  <!-- ── Lazy behaviour explanation ────────────────────────────────────────  -->
  {#if authStore.isAuthenticated && !typeSchema.loaded && !typeSchema.loading && !typeSchema.error}
    <div class="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-700">
      <strong>Comportamento lazy:</strong> lo schema non viene caricato al mount della pagina.
      Il primo click su <em>Carica tipi</em> esegue il fetch. I click successivi sono no-op
      (vedi console). <em>Reset</em> svuota la cache così il prossimo load ri-fetcha.
    </div>
  {/if}

  <!-- ── Table + filter (shown only when loaded) ───────────────────────── -->
  {#if typeSchema.loaded}
    <div class="space-y-3">

      <!-- Filter -->
      <div class="flex items-center gap-3">
        <input
          class="input w-64"
          placeholder="Filtra per nome…"
          bind:value={filter}
        />
        <span class="text-xs text-gray-400">
          {filteredEntries.length} / {Object.keys(typeSchema.types).length}
        </span>
      </div>

      <!-- Table -->
      <div class="overflow-auto rounded-xl border border-gray-200">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th class="px-4 py-2">Nome</th>
              <th class="px-4 py-2">Base</th>
              <th class="px-4 py-2">Catena</th>
              <th class="px-4 py-2">Widget</th>
              <th class="px-4 py-2">Python</th>
              <th class="px-4 py-2">Attrs</th>
            </tr>
          </thead>
          <tbody>
            {#each filteredEntries as [name, info] (name)}
              {@const widget = resolveWidget(name, typeSchema.types)}
              <tr
                class="cursor-pointer border-b border-gray-100 transition-colors last:border-0
                       {selectedType === name ? 'bg-blue-50' : 'hover:bg-gray-50'}"
                onclick={() => selectedType = selectedType === name ? null : name}
              >
                <!-- Nome -->
                <td class="px-4 py-2">
                  <span class="font-mono font-semibold text-gray-800">{name}</span>
                </td>

                <!-- Base (nearest parent) -->
                <td class="px-4 py-2">
                  {#if info.base}
                    <span class="font-mono text-gray-500">{info.base}</span>
                  {:else}
                    <span class="text-gray-300">—</span>
                  {/if}
                </td>

                <!-- Catena completa -->
                <td class="px-4 py-2">
                  <span class="font-mono text-xs text-gray-400">{chainLabel(name, info)}</span>
                </td>

                <!-- Widget (resolved) -->
                <td class="px-4 py-2">
                  <span
                    class="inline-block rounded px-1.5 py-0.5 text-xs font-medium"
                    style={widgetStyle(widget)}
                  >
                    {widget ?? 'n/d'}
                  </span>
                </td>

                <!-- Python type -->
                <td class="px-4 py-2">
                  <span class="font-mono text-xs text-gray-400">{info.python_type ?? '—'}</span>
                </td>

                <!-- Attr badges -->
                <td class="px-4 py-2">
                  <div class="flex flex-wrap gap-1">
                    {#if info.primary_key}
                      <span class="badge badge-success">PK</span>
                    {/if}
                    {#if info.nullable === false}
                      <span class="badge badge-danger">NOT NULL</span>
                    {/if}
                    {#if info.nullable === true}
                      <span class="badge badge-neutral">nullable</span>
                    {/if}
                    {#if info.unique}
                      <span class="badge badge-neutral">unique</span>
                    {/if}
                    {#if info.index}
                      <span class="badge badge-neutral">index</span>
                    {/if}
                    {#if info.autoincrement}
                      <span class="badge badge-neutral">auto</span>
                    {/if}
                    {#if info.columns}
                      <span class="badge badge-neutral">composite({info.columns.length})</span>
                    {/if}
                    {#if info.length}
                      <span class="badge badge-neutral">len:{info.length}</span>
                    {/if}
                    {#if info.scale !== undefined}
                      <span class="badge badge-neutral">scale:{info.scale}</span>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}

            {#if filteredEntries.length === 0}
              <tr>
                <td colspan="6" class="px-4 py-6 text-center text-sm text-gray-400">
                  Nessun tipo corrisponde al filtro "{filter}"
                </td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>

      <!-- ── Detail card ──────────────────────────────────────────────── -->
      {#if selectedType && selectedInfo}
        <div class="card">
          <div class="mb-3 flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="font-mono text-lg font-bold text-gray-800">{selectedType}</span>
              {#if selectedInfo.label}
                <span class="text-sm text-gray-400">{selectedInfo.label}</span>
              {/if}
              <span
                class="inline-block rounded px-2 py-0.5 text-xs font-medium"
                style={widgetStyle(selectedWidget)}
              >
                widget: {selectedWidget ?? 'n/d'}
              </span>
            </div>
            <button
              class="text-sm text-gray-400 hover:text-gray-600"
              onclick={() => selectedType = null}
            >✕</button>
          </div>

          <!-- Inheritance chain visualised -->
          {#if selectedInfo.inheritance.length > 0}
            <div class="mb-3 flex flex-wrap items-center gap-1 text-xs">
              <span class="font-mono font-semibold text-blue-700">{selectedType}</span>
              {#each selectedInfo.inheritance as ancestor}
                <span class="text-gray-400">→</span>
                <span
                  class="font-mono {typeSchema.types[ancestor] ? 'text-gray-600' : 'text-orange-500'}"
                  title={typeSchema.types[ancestor] ? 'tipo custom' : 'tipo SQLAlchemy builtin'}
                >{ancestor}</span>
              {/each}
            </div>
          {/if}

          <!-- Composite columns -->
          {#if selectedInfo.columns?.length}
            <div class="mb-3">
              <div class="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                Colonne composite
              </div>
              <div class="overflow-auto rounded border border-gray-200">
                <table class="w-full text-xs">
                  <thead>
                    <tr class="border-b bg-gray-50 text-left text-gray-500">
                      <th class="px-3 py-1.5">name</th>
                      <th class="px-3 py-1.5">type</th>
                      <th class="px-3 py-1.5">nullable</th>
                      <th class="px-3 py-1.5">default</th>
                      <th class="px-3 py-1.5">label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each selectedInfo.columns as col}
                      <tr class="border-b border-gray-100 last:border-0">
                        <td class="px-3 py-1.5 font-mono font-semibold">{col.name}</td>
                        <td class="px-3 py-1.5 font-mono text-gray-500">{col.type ?? '—'}</td>
                        <td class="px-3 py-1.5 text-gray-500">{col.nullable ?? '—'}</td>
                        <td class="px-3 py-1.5 text-gray-500">{col.default ?? '—'}</td>
                        <td class="px-3 py-1.5 text-gray-500">{col.label ?? '—'}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </div>
          {/if}

          <!-- Raw JSON -->
          <div class="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
            Raw (anche in console)
          </div>
          <pre class="overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-green-300"
          >{JSON.stringify(selectedInfo, null, 2)}</pre>
        </div>
      {/if}
    </div>
  {/if}

  <!-- ── BASE_WIDGET_MAP reference ─────────────────────────────────────── -->
  <div class="card">
    <h2 class="mb-3 text-sm font-semibold text-gray-700">
      BASE_WIDGET_MAP — tabella di transcodifica client
    </h2>
    <p class="mb-3 text-xs text-gray-500">
      Il server è client-agnostico e non inferisce widget per i tipi SQLAlchemy base.
      Questa mappa client-side è il fallback finale nella catena di risoluzione:
      <em>widget YAML proprio → widget YAML antenato → BASE_WIDGET_MAP → undefined</em>.
    </p>
    <div class="grid grid-cols-2 gap-1 sm:grid-cols-3 md:grid-cols-4">
      {#each Object.entries(BASE_WIDGET_MAP) as [sqlType, widget]}
        <div class="flex items-center gap-2 rounded border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs">
          <span class="font-mono font-semibold text-gray-700">{sqlType}</span>
          <span class="text-gray-400">→</span>
          <span
            class="inline-block rounded px-1.5 py-0.5 font-medium"
            style={widgetStyle(widget)}
          >{widget}</span>
        </div>
      {/each}
    </div>
  </div>

</div>
