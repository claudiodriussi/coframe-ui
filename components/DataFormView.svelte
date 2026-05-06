<script lang="ts">
  /**
   * DataFormView.svelte — stack page that wraps DataForm for Add/Edit.
   *
   * Loads the form descriptor lazily from `get_page` (cached per formId),
   * then renders DataForm. Intended to be pushed onto the stack by DataView.
   *
   * Props:
   *   formId      string              e.g. 'book_form'
   *   recordId    string|number|null  null = new record
   *   title       string              shown in header bar
   *   onSaved     (savedData) => void  called after successful save with merged record (before pop)
   */
  import { getContext } from 'svelte';
  import { stack as globalStack } from '$coframe/stack/stack.svelte';
  import type { StackInstance } from '$coframe/stack/stack.svelte';
  import { api } from '$coframe/api/client';
  import DataForm from './DataForm.svelte';
  import type { FormDescriptor } from './dataform.types';

  const stack = getContext<StackInstance>('cf:stack') ?? globalStack;

  let {
    formId,
    recordId = null,
    title = '',
    onSaved,
    onCancel,
  }: {
    formId: string;
    recordId?: string | number | null;
    title?: string;
    onSaved?: (savedData: Record<string, unknown>) => void;
    onCancel?: () => void;
  } = $props();

  let descriptor = $state<FormDescriptor | null>(null);
  let loadError  = $state<string | null>(null);

  // Descriptor cache — shared across all DataFormView instances in the session.
  const _cache = new Map<string, FormDescriptor>();

  async function loadDescriptor() {
    if (_cache.has(formId)) {
      descriptor = _cache.get(formId)!;
      return;
    }
    try {
      const res = await api.endpoint('get_page', { id: formId });
      if (res.status === 'success') {
        const page = res.data as Record<string, unknown>;
        const fd = (page.content ?? page) as FormDescriptor;
        _cache.set(formId, fd);
        descriptor = fd;
      } else {
        loadError = res.message ?? `Cannot load form ${formId}`;
      }
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
    }
  }

  // Load on mount
  $effect(() => { loadDescriptor(); });

  function handleSave(savedData: Record<string, unknown>) {
    onSaved?.(savedData);
    stack.pop();
  }

  function handleCancel() {
    onCancel?.();
    stack.pop();
  }
</script>

<div class="cf-form-view">
  <!-- Header bar -->
  <div class="cf-form-view-header">
    <button
      class="cf-form-view-back"
      onclick={handleCancel}
      title="Torna alla lista"
      aria-label="Torna"
    >
      ←
    </button>
    {#if title}
      <h2 class="cf-form-view-title">{title}</h2>
    {/if}
  </div>

  <!-- Body -->
  <div class="cf-form-view-body">
    {#if loadError}
      <div class="cf-form-view-error">{loadError}</div>
    {:else if descriptor}
      <DataForm
        view={descriptor}
        {recordId}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    {:else}
      <div class="cf-form-view-loading">
        <div class="cf-form-view-spinner" aria-hidden="true"></div>
        Caricamento…
      </div>
    {/if}
  </div>
</div>

<style>
  .cf-form-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--cf-bg);
  }

  .cf-form-view-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.75rem;
    border-bottom: 1px solid var(--cf-border);
    background: var(--cf-surface);
    flex-shrink: 0;
  }

  .cf-form-view-back {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: none;
    background: none;
    border-radius: 0.25rem;
    color: var(--cf-text-subtle);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    transition: background 0.1s, color 0.1s;
  }

  .cf-form-view-back:hover {
    background: var(--cf-surface-hover);
    color: var(--cf-text);
  }

  .cf-form-view-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--cf-text);
    margin: 0;
  }

  .cf-form-view-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 1rem;
  }

  .cf-form-view-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    height: 100%;
    color: var(--cf-text-subtle);
    font-size: 0.85rem;
  }

  .cf-form-view-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--cf-border);
    border-top-color: var(--cf-accent);
    border-radius: 50%;
    animation: cf-spin 0.6s linear infinite;
  }

  @keyframes cf-spin { to { transform: rotate(360deg); } }

  .cf-form-view-error {
    padding: 0.75rem;
    background: color-mix(in srgb, var(--cf-danger, #ef4444) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--cf-danger, #ef4444) 30%, transparent);
    border-radius: 0.375rem;
    color: var(--cf-danger, #ef4444);
    font-size: 0.8rem;
  }
</style>
