<script lang="ts">
  /**
   * WidgetFKCombobox.svelte — FK field widget with server-side search.
   *
   * Shows a text input. On typing (debounced 300ms) searches the target table
   * via LIKE on search_fields. Shows up to 10 matches plus a "Cerca altro…"
   * button that pushes FKPickerView onto the stack.
   *
   * field.foreign_key: { target: string; field: string }  — from auto-form
   * serverConfig.tables[target].display_field             — label column
   * serverConfig.tables[target].search_fields             — searchable columns
   */
  import { untrack } from 'svelte';
  import { api } from '$coframe/api/client';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';
  import { stack } from '$coframe/stack/stack.svelte';
  import FKPickerView from '../FKPickerView.svelte';
  import type { FormField } from '../dataform.types';

  interface Props {
    value: unknown;
    onchange: (v: unknown) => void;
    onblur?: () => void;
    readonly?: boolean;
    field: FormField;
  }

  let { value, onchange, onblur, readonly = false, field }: Props = $props();

  let fkTarget  = $derived((field.foreign_key as { target?: string; field?: string } | undefined)?.target);
  let fkPkField = $derived((field.foreign_key as { target?: string; field?: string } | undefined)?.field ?? 'id');

  let displayField = $derived(fkTarget ? serverConfig.tables[fkTarget]?.display_field : undefined);
  let searchFields = $derived(fkTarget ? (serverConfig.tables[fkTarget]?.search_fields ?? []) : []);

  // Label for the currently selected value
  let currentLabel = $state(untrack(() => ''));
  // Text shown in the input (user may be typing something different)
  let query = $state(untrack(() => ''));
  let options = $state<Array<{ id: unknown; label: string }>>([]);
  let open = $state(false);
  let searching = $state(false);
  let inputEl = $state<HTMLInputElement | undefined>();

  // Load the label whenever value changes from outside
  $effect(() => {
    const v = value;
    const df = displayField;
    if (v == null || v === '') {
      currentLabel = '';
      query = untrack(() => query) === currentLabel ? '' : untrack(() => query);
      return;
    }
    if (!fkTarget || !df) return;
    _loadLabel(v, df);
  });

  async function _loadLabel(v: unknown, df: string) {
    try {
      const res = await api.endpoint('query', {
        format: 'records',
        query: {
          table: fkTarget,
          columns: [fkPkField, df],
          filters: { conditions: { column: fkPkField, op: 'eq', value: v } },
          limit: 1,
        },
      });
      if (res.status === 'success' && Array.isArray(res.data) && res.data.length > 0) {
        const label = String((res.data[0] as Record<string, unknown>)[df] ?? '');
        currentLabel = label;
        query = label;
      }
    } catch (_) {}
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  function handleInput(e: Event) {
    const q = (e.target as HTMLInputElement).value;
    query = q;
    if (!q.trim()) {
      options = [];
      open = false;
      clearTimeout(debounceTimer);
      return;
    }
    open = true;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => _search(q), 300);
  }

  async function _search(q: string) {
    const df = displayField;
    const sf = searchFields;
    if (!fkTarget || !df || sf.length === 0) return;

    searching = true;
    try {
      const filterConditions = sf.length === 1
        ? { column: sf[0], op: 'ilike', value: `%${q}%` }
        : { op: 'or', conditions: sf.map(f => ({ column: f, op: 'ilike', value: `%${q}%` })) };

      const res = await api.endpoint('query', {
        format: 'records',
        query: {
          table: fkTarget,
          columns: [fkPkField, df],
          filters: { conditions: filterConditions },
          limit: 10,
        },
      });
      if (res.status === 'success' && Array.isArray(res.data)) {
        options = res.data.map((r) => {
          const row = r as Record<string, unknown>;
          return { id: row[fkPkField], label: String(row[df] ?? '') };
        });
      }
    } finally {
      searching = false;
    }
  }

  function selectOption(opt: { id: unknown; label: string }) {
    currentLabel = opt.label;
    query = opt.label;
    options = [];
    open = false;
    onchange(opt.id);
    onblur?.();
  }

  function clearValue() {
    currentLabel = '';
    query = '';
    options = [];
    open = false;
    onchange(null);
    onblur?.();
  }

  function handleBlur() {
    // Delay so mousedown on options fires before blur closes the dropdown
    setTimeout(() => {
      open = false;
      query = currentLabel;
      onblur?.();
    }, 150);
  }

  function openPicker() {
    open = false;
    if (!fkTarget) return;
    stack.push(
      FKPickerView,
      { table: fkTarget, title: `Seleziona ${field.label ?? fkTarget}` },
      (row: unknown) => {
        if (!row || typeof row !== 'object') return;
        const r = row as Record<string, unknown>;
        const id = r[fkPkField];
        const df = displayField;
        const label = df ? String(r[df] ?? '') : String(id ?? '');
        currentLabel = label;
        query = label;
        onchange(id);
      }
    );
  }
</script>

{#if readonly}
  <span
    class="block rounded-btn border px-3 py-2 text-sm"
    style="border-color: var(--cf-border); background: var(--cf-surface-subtle); color: var(--cf-text)"
  >
    {currentLabel || '—'}
  </span>

{:else}
  <div class="relative">
    <!-- Input row -->
    <input
      bind:this={inputEl}
      type="text"
      class="input w-full pr-16 {field.error ? 'input-error' : ''}"
      placeholder={field.placeholder as string | undefined ?? 'Cerca…'}
      value={query}
      oninput={handleInput}
      onblur={handleBlur}
      aria-label={field.label ?? field.name}
      aria-autocomplete="list"
    />

    <!-- Clear (×) button — shown when a value is selected -->
    {#if currentLabel}
      <button
        type="button"
        class="absolute right-8 top-1/2 -translate-y-1/2 p-1"
        style="color: var(--cf-text-subtle)"
        onmousedown={(e) => { e.preventDefault(); clearValue(); }}
        aria-label="Cancella selezione"
      >
        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    {/if}

    <!-- Chevron -->
    <button
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 p-1"
      style="color: var(--cf-text-subtle)"
      onmousedown={(e) => { e.preventDefault(); open = !open; if (open) inputEl?.focus(); }}
      aria-label="Apri lista"
    >
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- Dropdown -->
    {#if open}
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md shadow-lg"
        style="top: 100%; border: 1px solid var(--cf-border); background: var(--cf-surface)"
        onmousedown={(e) => e.preventDefault()}
      >
        <ul class="max-h-48 overflow-auto py-1" role="listbox">
          {#if searching}
            <li class="px-3 py-2 text-sm" style="color: var(--cf-text-subtle)">Ricerca…</li>
          {:else if options.length === 0 && query.trim()}
            <li class="px-3 py-2 text-sm" style="color: var(--cf-text-subtle)">Nessun risultato</li>
          {:else}
            {#each options as opt (opt.id)}
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <li
                role="option"
                aria-selected={String(value) === String(opt.id)}
                class="cursor-pointer px-3 py-2 text-sm hover:bg-blue-50
                       {String(value) === String(opt.id) ? 'font-semibold text-brand' : ''}"
                onclick={() => selectOption(opt)}
              >
                {opt.label}
              </li>
            {/each}
          {/if}
        </ul>

        <!-- Cerca altro… — always visible at the bottom -->
        <div style="border-top: 1px solid var(--cf-border-subtle, var(--cf-border))">
          <button
            type="button"
            class="w-full px-3 py-2 text-left text-xs hover:bg-gray-50"
            style="color: var(--cf-text-subtle)"
            onclick={openPicker}
          >
            Cerca altro…
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
