<script lang="ts">
  /**
   * Wizard playground — multi-step endpoint with descriptor-driven panels.
   *
   * The orchestrator loads panel descriptors from the server via get_panel,
   * renders DataForm / DataView, and routes events to state transitions.
   * No domain knowledge lives here — everything is in the backend.
   *
   * States: params → preview → done
   */
  import { api } from '$coframe/api/client';
  import DataForm from '$coframe/components/DataForm.svelte';
  import DataView from '$coframe/components/DataView.svelte';
  import StackContainer from '$coframe/stack/StackContainer.svelte';
  import { stack } from '$coframe/stack/stack.svelte';
  import type { FormDescriptor } from '$coframe/components/dataform.types';
  import type { ViewDescriptor } from '$coframe/components/dataview.types';

  type WizardStep = 'params' | 'preview' | 'done';

  let step    = $state<WizardStep>('params');
  let loading = $state(false);
  let error   = $state<string | null>(null);

  // Panel descriptors loaded from server
  let paramsForm    = $state<FormDescriptor | null>(null);
  let previewTable  = $state<ViewDescriptor | null>(null);

  // Accumulated wizard data
  let previewRows  = $state<Record<string, unknown>[]>([]);
  let result       = $state<{ processed: number; total: number; high_risk: number; message: string } | null>(null);

  // ── Load descriptors on mount ─────────────────────────────────────────────
  $effect(() => {
    loadDescriptors();
  });

  async function loadDescriptors() {
    loading = true;
    error = null;
    try {
      const [paramsRes, previewRes] = await Promise.all([
        api.endpoint('get_page', { id: 'payment_wizard_params' }),
        api.endpoint('get_page', { id: 'payment_wizard_preview' }),
      ]);
      if (paramsRes.status === 'success') {
        const page = paramsRes.data as Record<string, unknown>;
        paramsForm = page.content as FormDescriptor;
      }
      if (previewRes.status === 'success') {
        const page = previewRes.data as Record<string, unknown>;
        previewTable = page.content as ViewDescriptor;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  // ── Event routing ─────────────────────────────────────────────────────────

  async function handleParamsEvent(name: string, data: unknown) {
    if (name === 'form_save') {
      // Params confirmed → call endpoint step=preview
      await callPreview(data as Record<string, unknown>);
    } else if (name === 'form_discard') {
      handleReset();
    }
  }

  async function handlePreviewEvent(name: string, data: unknown) {
    if (name === 'batch_accept') {
      // Preview confirmed → call endpoint step=confirm
      await callConfirm(data as { rows: Record<string, unknown>[]; selected: Record<string, unknown>[] });
    } else if (name === 'row_cancel') {
      step = 'params';
    }
  }

  async function callPreview(params: Record<string, unknown>) {
    loading = true;
    error = null;
    try {
      const res = await api.endpoint('payment_wizard', {
        step:       'preview',
        min_amount: params.min_amount ?? 0,
        agent:      params.agent ?? null,
      });
      if (res.status === 'success' && Array.isArray(res.data)) {
        previewRows = res.data as Record<string, unknown>[];
        step = 'preview';
      } else {
        error = res.message ?? 'Errore nella generazione';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function callConfirm(payload: { rows: Record<string, unknown>[]; selected: Record<string, unknown>[] }) {
    loading = true;
    error = null;
    try {
      const res = await api.endpoint('payment_wizard', {
        step: 'confirm',
        rows: payload.selected,   // only the checked rows
      });
      if (res.status === 'success') {
        result = res.data as typeof result;
        step = 'done';
      } else {
        error = res.message ?? 'Errore nella conferma';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  function handleReset() {
    step        = 'params';
    previewRows = [];
    result      = null;
    error       = null;
  }

  // ── Step labels ───────────────────────────────────────────────────────────
  const STEPS: [WizardStep, string][] = [
    ['params',  '1. Parametri'],
    ['preview', '2. Anteprima'],
    ['done',    '3. Esito'],
  ];
</script>

<div class="relative flex h-full flex-col gap-3 p-4">

  <!-- ── Header ──────────────────────────────────────────────────────────── -->
  <div class="flex-shrink-0">
    <h1 class="text-xl font-semibold">Solleciti di pagamento</h1>
    <p class="mt-0.5 text-sm" style="color: var(--cf-text-subtle)">
      Wizard descriptor-driven: panel da server, orchestrazione minima client.
    </p>
    <div class="mt-3 flex items-center gap-2 text-sm">
      {#each STEPS as [s, label], i}
        <span
          class="rounded-full px-3 py-0.5 font-medium transition-colors"
          style={step === s
            ? 'background: var(--cf-brand, #3b82f6); color: #fff'
            : 'background: var(--cf-surface-subtle); color: var(--cf-text-subtle)'}
        >{label}</span>
        {#if i < STEPS.length - 1}
          <span style="color: var(--cf-border)">→</span>
        {/if}
      {/each}
    </div>
  </div>

  <!-- ── Error / loading ──────────────────────────────────────────────────── -->
  {#if error}
    <div class="flex-shrink-0 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
      {error}
    </div>
  {/if}

  {#if loading && step === 'params' && !paramsForm}
    <div class="flex flex-1 items-center justify-center text-sm" style="color: var(--cf-text-subtle)">
      Caricamento…
    </div>

  <!-- ── Step: params ─────────────────────────────────────────────────────── -->
  {:else if step === 'params' && paramsForm}
    <div class="flex-shrink-0 w-96 overflow-hidden rounded border" style="border-color: var(--cf-border)">
      <DataForm view={paramsForm} onEvent={handleParamsEvent} />
    </div>

  <!-- ── Step: preview ────────────────────────────────────────────────────── -->
  {:else if step === 'preview' && previewTable}
    <div class="min-h-0 flex-1 overflow-hidden rounded border" style="border-color: var(--cf-border)">
      <DataView view={previewTable} data={previewRows} onEvent={handlePreviewEvent} />
    </div>

  <!-- ── Step: done ───────────────────────────────────────────────────────── -->
  {:else if step === 'done'}
    <div
      class="flex-shrink-0 w-96 rounded border p-5"
      style="border-color: var(--cf-border); background: var(--cf-surface)"
    >
      <div class="mb-4 flex items-center gap-2">
        <span class="text-xl text-green-600">✓</span>
        <h2 class="text-sm font-semibold text-green-700">Operazione completata</h2>
      </div>
      {#if result}
        <p class="mb-4 text-sm" style="color: var(--cf-text)">{result.message}</p>
        <div
          class="grid grid-cols-2 gap-x-4 gap-y-2 rounded border p-3 text-sm"
          style="border-color: var(--cf-border); background: var(--cf-surface-subtle)"
        >
          <span style="color: var(--cf-text-subtle)">Solleciti inviati</span>
          <span class="font-semibold">{result.processed}</span>
          <span style="color: var(--cf-text-subtle)">Totale esposto</span>
          <span class="font-semibold">€ {result.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
          <span style="color: var(--cf-text-subtle)">Alto rischio</span>
          <span class="font-semibold" style="color: {result.high_risk > 0 ? '#dc2626' : 'inherit'}">{result.high_risk}</span>
        </div>
      {/if}
      <div class="mt-5">
        <button class="btn btn-secondary w-full" onclick={handleReset}>← Nuova elaborazione</button>
      </div>
    </div>
  {/if}

  <a href="/playground" class="mt-auto flex-shrink-0 text-sm" style="color: var(--cf-brand)">← Playground</a>

  <!-- Stack overlay: form pages pushed by DataView (batch edit) -->
  {#if $stack.length > 0}
    <div class="absolute inset-0">
      <StackContainer />
    </div>
  {/if}
</div>
