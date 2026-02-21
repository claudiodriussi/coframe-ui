<script lang="ts">
  import SplitPane from '$coframe/components/SplitPane.svelte';
</script>

<div class="space-y-10">
  <div>
    <h1 class="mb-1 text-2xl font-bold text-gray-800">SplitPane</h1>
    <p class="text-sm text-gray-500">
      Wrapper split.js — collasso, doppio-click reset, persistenza localStorage.
      <br>
      Trascina il gutter · click sul pulsante per collassare · doppio-click sul gutter per reset.
    </p>
  </div>

  <!-- ── 1. Horizontal — collassa B (default) ───────────────── -->
  <section>
    <h2 class="mb-1 text-lg font-semibold text-gray-700">Orizzontale · collapseTarget="b" (default)</h2>
    <p class="mb-3 text-xs text-gray-400">storageKey="demo.horiz" · minSize=80 · pulsante ▶ collassa il pannello destro</p>
    <div class="overflow-hidden rounded-xl border border-gray-200" style="height: 240px">
      <SplitPane direction="horizontal" defaultSizes={[40, 60]} minSize={80} storageKey="demo.horiz">
        {#snippet a()}
          <div class="flex h-full flex-col bg-white p-4">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Pannello A — Lista</div>
            <div class="mt-2 flex-1 rounded-lg bg-blue-50 p-3">
              <p class="text-xs text-blue-600">Contenuto sinistra</p>
            </div>
          </div>
        {/snippet}
        {#snippet b()}
          <div class="flex h-full flex-col bg-gray-50 p-4">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Pannello B — Dettaglio</div>
            <div class="mt-2 flex-1 rounded-lg bg-emerald-50 p-3">
              <p class="text-xs text-emerald-600">Contenuto destra · collassabile con ▶</p>
            </div>
          </div>
        {/snippet}
      </SplitPane>
    </div>
  </section>

  <!-- ── 2. Horizontal — collassa A ─────────────────────────── -->
  <section>
    <h2 class="mb-1 text-lg font-semibold text-gray-700">Orizzontale · collapseTarget="a"</h2>
    <p class="mb-3 text-xs text-gray-400">Nessun storageKey · pulsante ◀ collassa il pannello sinistro (sidebar)</p>
    <div class="overflow-hidden rounded-xl border border-gray-200" style="height: 240px">
      <SplitPane direction="horizontal" defaultSizes={[25, 75]} collapseTarget="a">
        {#snippet a()}
          <div class="flex h-full flex-col bg-gray-800 p-4">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Sidebar</div>
            {#each ['Menu 1', 'Menu 2', 'Menu 3'] as item}
              <div class="mb-1 rounded px-2 py-1 text-sm text-gray-300 hover:bg-gray-700">{item}</div>
            {/each}
          </div>
        {/snippet}
        {#snippet b()}
          <div class="flex h-full flex-col bg-white p-4">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Contenuto principale</div>
            <p class="text-sm text-gray-600">La sidebar (A) si collassa con ◀. Utile per layout con pannello navigazione.</p>
          </div>
        {/snippet}
      </SplitPane>
    </div>
  </section>

  <!-- ── 3. Vertical ────────────────────────────────────────── -->
  <section>
    <h2 class="mb-1 text-lg font-semibold text-gray-700">Verticale · minSize=60 · maxSize=300</h2>
    <p class="mb-3 text-xs text-gray-400">minSize limita il drag · il pulsante collassa sempre a 0 indipendentemente da minSize</p>
    <div class="overflow-hidden rounded-xl border border-gray-200" style="height: 320px">
      <SplitPane direction="vertical" defaultSizes={[55, 45]} minSize={60} maxSize={300} storageKey="demo.vert">
        {#snippet a()}
          <div class="flex h-full flex-col bg-white p-4">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Form testata</div>
            <div class="mt-2 flex-1 rounded-lg bg-amber-50 p-3">
              <p class="text-xs text-amber-600">MasterDetailForm — testata</p>
            </div>
          </div>
        {/snippet}
        {#snippet b()}
          <div class="flex h-full flex-col bg-gray-50 p-4">
            <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Righe dettaglio</div>
            <div class="mt-2 flex-1 rounded-lg bg-purple-50 p-3">
              <p class="text-xs text-purple-600">DataTable embedded</p>
            </div>
          </div>
        {/snippet}
      </SplitPane>
    </div>
  </section>

  <!-- ── 4. Nested ─────────────────────────────────────────── -->
  <section>
    <h2 class="mb-1 text-lg font-semibold text-gray-700">Nidificato — layout tipico app</h2>
    <p class="mb-3 text-xs text-gray-400">Sidebar collassabile (A) · detail con split verticale interno (B)</p>
    <div class="overflow-hidden rounded-xl border border-gray-200" style="height: 360px">
      <SplitPane direction="horizontal" defaultSizes={[22, 78]} collapseTarget="a" storageKey="demo.nest.outer">
        {#snippet a()}
          <div class="flex h-full flex-col bg-gray-900 p-3">
            <div class="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Navigazione</div>
            {#each ['Libri', 'Autori', 'Prestiti', 'Utenti'] as item}
              <div class="mb-0.5 rounded px-2 py-1.5 text-sm text-gray-300 hover:bg-gray-700">{item}</div>
            {/each}
          </div>
        {/snippet}
        {#snippet b()}
          <SplitPane direction="vertical" defaultSizes={[60, 40]} storageKey="demo.nest.inner">
            {#snippet a()}
              <div class="flex h-full flex-col bg-white p-4">
                <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Lista libri</div>
                {#each ['Il nome della rosa', 'Fondazione', 'Neuromante'] as libro}
                  <div class="mb-1 rounded px-2 py-1 text-sm text-gray-600 hover:bg-gray-100">{libro}</div>
                {/each}
              </div>
            {/snippet}
            {#snippet b()}
              <div class="flex h-full flex-col bg-gray-50 p-4">
                <div class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Relazioni</div>
                <p class="text-sm text-gray-500">Prestiti, recensioni, ecc.</p>
              </div>
            {/snippet}
          </SplitPane>
        {/snippet}
      </SplitPane>
    </div>
  </section>
</div>
