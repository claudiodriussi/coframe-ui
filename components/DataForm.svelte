<script lang="ts">
  /**
   * DataForm.svelte — descriptor-driven form.
   *
   * Step A — mode 4: local binding (source.data resolved by parent, passed as `data` prop).
   * Step B — mode 3: endpoint-driven (source.endpoint / save_endpoint).
   * Step C — modes 1+2: DB CRUD (source.model / source.id).
   *
   * Props:
   *   view          FormDescriptor     resolved form descriptor
   *   data          object             initial data (mode 4) or undefined (modes 1–3)
   *   trigger       object             trigger payload from PanelRenderer
   *   status        FormStatus         message shown in toolbar (parent-controlled)
   *   toolbarExtra  Snippet            custom content injected in the toolbar right area
   *   onEvent       fn                 unified event emitter (form_load, form_save, …)
   *   onSave        fn                 called after save in mode 4 (no backend call)
   *   onCancel      fn                 called after cancel / discard
   */
  import { onMount, tick, untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import { Check, X, Loader } from 'lucide-svelte';
  import { getConfig } from '../config';
  import { api } from '../api/client';
  import WidgetText from './widgets/WidgetText.svelte';
  import WidgetTextarea from './widgets/WidgetTextarea.svelte';
  import WidgetNumber from './widgets/WidgetNumber.svelte';
  import WidgetDate from './widgets/WidgetDate.svelte';
  import WidgetBoolean from './widgets/WidgetBoolean.svelte';
  import WidgetCombobox from './widgets/WidgetCombobox.svelte';
  import WidgetFKCombobox from './widgets/WidgetFKCombobox.svelte';
  import type {
    FormDescriptor, FormField, FormStatus,
    LayoutNode, SectionNode, SectionField, FillerField, ColumnDef,
    LabelNode, TabsNode, RowNode,
  } from './dataform.types';

  // ── Props ──────────────────────────────────────────────────────────────────

  interface Props {
    view: FormDescriptor;
    data?: Record<string, unknown>;        // Step A: local data
    recordId?: number | string | null;     // Step C: DB record id (null = new record)
    trigger?: Record<string, unknown>;
    status?: FormStatus;
    toolbarExtra?: Snippet;
    onEvent?: (name: string, data: unknown) => void;
    onSave?: (draft: Record<string, unknown>) => Promise<void> | void;
    onCancel?: () => void;
  }

  let {
    view,
    data = {},
    recordId,
    trigger,
    status,
    toolbarExtra,
    onEvent,
    onSave,
    onCancel
  }: Props = $props();

  // ── Layout engine helpers ──────────────────────────────────────────────────

  // Active tab index per tabs node (keyed by node.id or page labels joined).
  let tabStates = $state<Record<string, number>>({});

  // Recursively extract all FormFields from a layout tree (for validation + save).
  function extractLayoutFields(nodes: LayoutNode[]): FormField[] {
    const result: FormField[] = [];
    for (const node of nodes) {
      if ('name' in node) {
        result.push(node as FormField);
      } else if (node.type === 'section') {
        const sec = node as SectionNode;
        if (Array.isArray(sec.columns)) {
          for (const col of sec.columns as ColumnDef[]) {
            result.push(...col.fields.filter((f): f is SectionField => 'name' in f));
          }
        } else {
          result.push(...((sec as any).fields ?? []).filter((f: any) => 'name' in f));
        }
      } else if (node.type === 'row') {
        for (const col of (node as RowNode).children) {
          result.push(...extractLayoutFields(col.layout));
        }
      } else if (node.type === 'tabs') {
        for (const page of (node as TabsNode).pages) {
          result.push(...extractLayoutFields(page.layout));
        }
      }
      // hr, label, filler: no fields
    }
    return result;
  }

  // ── Mode detection (static — source config fixed at mount) ─────────────────
  // untrack: intentional — view.source is fixed at mount, not reactive.

  const isModelMode    = untrack(() => !!view.source?.model);
  const isEndpointMode = untrack(() => !isModelMode && !!view.source?.endpoint);
  const isAsyncMode    = isModelMode || isEndpointMode;

  // Does the form need to wait for a trigger before loading?
  const hasTriggerDeps = untrack(() => {
    if (isEndpointMode) {
      return Object.values(view.source?.pass ?? {}).some(
        (v) => typeof v === 'string' && (v as string).startsWith('$trigger.')
      );
    }
    // Model mode: trigger-driven if source.id references $trigger.*
    if (isModelMode) {
      const sid = view.source?.id;
      return typeof sid === 'string' && sid.startsWith('$trigger.');
    }
    return false;
  });

  // ── Internal state ─────────────────────────────────────────────────────────

  // Guard for the loadData $effect — plain (non-reactive) vars to detect genuine changes.
  // Svelte 5 sometimes re-runs $effects when parent components re-render even with
  // same prop values (e.g. via spread props in a keyed #each). This guard prevents
  // spurious loadData() calls when trigger/recordId haven't actually changed.
  let _seenTrigger: typeof trigger = undefined as any;
  let _seenRecordId: typeof recordId = undefined as any;
  let _neverLoaded = true;

  // Local mode (Step A): capture data at mount via untrack.
  // Async modes (B/C): start empty — loadData() fills original/draft.
  let original = $state<Record<string, unknown>>(
    isAsyncMode ? {} : untrack(() => ({ ...data }))
  );
  let draft = $state<Record<string, unknown>>(
    isAsyncMode ? {} : untrack(() => ({ ...data }))
  );
  let errors = $state<Record<string, string>>({});
  let saving = $state(false);
  let loading = $state(false);
  let internalStatus = $state<FormStatus | undefined>(undefined);

  // ── Derived ────────────────────────────────────────────────────────────────

  let policy = $derived(view.policy ?? {});
  let isEditable = $derived(policy.editable === true);

  // All leaf FormFields — from layout tree or legacy flat list.
  let flatFields = $derived(
    view.layout
      ? extractLayoutFields(view.layout as LayoutNode[])
      : (view.fields ?? []).filter((f): f is FormField => 'name' in f)
  );

  // Group fields by same_row: a field with same_row:true joins the previous group.
  let fieldGroups = $derived(groupFields(flatFields));

  // dirty: JSON comparison — $state proxy reads all props correctly
  let dirty = $derived(JSON.stringify(draft) !== JSON.stringify(original));

  // Trigger not yet arrived for a trigger-dependent async form
  let waitingForTrigger = $derived(isAsyncMode && hasTriggerDeps && trigger === undefined);

  // Show toolbar when editable or when there's any status/extra content
  let showToolbar = $derived(isEditable || !!status || !!internalStatus || !!toolbarExtra);

  // ── Field grouping ─────────────────────────────────────────────────────────

  function groupFields(fields: FormField[]): FormField[][] {
    const groups: FormField[][] = [];
    for (const field of fields) {
      if (field.same_row && groups.length > 0) {
        groups[groups.length - 1].push(field);
      } else {
        groups.push([field]);
      }
    }
    return groups;
  }

  // CSS style for a field in a multi-field row
  function fieldWidthStyle(field: FormField): string {
    const w = field.width;
    if (w == null) return 'flex: 1 1 0; min-width: 0';
    if (typeof w === 'number') return `width: ${w}px; flex: none`;
    return `width: ${w}; flex: none`;
  }

  // ── Widget resolution ──────────────────────────────────────────────────────

  function resolveWidget(field: FormField): string {
    if (field.widget) return field.widget as string;
    if (field.foreign_key) return 'fk';
    const t = (field.type ?? '').toLowerCase();
    if (t === 'bool' || t === 'boolean') return 'boolean';
    if (t === 'date') return 'date';
    if (t === 'datetime') return 'datetime';
    if (t === 'time') return 'time';
    if (t === 'longstr' || t === 'text') return 'textarea';
    if (t === 'int' || t === 'float' || t === 'decimal' || t === 'number') return 'number';
    if (field.choices && field.choices.length > 0) return 'combobox';
    return 'text';
  }

  // ── Patch + validation ─────────────────────────────────────────────────────

  function patch(name: string, value: unknown) {
    draft[name] = value;
  }

  function validateField(name: string): boolean {
    const field = flatFields.find((f) => f.name === name);
    if (!field) return true;

    const value = draft[name];
    const isEmpty = value === null || value === undefined || value === '';

    if (field.required && isEmpty) {
      errors[name] = `${field.label ?? field.name} è obbligatorio`;
      return false;
    }

    const wt = resolveWidget(field);
    if (wt === 'number' && !isEmpty && isNaN(Number(value))) {
      errors[name] = 'Valore numerico non valido';
      return false;
    }

    const { [name]: _dropped, ...rest } = errors;
    errors = rest;
    return true;
  }

  function validateAll(): boolean {
    let valid = true;
    for (const field of flatFields) {
      if (!validateField(field.name)) valid = false;
    }
    return valid;
  }

  // ── Async load/save (Step B: endpoint, Step C: model) ─────────────────────

  function resolvePass(pass: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(pass).map(([k, v]) => {
        if (typeof v === 'string' && v.startsWith('$trigger.')) {
          return [k, trigger?.[v.slice('$trigger.'.length)]];
        }
        return [k, v];
      })
    );
  }

  // Resolve the record ID for Step C (prop, trigger, or descriptor literal)
  function resolveRecordId(): number | string | null | undefined {
    if (recordId !== undefined) return recordId; // explicit prop wins
    const sid = view.source?.id;
    if (typeof sid === 'string' && sid.startsWith('$trigger.')) {
      return trigger?.[sid.slice('$trigger.'.length)] as number | string | undefined;
    }
    return sid as number | string | null | undefined;
  }

  async function loadData() {
    const src = view.source;
    loading = true;
    internalStatus = undefined;
    try {
      let res;
      if (isModelMode) {
        const id = resolveRecordId();
        if (id === null || id === undefined) {
          // Create mode: initialize with defaults, no load
          const defaults = (src?.defaults ?? {}) as Record<string, unknown>;
          original = { ...defaults };
          draft = { ...defaults };
          errors = {};
          onEvent?.('form_new', { ...defaults });
          return;
        }
        res = await api.endpoint('db', { table: src!.model, method: 'get', id });
      } else {
        // Step B: endpoint-driven
        res = await api.endpoint(src!.endpoint!, resolvePass(src?.pass ?? {}));
      }
      if (res.status === 'success') {
        original = { ...(res.data as Record<string, unknown>) };
        draft = { ...original };
        errors = {};
        onEvent?.('form_load', { ...original });
      } else {
        internalStatus = { message: res.message ?? 'Errore nel caricamento', type: 'error' };
      }
    } finally {
      loading = false;
      await tick();
      focusFirstField();
    }
  }

  // Reload when trigger or recordId genuinely changes.
  // - untrack(loadData): prevents accidental tracking of view.source etc.
  // - plain-var guard: prevents spurious re-runs when Svelte 5 re-sets props to same value
  //   (happens when parent StackContainer re-renders via spread {…page.props})
  $effect(() => {
    const _trigger = trigger;   // track trigger
    const _rid = recordId;      // track recordId
    void _rid;
    if (!isAsyncMode) return;
    if (hasTriggerDeps && _trigger === undefined) return;
    if (!_neverLoaded && _trigger === _seenTrigger && _rid === _seenRecordId) return;
    _seenTrigger = _trigger;
    _seenRecordId = _rid;
    _neverLoaded = false;
    untrack(() => loadData());
  });

  // ── Save / Cancel ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validateAll()) {
      focusFirstError();
      return;
    }
    saving = true;
    internalStatus = undefined;
    try {
      const src = view.source;
      let res;

      if (isModelMode) {
        // Step C: DB CRUD via standard endpoint — only send declared form fields
        const fieldNames = new Set(flatFields.map(f => f.name));
        const payload = Object.fromEntries(Object.entries(draft).filter(([k]) => fieldNames.has(k)));
        const id = resolveRecordId();
        if (id === null || id === undefined) {
          res = await api.endpoint('db', { table: src!.model, method: 'create', data: payload });
        } else {
          res = await api.endpoint('db', { table: src!.model, method: 'update', id, data: payload });
        }
      } else if (src?.save_endpoint) {
        // Step B: custom save endpoint
        res = await api.endpoint(src.save_endpoint, {
          ...resolvePass(src.pass ?? {}),
          data: { ...draft },
        });
      } else {
        // Step A: local callback, no backend
        await onSave?.({ ...draft });
        original = { ...draft };
        onEvent?.('form_save', { ...draft });
        return;
      }

      if (res.status !== 'success') {
        const errData = res.data as Record<string, unknown> | undefined;
        if (errData?.errors) {
          errors = errData.errors as Record<string, string>;
          focusFirstError();
        } else {
          internalStatus = { message: res.message ?? 'Errore nel salvataggio', type: 'error' };
        }
        return;
      }

      // Merge saved data back if returned (e.g. server-assigned fields)
      if (res.data && typeof res.data === 'object') {
        original = { ...draft, ...(res.data as Record<string, unknown>) };
        draft = { ...original };
      } else {
        original = { ...draft };
      }
      internalStatus = { message: 'Salvato', type: 'success' };
      setTimeout(() => { if (internalStatus?.type === 'success') internalStatus = undefined; }, 3000);
      onEvent?.('form_save', { ...original });
      await onSave?.({ ...original });
    } finally {
      saving = false;
    }
  }

  function handleCancel() {
    if (dirty && !confirm('Hai modifiche non salvate. Vuoi annullarle?')) return;
    draft = { ...original };
    errors = {};
    onCancel?.();
    onEvent?.('form_discard', { ...original });
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  function handleContainerKeydown(e: KeyboardEvent) {
    if (!isEditable) return;
    if (e.key === 'Escape') {
      e.stopPropagation();
      handleCancel();
    } else if (e.key === 'F12' || (e.key === 'Enter' && e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  }

  // Enter in a plain text/number input → advance to next focusable in field area
  function handleFieldAreaKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter') return;
    const target = e.target as HTMLElement;
    if (
      target instanceof HTMLInputElement &&
      target.type !== 'submit' &&
      target.type !== 'button'
    ) {
      e.preventDefault();
      advanceFocus(target);
    }
  }

  function advanceFocus(from: HTMLElement) {
    if (!fieldAreaEl) return;
    const focusables = Array.from(fieldAreaEl.querySelectorAll<HTMLElement>(FOCUSABLE_SEL));
    const idx = focusables.indexOf(from);
    if (idx >= 0 && idx < focusables.length - 1) {
      focusables[idx + 1].focus();
    }
  }

  // ── Focus management ───────────────────────────────────────────────────────

  let fieldAreaEl: HTMLDivElement;

  // Includes bits-ui DatePicker segments ([data-segment]) in addition to native inputs.
  const FOCUSABLE_SEL =
    'input:not([disabled]):not([readonly]):not([type="hidden"]), ' +
    'textarea:not([disabled]):not([readonly]), ' +
    '[data-segment]:not([data-segment="literal"])';

  function focusFirstField() {
    if (!isEditable || !fieldAreaEl) return;
    const autofocusName = view.source?.autofocus;
    if (autofocusName) {
      const el = fieldAreaEl.querySelector<HTMLElement>(`[data-field="${autofocusName}"] ${FOCUSABLE_SEL}`);
      el?.focus();
    } else {
      fieldAreaEl.querySelector<HTMLElement>(FOCUSABLE_SEL)?.focus();
    }
  }

  function focusFirstError() {
    if (!fieldAreaEl) return;
    const firstName = Object.keys(errors)[0];
    if (!firstName) return;
    fieldAreaEl.querySelector<HTMLElement>(`[data-field="${firstName}"] ${FOCUSABLE_SEL}`)?.focus();
  }

  // Local mode: focus at mount. Async modes: focus after loadData() completes.
  onMount(() => {
    if (!isAsyncMode) focusFirstField();
  });

  // ── Toolbar layout (policy overrides global defaults) ─────────────────────

  const formCfg = getConfig().form;
  let toolbarPosition = $derived(policy.toolbar_position ?? formCfg.toolbar_position);
  let buttonAlign = $derived(policy.button_align ?? formCfg.button_align);
  let buttonStyle = $derived(policy.button_style ?? formCfg.button_style);

  // ── Toolbar ────────────────────────────────────────────────────────────────

  let toolbarActions = $derived(
    (() => {
      const items = view.actions?.toolbar ?? (isEditable ? ['save', 'cancel'] : []);
      return items.map((item) => (typeof item === 'string' ? { id: item } : item));
    })()
  );

  const STATUS_ICON: Record<string, string> = {
    info: 'ℹ',
    warning: '⚠',
    error: '✕',
    success: '✓'
  };
  const STATUS_COLOR: Record<string, string> = {
    info: 'text-blue-600',
    warning: 'text-amber-600',
    error: 'text-danger',
    success: 'text-green-600'
  };
</script>

<!-- Container: F12 / Ctrl+Enter / Escape handled here -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="flex h-full flex-col overflow-hidden"
  onkeydown={handleContainerKeydown}
  role="region"
  aria-label={view.title ?? 'Form'}
>
  {#if showToolbar && toolbarPosition === 'top'}
    {@render toolbar('bottom')}
  {/if}

  <!-- ── Field area ──────────────────────────────────────────────────────── -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={fieldAreaEl}
    class="relative min-h-0 flex-1 overflow-y-auto p-4"
    onkeydown={handleFieldAreaKeydown}
    role="form"
  >
    {#if waitingForTrigger}
      <!-- Placeholder: trigger not yet arrived -->
      <div class="flex h-full items-center justify-center">
        <p style="color: var(--cf-text-subtle)" class="text-sm">
          Seleziona un elemento per visualizzare il dettaglio.
        </p>
      </div>

    {:else if loading}
      <!-- Loading overlay -->
      <div class="flex h-full items-center justify-center gap-2"
           style="color: var(--cf-text-subtle)">
        <Loader size={16} class="animate-spin" />
        <span class="text-sm">Caricamento…</span>
      </div>

    {:else if view.layout}
      {@render renderLayout(view.layout as LayoutNode[])}

    {:else}
      {#if fieldGroups.length === 0}
        <p class="text-sm" style="color: var(--cf-text-subtle)">
          Nessun campo configurato.
        </p>
      {/if}

      {#each fieldGroups as group (group[0].name)}
        {#if group.length === 1}
          <div class="mb-4" data-field={group[0].name}>
            {@render fieldContent(group[0])}
          </div>
        {:else}
          <div class="mb-4 flex gap-4">
            {#each group as field (field.name)}
              <div style={fieldWidthStyle(field)} data-field={field.name}>
                {@render fieldContent(field)}
              </div>
            {/each}
          </div>
        {/if}
      {/each}
    {/if}
  </div>

  {#if showToolbar && toolbarPosition === 'bottom'}
    {@render toolbar('top')}
  {/if}
</div>

<!-- ── Toolbar snippet ───────────────────────────────────────────────────── -->
{#snippet toolbar(borderSide: 'top' | 'bottom')}
  <div
    class="flex flex-shrink-0 items-center gap-2 bg-gray-50 px-4 py-2
    {borderSide === 'top' ? 'border-t' : 'border-b'} border-gray-200"
  >
    {#if buttonAlign === 'right'}
      <!-- Status on LEFT (flex-1 absorbs space), buttons pinned RIGHT -->
      <div class="flex flex-1 items-center gap-2">
        {@render statusArea()}
        {#if toolbarExtra}{@render toolbarExtra()}{/if}
      </div>
      <div class="flex items-center gap-2">
        {@render actionButtons()}
      </div>
    {:else}
      <!-- Buttons on LEFT, status on RIGHT (flex-1 absorbs space) -->
      {@render actionButtons()}
      <div class="flex flex-1 items-center justify-end gap-3">
        {@render statusArea()}
        {#if toolbarExtra}{@render toolbarExtra()}{/if}
      </div>
    {/if}
  </div>
{/snippet}

<!-- ── Action buttons snippet ───────────────────────────────────────────── -->
{#snippet actionButtons()}
  {#if isEditable}
    {#each toolbarActions as action (action.id)}
      {#if action.id === 'save'}
        <button
          class="btn btn-primary py-1.5 text-xs"
          disabled={!dirty || saving}
          onclick={handleSave}
          title="Conferma (F12 o Ctrl+Enter)"
        >
          {#if buttonStyle === 'icon' || buttonStyle === 'icon-label'}
            <Check size={14} />
          {/if}
          {#if buttonStyle !== 'icon'}
            {saving ? 'Salvataggio…' : (action.label ?? 'Conferma')}
          {/if}
        </button>
      {:else if action.id === 'cancel'}
        <button
          class="btn btn-secondary py-1.5 text-xs"
          disabled={saving}
          onclick={handleCancel}
          title="Annulla (Esc)"
        >
          {#if buttonStyle === 'icon' || buttonStyle === 'icon-label'}
            <X size={14} />
          {/if}
          {#if buttonStyle !== 'icon'}
            {action.label ?? 'Annulla'}
          {/if}
        </button>
      {:else if action.id === 'separator'}
        <span class="mx-1 h-5 border-l border-gray-200"></span>
      {:else}
        <!-- Custom action — extended in Step B/C -->
        <button class="btn btn-secondary py-1.5 text-xs" disabled>
          {action.label ?? action.id}
        </button>
      {/if}
    {/each}
  {/if}
{/snippet}

<!-- ── Status area snippet ───────────────────────────────────────────────── -->
{#snippet statusArea()}
  {@const activeStatus = internalStatus ?? status}
  {#if activeStatus}
    <span class="flex items-center gap-1 text-xs {STATUS_COLOR[activeStatus.type ?? 'info']}">
      <span aria-hidden="true">{STATUS_ICON[activeStatus.type ?? 'info']}</span>
      {activeStatus.message}
    </span>
  {:else if dirty && isEditable}
    <span class="text-xs" style="color: var(--cf-text-subtle)">Modifiche non salvate</span>
  {/if}
{/snippet}

<!-- ── Field content snippet ────────────────────────────────────────────── -->
{#snippet fieldContent(field: FormField)}
  {@const fieldReadonly = !isEditable || field.readonly === true}
  {@const error = errors[field.name]}
  {@const widgetType = resolveWidget(field)}

  <!-- Label (not for boolean — boolean has its own inline label) -->
  {#if widgetType !== 'boolean'}
    <label for="field-{field.name}" class="mb-1 block text-sm font-medium text-gray-700">
      {field.label ?? field.name}
      {#if field.required && isEditable}
        <span class="ml-0.5 text-danger">*</span>
      {/if}
    </label>
  {/if}

  <!-- Widget -->
  <div id="field-{field.name}">
    {#if widgetType === 'text' || widgetType === 'password'}
      <WidgetText
        value={draft[field.name]}
        onchange={(v) => patch(field.name, v)}
        onblur={() => validateField(field.name)}
        readonly={fieldReadonly}
        type={widgetType}
        {field}
      />
    {:else if widgetType === 'textarea'}
      <WidgetTextarea
        value={draft[field.name]}
        onchange={(v) => patch(field.name, v)}
        onblur={() => validateField(field.name)}
        readonly={fieldReadonly}
        {field}
      />
    {:else if widgetType === 'number'}
      <WidgetNumber
        value={draft[field.name]}
        onchange={(v) => patch(field.name, v)}
        onblur={() => validateField(field.name)}
        readonly={fieldReadonly}
        {field}
      />
    {:else if widgetType === 'date' || widgetType === 'datetime'}
      <WidgetDate
        value={draft[field.name]}
        onchange={(v) => patch(field.name, v)}
        onblur={() => validateField(field.name)}
        readonly={fieldReadonly}
        granularity={widgetType === 'datetime' ? ((field.granularity as string) ?? 'minute') : 'day'}
        {field}
      />
    {:else if widgetType === 'time'}
      <WidgetText
        value={draft[field.name]}
        onchange={(v) => patch(field.name, v)}
        onblur={() => validateField(field.name)}
        readonly={fieldReadonly}
        type="time"
        {field}
      />
    {:else if widgetType === 'boolean'}
      <div class="flex items-center gap-3">
        <WidgetBoolean
          value={draft[field.name]}
          onchange={(v) => patch(field.name, v)}
          onblur={() => validateField(field.name)}
          readonly={fieldReadonly}
          {field}
        />
        <span class="text-sm font-medium text-gray-700">
          {field.label ?? field.name}
          {#if field.required && isEditable}
            <span class="ml-0.5 text-danger">*</span>
          {/if}
        </span>
      </div>
    {:else if widgetType === 'combobox'}
      <WidgetCombobox
        value={draft[field.name]}
        onchange={(v) => patch(field.name, v)}
        onblur={() => validateField(field.name)}
        readonly={fieldReadonly}
        {field}
      />
    {:else if widgetType === 'fk'}
      <WidgetFKCombobox
        value={draft[field.name]}
        onchange={(v) => patch(field.name, v)}
        onblur={() => validateField(field.name)}
        readonly={fieldReadonly}
        {field}
      />
    {:else}
      <WidgetText
        value={draft[field.name]}
        onchange={(v) => patch(field.name, v)}
        onblur={() => validateField(field.name)}
        readonly={fieldReadonly}
        {field}
      />
    {/if}
  </div>

  <!-- Error or help -->
  {#if error}
    <p class="mt-1 text-xs text-danger">{error}</p>
  {:else if field.help}
    <p class="mt-1 text-xs text-gray-500">{field.help as string}</p>
  {/if}
{/snippet}

<!-- ── Layout engine snippets ─────────────────────────────────────────────── -->

{#snippet renderLayout(nodes: LayoutNode[])}
  {#each nodes as node}
    {#if 'name' in node}
      <div class="mb-4" data-field={(node as FormField).name}>
        {@render fieldContent(node as FormField)}
      </div>
    {:else if node.type === 'section'}
      {@render sectionNode(node as SectionNode)}
    {:else if node.type === 'hr'}
      <hr class="my-4" style="border-color: var(--cf-border)" />
    {:else if node.type === 'label'}
      {@render labelNode(node as LabelNode)}
    {:else if node.type === 'tabs'}
      {@render tabsNode(node as TabsNode)}
    {:else if node.type === 'row'}
      {@render rowNode(node as RowNode)}
    {/if}
  {/each}
{/snippet}

{#snippet columnFields(fields: (SectionField | FillerField)[])}
  <div class="flex flex-wrap gap-x-4">
    {#each fields as item}
      {#if 'filler' in item}
        <div style="flex: 0 0 100%; height: 0"></div>
      {:else}
        {@const f = item as SectionField}
        <div
          class="mb-4 min-w-0"
          style={f.width ? `flex: 0 0 ${f.width}` : 'flex: 1 1 0'}
          data-field={f.name}
        >
          {@render fieldContent(f)}
        </div>
      {/if}
    {/each}
  </div>
{/snippet}

{#snippet sectionGrid(node: SectionNode)}
  {#if Array.isArray(node.columns)}
    {@const colDefs = node.columns as ColumnDef[]}
    <div class="flex gap-6" style="flex-wrap: wrap">
      {#each colDefs as col}
        <div style="flex: 1 1 var(--cf-form-col-min, 15rem); min-width: 0">
          {@render columnFields(col.fields)}
        </div>
      {/each}
    </div>
  {:else}
    {@const cols = (node.columns as number | undefined) ?? 1}
    <div
      class="grid gap-x-4 gap-y-0"
      style={cols === 1
        ? 'grid-template-columns: 1fr'
        : `grid-template-columns: repeat(auto-fit, minmax(max(calc(100% / ${cols} - 1rem), var(--cf-form-col-min, 15rem)), 1fr))`}
    >
      {#each ((node as any).fields ?? []) as field (field.name)}
        <div class="mb-4" data-field={field.name}>
          {@render fieldContent(field as FormField)}
        </div>
      {/each}
    </div>
  {/if}
{/snippet}

{#snippet sectionNode(node: SectionNode)}
  {#if node.border}
    <fieldset
      class="mb-4 rounded px-4 pb-2 pt-1"
      style="border: 1px solid var(--cf-border)"
    >
      {#if node.label}
        <legend class="px-2 text-sm font-semibold" style="color: var(--cf-text)">
          {node.label}
        </legend>
      {/if}
      {@render sectionGrid(node)}
    </fieldset>
  {:else}
    <div class="mb-2">
      {#if node.label}
        <p class="mb-2 text-sm font-semibold" style="color: var(--cf-text)">{node.label}</p>
      {/if}
      {@render sectionGrid(node)}
    </div>
  {/if}
{/snippet}

{#snippet labelNode(node: LabelNode)}
  {#if node.style === 'heading'}
    <h3 class="mb-3 mt-1 text-base font-semibold" style="color: var(--cf-text)">{node.text}</h3>
  {:else if node.style === 'subheading'}
    <h4 class="mb-2 mt-1 text-sm font-semibold" style="color: var(--cf-text)">{node.text}</h4>
  {:else}
    <p class="mb-2 text-sm" style="color: var(--cf-text-subtle)">{node.text}</p>
  {/if}
{/snippet}

{#snippet tabsNode(node: TabsNode)}
  {@const tabKey = node.id ?? node.pages.map((p) => p.label).join('|')}
  {@const activeIdx = tabStates[tabKey] ?? 0}
  <div class="mb-4">
    <div class="flex border-b" style="border-color: var(--cf-border)">
      {#each node.pages as page, i}
        <button
          type="button"
          class="-mb-px border-b-2 px-4 py-2 text-sm transition-colors"
          style={i === activeIdx
            ? 'border-color: var(--cf-brand, #3b82f6); color: var(--cf-brand, #3b82f6); font-weight: 500'
            : 'border-color: transparent; color: var(--cf-text-subtle)'}
          onclick={() => { tabStates[tabKey] = i; }}
        >
          {page.label}
        </button>
      {/each}
    </div>
    {#each node.pages as page, i}
      <div class={i === activeIdx ? 'pt-4' : 'hidden'}>
        {@render renderLayout(page.layout)}
      </div>
    {/each}
  </div>
{/snippet}

{#snippet rowNode(node: RowNode)}
  <div class="mb-4 flex gap-4">
    {#each node.children as col}
      <div style="flex: {col.weight ?? 1} 1 0; min-width: 0">
        {@render renderLayout(col.layout)}
      </div>
    {/each}
  </div>
{/snippet}
