<script lang="ts">
  import DataTable from '$coframe/components/DataTable.svelte';
  import SplitPane from '$coframe/components/SplitPane.svelte';
  import type { ColumnDef, CellInfo } from '$coframe/components/DataTable.svelte';

  // ── Dati di esempio ────────────────────────────────────────────────────────

  const authors = [
    { id: 1,  name: 'Italo Calvino',          birth_date: '1923-10-15', country: 'Italia',    books: 12 },
    { id: 2,  name: 'Umberto Eco',            birth_date: '1932-01-05', country: 'Italia',    books: 8  },
    { id: 3,  name: 'Elena Ferrante',         birth_date: '1943-01-01', country: 'Italia',    books: 5  },
    { id: 4,  name: 'Jorge L. Borges',        birth_date: '1899-08-24', country: 'Argentina', books: 22 },
    { id: 5,  name: 'Gabriel García Márquez', birth_date: '1927-03-06', country: 'Colombia',  books: 17 },
    { id: 6,  name: 'Franz Kafka',            birth_date: '1883-07-03', country: 'Rep. Ceca', books: 6  },
    { id: 7,  name: 'Albert Camus',           birth_date: '1913-11-07', country: 'Algeria',   books: 9  },
    { id: 8,  name: 'Leo Tolstoj',            birth_date: '1828-09-09', country: 'Russia',    books: 31 },
    { id: 9,  name: 'Fyodor Dostoevskij',     birth_date: '1821-11-11', country: 'Russia',    books: 14 },
    { id: 10, name: 'Virginia Woolf',         birth_date: '1882-01-25', country: 'UK',        books: 9  },
  ];

  const columns: ColumnDef[] = [
    { field: 'id',         title: 'ID',      width: 60,  hozAlign: 'right' },
    { field: 'name',       title: 'Autore',  minWidth: 160 },
    { field: 'birth_date', title: 'Nascita', width: 110, hozAlign: 'center' },
    { field: 'country',    title: 'Paese',   width: 120 },
    { field: 'books',      title: 'Libri',   width: 80,  hozAlign: 'right' },
  ];

  // ── Stato demo ─────────────────────────────────────────────────────────────

  let ref: DataTable | null = $state(null);
  let lastClick = $state<Record<string, unknown> | null>(null);
  let lastCell = $state<CellInfo | null>(null);
  let selectedCount = $state(0);
  let rowCount = $state(0);
  let mode: 'virtual' | 'page' = $state('virtual');
  let withSelection = $state(false);
</script>

