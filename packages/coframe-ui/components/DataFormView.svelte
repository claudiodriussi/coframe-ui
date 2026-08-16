<script lang="ts">
  /**
   * DataFormView.svelte — stack page that wraps DataForm for Add/Edit.
   *
   * Loads the form descriptor lazily from `get_page` (cached per formId),
   * then renders DataForm. Intended to be pushed onto the stack by DataView.
   *
   * When the descriptor declares collection nodes the page is an **aggregate**, and
   * this frame owns its buffer: it reads the whole tree with `load_tree`, hands the
   * root's values to DataForm, and writes everything back with `save_tree` in one
   * transaction. Nothing declares that mode — the nodes do (relations.md §16.2).
   *
   * Props:
   *   formId      string              e.g. 'book_form' — also the page id of the aggregate
   *   recordId    string|number|null  null = new record
   *   title       string              shown in header bar
   *   onSaved     (savedData) => void  called after successful save with merged record (before pop)
   */
  import { getContext } from 'svelte';
  import { _ } from '../i18n';
  import { stack as globalStack } from '$coframe/stack/stack.svelte';
  import type { StackInstance } from '$coframe/stack/stack.svelte';
  import { api } from '$coframe/api/client';
  import DataForm from './DataForm.svelte';
  import {
    collectionNodes, loadedAggregate, newAggregate, serialize, setValues,
    type Aggregate, type TreeNode,
  } from './aggregate';
  import type { FormDescriptor, LayoutNode } from './dataform.types';

  const stack = getContext<StackInstance>('cf:stack') ?? globalStack;

  let {
    formId,
    recordId = null,
    data = undefined,
    defaults = undefined,
    title = '',
    onSaved,
    onCancel,
  }: {
    formId: string;
    recordId?: string | number | null;
    data?: Record<string, unknown>;       // Step A: computed row, no DB
    defaults?: Record<string, unknown>;   // caller's initial values (create mode)
    title?: string;
    onSaved?: (savedData: Record<string, unknown>) => void;
    onCancel?: () => void;
  } = $props();

  let descriptor = $state<FormDescriptor | null>(null);
  let loadError  = $state<string | null>(null);
  /** The buffer, when this page is an aggregate. Null on a plain record form. */
  let aggregate  = $state<Aggregate | null>(null);
  /** Known before the tree arrives, so the form waits instead of flashing empty. */
  let isAggregate = $state(false);

  // Descriptor cache — shared across all DataFormView instances in the session.
  const _cache = new Map<string, FormDescriptor>();

  async function loadDescriptor() {
    if (_cache.has(formId)) {
      descriptor = _cache.get(formId)!;
    } else {
      try {
        const res = await api.endpoint('get_page', { id: formId });
        if (res.status === 'success') {
          const page = res.data as Record<string, unknown>;
          const fd = (page.content ?? page) as FormDescriptor;
          _cache.set(formId, fd);
          descriptor = fd;
        } else {
          loadError = res.message ?? `Cannot load form ${formId}`;
          return;
        }
      } catch (e) {
        loadError = e instanceof Error ? e.message : String(e);
        return;
      }
    }
    await loadAggregate();
  }

  /** Read the whole tree, or open an empty one — only if the page declares nodes. */
  async function loadAggregate() {
    const layout = (descriptor?.layout ?? []) as LayoutNode[];
    isAggregate = collectionNodes(layout).length > 0;
    if (!isAggregate) {
      aggregate = null;
      return;
    }

    if (recordId === null || recordId === undefined) {
      // A new aggregate: DataForm still computes the create defaults, and they
      // reach the buffer as the draft it hands back.
      aggregate = newAggregate(formId);
      return;
    }

    try {
      const res = await api.endpoint('load_tree', { page: formId, id: recordId });
      if (res.status === 'success') {
        aggregate = loadedAggregate(formId, res.data as TreeNode);
      } else {
        loadError = res.message ?? `Cannot load record ${recordId}`;
      }
    } catch (e) {
      loadError = e instanceof Error ? e.message : String(e);
    }
  }

  // Keyed on what it fetches, like every other fetching effect: re-running is
  // harmless here only because of the cache above, and relying on that is
  // relying on an accident.
  let loadedFormId: string | null = null;
  $effect(() => {
    if (formId === loadedFormId) return;
    loadedFormId = formId;
    loadDescriptor();
  });

  /**
   * Write the aggregate. Throws on refusal, which keeps the form dirty and shows
   * the reason — a tree that did not reach the database must not look saved.
   */
  async function saveAggregate(draft: Record<string, unknown>): Promise<Record<string, unknown>> {
    const agg = aggregate!;
    setValues(agg.root, draft);

    const res = await api.endpoint('save_tree', serialize(agg));
    if (res.status !== 'success') throw new Error(res.message ?? _('Error saving'));

    // Re-read from the answer: the database holds defaults and stamps the buffer
    // never saw, and the temporary ids are keys now.
    const data = res.data as { root: TreeNode };
    aggregate = loadedAggregate(formId, data.root);
    return { ...aggregate.root.values };
  }

  async function handleSave(savedData: Record<string, unknown>) {
    const saved = aggregate ? await saveAggregate(savedData) : savedData;
    onSaved?.(saved);
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
      title={_('Back to list')}
      aria-label={_('Back')}
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
    {:else if descriptor && (!isAggregate || aggregate)}
      <DataForm
        view={descriptor}
        {recordId}
        data={aggregate ? aggregate.root.values : data}
        persist={!aggregate}
        {defaults}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    {:else}
      <div class="cf-form-view-loading">
        <div class="cf-form-view-spinner" aria-hidden="true"></div>
        {_('Loading…')}
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
