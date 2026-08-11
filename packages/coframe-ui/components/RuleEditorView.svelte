<script lang="ts">
  /**
   * RuleEditorView.svelte — the rule editor, as a stack page.
   *
   * A dense grid in the shape of iDempiere's Advanced Find: uniform rows,
   * aligned columns, nothing spent on decoration. The user edits one flat list
   * of conditions; the boxes are *derived* by splitting on OR, because with the
   * standard precedence — AND binds tighter — a flat list already is an OR of
   * AND groups. The box is the parenthesis, and nobody opens or closes one.
   *
   * Two columns of parentheses are what a general boolean tree would need. This
   * editor gives up that expressiveness (§5) and gets in exchange an interface
   * that cannot reach a state it does not know how to draw.
   *
   * Edits are local until Apply: opening the editor is a deliberate act, and so
   * is changing the set one is looking at.
   */
  import { getContext } from 'svelte';
  import { ArrowLeft, Check, Plus, CopyPlus, X, Search, ArrowUpDown } from 'lucide-svelte';
  import { _, _t } from '../i18n';
  import { stack as globalStack } from '$coframe/stack/stack.svelte';
  import type { StackInstance } from '$coframe/stack/stack.svelte';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';
  import RuleValue from './RuleValue.svelte';
  import type { OrderSpec } from './dataview.query';
  import { filterFields, orderFields, type FilterField } from './dataview.fields';
  import {
    OPERATOR_ARITY, OPERATOR_WORD, operatorsFor, blockConflicts, blockRowIndices,
    type RuleRow, type RuleOperator, type ConflictReason,
  } from './dataview.rules';

  const stack = getContext<StackInstance>('cf:stack') ?? globalStack;

  interface Props {
    /** Table the rules speak about. */
    model: string;
    rules?: RuleRow[];
    /** The order asked of the server, when the user has chosen one. */
    order?: OrderSpec[];
    /** The order the view opens with, from the descriptor. */
    defaultOrder?: OrderSpec[];
    /** The quick search in force — shown, never edited here (see below). */
    search?: string;
    title?: string;
    onApply: (r: { rules: RuleRow[]; order?: OrderSpec[]; search: string }) => void;
    onCancel?: () => void;
  }

  let {
    model, rules = [], order = [], defaultOrder = [], search = '',
    title = '', onApply, onCancel,
  }: Props = $props();

  // ── Local copy ─────────────────────────────────────────────────────────────

  const fields = $derived(filterFields(serverConfig.tables[model], serverConfig.types));
  const orderChoices = $derived(orderFields(fields));

  function cloneRows(src: RuleRow[]): RuleRow[] {
    return src.map(r => ({ join: r.join, rule: { ...r.rule } }));
  }

  let rows = $state<RuleRow[]>(cloneRows(rules));
  let orderField = $state(order[0]?.field ?? '');
  let orderDir = $state<'asc' | 'desc'>(order[0]?.dir ?? 'asc');
  let searchText = $state(search);

  // An editor that opens empty offers a row to fill: an empty row is a switched
  // off condition, which is the selection mask every gestionale has — ten fields
  // presented, two filled, the rest not taking part.
  $effect(() => {
    if (rows.length === 0 && fields.length > 0) rows = [newRow('and')];
  });

  const defaultOrderLabel = $derived.by(() => {
    const d = defaultOrder[0];
    if (!d) return _('as the view opens');
    const f = fields.find(x => x.name === d.field);
    const name = f?.label ?? d.field;
    return d.dir === 'desc' ? `${name} ↓` : name;
  });

  // ── Fields and operators ───────────────────────────────────────────────────

  function fieldOf(name: string): FilterField | undefined {
    return fields.find(f => f.name === name);
  }

  /**
   * The operators offered for a field. `is one of` on a foreign key waits for
   * the multi-value lookup: offering it now would open a cell where the only
   * way in is typing record ids, which is not an interface.
   */
  function opsFor(field: FilterField | undefined): RuleOperator[] {
    if (!field) return [];
    const ops = operatorsFor(field.primitive);
    return field.primitive === 'fk' ? ops.filter(o => o !== 'in') : ops;
  }

  /**
   * A new row opens on the field one would most likely fill: the one the table
   * shows itself by, then the first that is not the key. The key is rarely what
   * a filter starts from, and a row that opens on it is a row to change before
   * it can be used.
   */
  function defaultField(): FilterField | undefined {
    const display = serverConfig.tables[model]?.display_field;
    return fields.find(f => f.name === display)
      ?? fields.find(f => !f.pk)
      ?? fields[0];
  }

  function newRow(join: 'and' | 'or'): RuleRow {
    const field = defaultField();
    return {
      join,
      rule: { field: field?.name ?? '', op: opsFor(field)[0] ?? 'eq' },
    };
  }

  function setField(i: number, name: string) {
    const field = fieldOf(name);
    const ops = opsFor(field);
    const rule = rows[i].rule;
    rule.field = name;
    // A value belongs to the field it was typed for, and an operator to the
    // type that offers it: changing the field drops both rather than carrying
    // over a date into a number.
    if (!ops.includes(rule.op)) rule.op = ops[0] ?? 'eq';
    rule.value = undefined;
    rule.labels = undefined;
  }

  function setOp(i: number, op: RuleOperator) {
    const rule = rows[i].rule;
    const before = OPERATOR_ARITY[rule.op];
    rule.op = op;
    if (OPERATOR_ARITY[op] !== before) {
      rule.value = undefined;
      rule.labels = undefined;
    }
  }

  function addRow() {
    rows = [...rows, newRow('and')];
  }

  /**
   * A new alternative duplicates the current block. This is what makes the
   * normal form bearable: `A AND (B OR C)` means repeating A, and repeating it
   * must be one click rather than retyping.
   */
  function addAlternative() {
    const blocks = blockRowIndices(rows);
    const last = blocks[blocks.length - 1];
    if (!last) { rows = [...rows, newRow('or')]; return; }
    const copy = last.map((idx, k) => ({
      join: (k === 0 ? 'or' : 'and') as 'and' | 'or',
      rule: { ...rows[idx].rule },
    }));
    rows = [...rows, ...copy];
  }

  function removeRow(i: number) {
    const next = rows.filter((_r, k) => k !== i);
    // The first row of the list has no one above it to be joined to.
    if (next.length > 0) next[0] = { ...next[0], join: 'and' };
    rows = next;
  }

  function toggleJoin(i: number) {
    rows[i].join = rows[i].join === 'or' ? 'and' : 'or';
  }

  // ── Blocks and contradictions ──────────────────────────────────────────────

  const blocks = $derived(blockRowIndices(rows));

  const CONFLICT_TEXT: Record<ConflictReason, string> = {
    'distinct-values': 'A field holds one value: no row can satisfy both.',
    'value-outside-bounds': 'That value falls outside the range asked for above.',
    'disjoint-bounds': 'These bounds leave no value in between.',
    'null-and-value': 'An empty field satisfies no comparison.',
  };

  /** Reported on the second row of the pair, where the fix belongs. */
  const conflicts = $derived.by(() => {
    const found = new Map<number, { other: number; reason: ConflictReason }>();
    for (const block of blocks) {
      for (const c of blockConflicts(block.map(i => rows[i].rule))) {
        found.set(block[c.b], { other: block[c.a], reason: c.reason });
      }
    }
    return found;
  });

  // ── Exit ───────────────────────────────────────────────────────────────────

  function apply() {
    onApply({
      rules: rows.filter(r => r.rule.field),
      order: orderField ? [{ field: orderField, dir: orderDir }] : undefined,
      search: searchText,
    });
    stack.pop();
  }

  function cancel() {
    onCancel?.();
    stack.pop();
  }

  /**
   * Escape leaves the editor — unless something inside has already answered it.
   * A combobox closing its dropdown calls preventDefault, and that is the signal
   * that the key was for it: without the check, closing a lookup would throw
   * away the rules being written behind it.
   */
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape' && !e.defaultPrevented) {
      e.stopPropagation();
      cancel();
    }
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="cf-re" onkeydown={handleKey} role="region" aria-label={_('Filter editor')}>

  <div class="cf-re-header">
    <button class="cf-re-back" onclick={cancel} title={_('Cancel (Esc)')} aria-label={_('Cancel (Esc)')}>
      <ArrowLeft size={16} />
    </button>
    <h2 class="cf-re-title">{title || _t('Filter — {model}', { model })}</h2>
    <button class="cf-re-apply" onclick={apply} title={_('Apply')}>
      <Check size={14} /> {_('Apply')}
    </button>
  </div>

  <div class="cf-re-body">

    <!-- ── What holds for the whole query, above every box ────────────────
         The quick search is in AND over everything, which is exactly why it
         cannot be one of the rows: a flat list in disjunctive form has no
         place above its own OR. It is shown so that opening the editor tells
         the whole truth about the set, and can be cleared from here. -->
    <div class="cf-re-context">
      {#if searchText}
        <div class="cf-re-ctx-row">
          <span class="cf-re-ctx-join">{_('AND')}</span>
          <Search size={13} />
          <span class="cf-re-ctx-label">{_('Quick search')}</span>
          <span class="cf-re-ctx-value">“{searchText}”</span>
          <button class="cf-re-icon" onclick={() => (searchText = '')} title={_('Clear search')}>
            <X size={12} />
          </button>
        </div>
      {/if}

      <div class="cf-re-ctx-row">
        <span class="cf-re-ctx-join"><ArrowUpDown size={13} /></span>
        <span class="cf-re-ctx-label">{_('Order by')}</span>
        <select class="cf-re-select" bind:value={orderField} aria-label={_('Order by')}>
          <option value="">{_t('Default ({order})', { order: defaultOrderLabel })}</option>
          {#each orderChoices as f (f.name)}
            <option value={f.name}>{f.label}{f.indexed ? ' ·' : ''}</option>
          {/each}
        </select>
        {#if orderField}
          <button
            class="cf-re-dir"
            onclick={() => (orderDir = orderDir === 'asc' ? 'desc' : 'asc')}
            title={orderDir === 'asc' ? _('Ascending') : _('Descending')}
          >
            {orderDir === 'asc' ? '↑' : '↓'}
          </button>
          <button class="cf-re-icon" onclick={() => (orderField = '')} title={_('Back to the view order')}>
            <X size={12} />
          </button>
        {/if}
        <span class="cf-re-hint">{_('· can be sorted cheaply')}</span>
      </div>
    </div>

    <!-- ── The conditions ─────────────────────────────────────────────── -->
    {#each blocks as block, b (b)}
      {#if b > 0}
        <div class="cf-re-or"><span>{_('OR')}</span></div>
      {/if}

      <div class="cf-re-block">
        {#each block as i (i)}
          {@const rule = rows[i].rule}
          {@const field = fieldOf(rule.field)}
          {@const conflict = conflicts.get(i)}
          <div class="cf-re-row">
            <div class="cf-re-join">
              {#if i > 0}
                <button
                  class="cf-re-join-btn"
                  class:cf-re-join-or={rows[i].join === 'or'}
                  onclick={() => toggleJoin(i)}
                  title={rows[i].join === 'or' ? _('OR — starts an alternative') : _('AND — binds tighter')}
                >{rows[i].join === 'or' ? _('OR') : _('AND')}</button>
              {/if}
            </div>

            <select
              class="cf-re-select cf-re-field"
              value={rule.field}
              onchange={(e) => setField(i, (e.target as HTMLSelectElement).value)}
              aria-label={_('Field')}
            >
              {#each fields as f (f.name)}
                <option value={f.name}>{f.label}</option>
              {/each}
            </select>

            <select
              class="cf-re-select cf-re-op"
              value={rule.op}
              onchange={(e) => setOp(i, (e.target as HTMLSelectElement).value as RuleOperator)}
              aria-label={_('Operator')}
            >
              {#each opsFor(field) as op (op)}
                <option value={op}>{_(OPERATOR_WORD[op])}</option>
              {/each}
            </select>

            <div class="cf-re-value">
              {#if field}
                <RuleValue
                  {field}
                  op={rule.op}
                  value={rule.value}
                  labels={rule.labels}
                  onchange={(v) => (rows[i].rule.value = v)}
                  onlabels={(l) => (rows[i].rule.labels = l)}
                />
              {/if}
            </div>

            <button class="cf-re-icon" onclick={() => removeRow(i)} title={_('Remove condition')}>
              <X size={13} />
            </button>
          </div>

          {#if conflict}
            <!-- Said on the row, never executed quietly: the block is not
                 switched off, because silently reducing a query the user wrote
                 is changing the question without saying so. Other blocks in OR
                 may well return rows. -->
            <div class="cf-re-conflict">
              <span>{_(CONFLICT_TEXT[conflict.reason])}</span>
              <button class="cf-re-fix" onclick={() => toggleJoin(i)}>{_('Did you mean OR?')}</button>
            </div>
          {/if}
        {/each}
      </div>
    {/each}

    <div class="cf-re-actions">
      <button class="cf-re-btn" onclick={addRow}>
        <Plus size={13} /> {_('Add condition')}
      </button>
      <button class="cf-re-btn" onclick={addAlternative} title={_('Duplicates this block as an alternative')}>
        <CopyPlus size={13} /> {_('Add alternative')}
      </button>
    </div>

  </div>
</div>

<style>
  .cf-re {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--cf-bg);
    color: var(--cf-text);
  }

  /* ── Header ──────────────────────────────────────────────────────────── */

  .cf-re-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.35rem 0.6rem;
    border-bottom: 1px solid var(--cf-border);
    background: var(--cf-surface);
    flex-shrink: 0;
  }

  .cf-re-title {
    flex: 1 1 auto;
    margin: 0;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .cf-re-back {
    display: inline-flex;
    align-items: center;
    border: none;
    background: none;
    color: var(--cf-text);
    cursor: pointer;
    padding: 0.15rem;
  }

  .cf-re-apply {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--cf-accent, #3b82f6);
    border-radius: 0.25rem;
    background: color-mix(in srgb, var(--cf-accent, #3b82f6) 12%, transparent);
    color: var(--cf-accent, #3b82f6);
    font-size: 0.75rem;
    cursor: pointer;
  }

  .cf-re-body {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 0.6rem;
  }

  /* ── Context: what holds for the whole query ─────────────────────────── */

  .cf-re-context {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding-bottom: 0.5rem;
    margin-bottom: 0.5rem;
    border-bottom: 1px solid var(--cf-border);
  }

  .cf-re-ctx-row {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.75rem;
    color: var(--cf-text-subtle);
  }

  .cf-re-ctx-join {
    display: inline-flex;
    justify-content: center;
    width: 2rem;
    flex-shrink: 0;
    font-size: 0.68rem;
    font-weight: 600;
  }

  .cf-re-ctx-label { color: var(--cf-text); }
  .cf-re-ctx-value { color: var(--cf-text); font-style: italic; }

  .cf-re-hint {
    font-size: 0.65rem;
    color: var(--cf-text-subtle);
  }

  /* ── Rows ────────────────────────────────────────────────────────────── */

  .cf-re-block {
    border: 1px solid var(--cf-border);
    border-radius: 0.3rem;
    padding: 0.3rem 0.4rem;
    background: var(--cf-surface);
  }

  .cf-re-or {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.35rem 0;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--cf-text-subtle);
  }

  .cf-re-or::after {
    content: '';
    flex: 1 1 auto;
    height: 1px;
    background: var(--cf-border);
  }

  .cf-re-row {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.12rem 0;
  }

  .cf-re-join {
    width: 2rem;
    flex-shrink: 0;
    display: flex;
    justify-content: center;
  }

  .cf-re-join-btn {
    width: 1.5rem;
    height: 1.4rem;
    border: 1px solid var(--cf-border);
    border-radius: 0.25rem;
    background: var(--cf-bg);
    color: var(--cf-text-subtle);
    font-size: 0.68rem;
    font-weight: 700;
    cursor: pointer;
  }

  .cf-re-join-or {
    border-color: color-mix(in srgb, var(--cf-accent, #3b82f6) 40%, transparent);
    color: var(--cf-accent, #3b82f6);
  }

  .cf-re-select {
    height: 1.5rem;
    padding: 0 0.25rem;
    border: 1px solid var(--cf-border-input);
    border-radius: 0.25rem;
    background: var(--cf-bg);
    color: var(--cf-text);
    font-size: 0.75rem;
  }

  .cf-re-field { width: 11rem; flex-shrink: 0; }
  .cf-re-op    { width: 9rem;  flex-shrink: 0; }

  .cf-re-value {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    flex: 1 1 auto;
    min-width: 0;
  }

  .cf-re-icon {
    display: inline-flex;
    align-items: center;
    border: none;
    background: none;
    padding: 0.1rem;
    color: var(--cf-text-subtle);
    cursor: pointer;
    flex-shrink: 0;
  }

  .cf-re-icon:hover { color: var(--cf-danger, #ef4444); }

  .cf-re-dir {
    width: 1.5rem;
    height: 1.5rem;
    border: 1px solid var(--cf-border-input);
    border-radius: 0.25rem;
    background: var(--cf-bg);
    color: var(--cf-text);
    cursor: pointer;
  }

  /* ── Contradiction ───────────────────────────────────────────────────── */

  .cf-re-conflict {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-left: 2.3rem;
    padding: 0.1rem 0 0.25rem;
    font-size: 0.68rem;
    color: var(--cf-warning, #b45309);
  }

  .cf-re-fix {
    border: none;
    background: none;
    padding: 0;
    color: var(--cf-accent, #3b82f6);
    font-size: 0.68rem;
    text-decoration: underline;
    cursor: pointer;
  }

  /* ── Actions ─────────────────────────────────────────────────────────── */

  .cf-re-actions {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.5rem;
    margin-left: 2.3rem;
  }

  .cf-re-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--cf-border);
    border-radius: 0.25rem;
    background: var(--cf-bg);
    color: var(--cf-text);
    font-size: 0.72rem;
    cursor: pointer;
  }

  .cf-re-btn:hover { background: var(--cf-surface-hover); }
</style>