<!-- Layout: il playground ha uno scroll verticale, le sezioni si impilano -->
<div class="flex h-full flex-col gap-6">

  <div>
    <h1 class="mb-1 text-2xl font-bold text-gray-800">DataTable</h1>
    <p class="text-sm text-gray-500">
      Wrapper Tabulator.js — virtual scroll, paginazione, selezione, export CSV.<br>
      La seconda sezione testa il comportamento dentro uno <strong>SplitPane</strong>.
    </p>
  </div>

  <!-- ── 1. Tabella standalone ──────────────────────────────────────────────── -->
  <section class="space-y-3">
    <h2 class="text-lg font-semibold text-gray-700">1. Standalone — altezza fissa</h2>

    <div class="flex flex-wrap items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <label class="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" bind:checked={withSelection} class="rounded" />
        Selezione multipla
      </label>
      <label class="flex items-center gap-2 text-sm text-gray-700">
        Modalità:
        <select bind:value={mode} class="input py-1 text-sm">
          <option value="virtual">virtual scroll</option>
          <option value="page">paginazione</option>
        </select>
      </label>
      <button class="btn btn-secondary py-1 text-xs" onclick={() => ref?.download('csv')}>
        Export CSV
      </button>
      <button class="btn btn-secondary py-1 text-xs" onclick={() => ref?.clearSelection()}>
        Deseleziona tutto
      </button>
    </div>

    <div class="flex flex-wrap gap-6 text-sm text-gray-600">
      <span>Righe: <strong>{rowCount}</strong></span>
      <span>Selezionate: <strong>{selectedCount}</strong></span>
      <span>Riga: <strong>{lastClick ? lastClick.name : '—'}</strong></span>
      <span>Colonna: <strong>{lastCell ? lastCell.field : '—'}</strong></span>
      <span>Valore: <strong>{lastCell ? String(lastCell.value) : '—'}</strong></span>
    </div>

    <div class="overflow-hidden rounded-xl border border-gray-200" style="height: 300px">
      <DataTable
        bind:this={ref}
        data={authors}
        {columns}
        selectable={withSelection}
        {mode}
        pageSize={5}
        initialSort={[{ field: 'name', dir: 'asc' }]}
        onRowClick={(row) => (lastClick = row)}
        onCellClick={(cell) => (lastCell = cell)}
        onSelectionChange={(rows) => (selectedCount = rows.length)}
        onDataLoaded={(n) => (rowCount = n)}
      />
    </div>
  </section>

  <!-- ── 2. Tabella dentro SplitPane ───────────────────────────────────────── -->
  <section class="space-y-3">
    <h2 class="text-lg font-semibold text-gray-700">2. Dentro SplitPane — resize test</h2>
    <p class="text-xs text-gray-400">
      Trascina il gutter per ridimensionare. Il ResizeObserver chiama <code>redraw(true)</code>
      per aggiornare il virtual scroll.
    </p>

    <div class="overflow-hidden rounded-xl border border-gray-200" style="height: 320px">
      <SplitPane
        direction="horizontal"
        defaultSizes={[65, 35]}
        minSize={120}
        storageKey="demo.datatable.split"
      >
        {#snippet a()}
          <!-- pannello sinistro: DataTable -->
          <div class="h-full">
            <DataTable
              data={authors}
              {columns}
              initialSort={[{ field: 'books', dir: 'desc' }]}
              onRowClick={(row) => (lastClick = row)}
            />
          </div>
        {/snippet}

        {#snippet b()}
          <!-- pannello destro: dettaglio riga selezionata -->
          <div class="flex h-full flex-col gap-3 overflow-auto bg-gray-50 p-4">
            <div class="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Dettaglio autore
            </div>
            {#if lastClick}
              <div class="space-y-2">
                {#each Object.entries(lastClick) as [k, v]}
                  <div class="flex gap-2 text-sm">
                    <span class="w-24 shrink-0 font-medium text-gray-500">{k}</span>
                    <span class="text-gray-800">{v}</span>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-sm text-gray-400">Clicca una riga nella tabella.</p>
            {/if}
          </div>
        {/snippet}
      </SplitPane>
    </div>
  </section>

  <!-- ── 3. Split verticale — caso critico ─────────────────────────────────── -->
  <section class="space-y-3">
    <h2 class="text-lg font-semibold text-gray-700">3. Split verticale — caso critico</h2>
    <p class="text-xs text-gray-400">
      Il gutter cambia l'<strong>altezza</strong> dei pane — il caso più critico per il virtual scroll.
      Trascina su e giù: Tabulator deve ricalcolare le righe visibili.
    </p>

    <div class="overflow-hidden rounded-xl border border-gray-200" style="height: 380px">
      <SplitPane
        direction="vertical"
        defaultSizes={[60, 40]}
        minSize={80}
        storageKey="demo.datatable.vertical"
      >
        {#snippet a()}
          <!-- pane superiore: DataTable — l'altezza cambia con il gutter -->
          <div class="h-full">
            <DataTable
              data={authors}
              {columns}
              initialSort={[{ field: 'id', dir: 'asc' }]}
              onRowClick={(row) => (lastClick = row)}
            />
          </div>
        {/snippet}

        {#snippet b()}
          <!-- pane inferiore: pannello info -->
          <div class="flex h-full flex-col gap-2 overflow-auto bg-amber-50 p-4">
            <div class="text-xs font-semibold uppercase tracking-wide text-amber-600">
              Pane inferiore
            </div>
            {#if lastClick}
              <p class="text-sm text-amber-800">
                Selezionato: <strong>{lastClick.name}</strong> · {lastClick.country} · {lastClick.books} libri
              </p>
            {:else}
              <p class="text-sm text-amber-500">Clicca una riga nella tabella sopra.</p>
            {/if}
            <p class="mt-auto text-xs text-amber-400">
              Trascina il gutter ↕ per cambiare l'altezza della tabella.
            </p>
          </div>
        {/snippet}
      </SplitPane>
    </div>
  </section>

  <!-- Note -->
  <div class="space-y-1 rounded-lg border border-blue-100 bg-blue-50 p-4 text-xs text-blue-700">
    <p><strong>height:"100%"</strong> → Tabulator controlla l'intero elemento (header + scroll + footer), nessun overflow.</p>
    <p><strong>redraw(true)</strong> → aggiorna il virtual scroll dopo un resize del container (es. drag gutter verticale).</p>
    <p><strong>Split verticale</strong> → caso critico: cambia l'altezza, non la larghezza — impatta il numero di righe visibili.</p>
  </div>

</div>
