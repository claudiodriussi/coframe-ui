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
  import { onMount, untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import WidgetText from './widgets/WidgetText.svelte';
  import WidgetTextarea from './widgets/WidgetTextarea.svelte';
  import WidgetNumber from './widgets/WidgetNumber.svelte';
  import WidgetDate from './widgets/WidgetDate.svelte';
  import WidgetBoolean from './widgets/WidgetBoolean.svelte';
  import WidgetCombobox from './widgets/WidgetCombobox.svelte';
  import type { FormDescriptor, FormField, FormStatus } from './dataform.types';

  // ── Props ──────────────────────────────────────────────────────────────────

  interface Props {
    view: FormDescriptor;
    data?: Record<string, unknown>;
    trigger?: Record<string, unknown>;
    status?: FormStatus;
    toolbarExtra?: Snippet;
    onEvent?: (name: string, data: unknown) => void;
    onSave?: (draft: Record<string, unknown>) => Promise<void> | void;
    onCancel?: () => void;
  }

  let { view, data = {}, trigger, status, toolbarExtra, onEvent, onSave, onCancel }: Props = $props();

  // ── Internal state ─────────────────────────────────────────────────────────

  // untrack: intentional — we capture data only at mount time (mode 4 local binding).
  // Parent remounts the form (via key=) to reset with new data.
  let original = $state<Record<string, unknown>>(untrack(() => ({ ...data })));
  let draft = $state<Record<string, unknown>>(untrack(() => ({ ...data })));
  let errors = $state<Record<string, string>>({});
  let saving = $state(false);

  // ── Derived ────────────────────────────────────────────────────────────────

  let policy = $derived(view.policy ?? {});
  let isEditable = $derived(policy.editable === true);

  // Flat fields only (group: are Phase 2 — filtered out here)
  let flatFields = $derived(
    (view.fields ?? []).filter((f): f is FormField => 'name' in f)
  );

  // Group fields by same_row: a field with same_row:true joins the previous group.
  let fieldGroups = $derived(groupFields(flatFields));

  // dirty: JSON comparison — $state proxy reads all props correctly
  let dirty = $derived(JSON.stringify(draft) !== JSON.stringify(original));

  // Show toolbar when editable or when there's external status/extra content
  let showToolbar = $derived(isEditable || !!status || !!toolbarExtra);

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
    const t = (field.type ?? '').toLowerCase();
    if (t === 'bool' || t === 'boolean') return 'boolean';
    if (t === 'date') return 'date';
    if (t === 'datetime') return 'date';
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

  // ── Save / Cancel ──────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validateAll()) {
      focusFirstError();
      return;
    }
    saving = true;
    try {
      await onSave?.({ ...draft });
      original = { ...draft };
      onEvent?.('form_save', { ...draft });
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
    if (target instanceof HTMLInputElement && target.type !== 'submit' && target.type !== 'button') {
      e.preventDefault();
      advanceFocus(target);
    }
  }

  function advanceFocus(from: HTMLElement) {
    if (!fieldAreaEl) return;
    const focusables = Array.from(
      fieldAreaEl.querySelectorAll<HTMLElement>(
        'input:not([disabled]):not([readonly]):not([type="hidden"]), ' +
        'textarea:not([disabled]):not([readonly])'
      )
    );
    const idx = focusables.indexOf(from);
    if (idx >= 0 && idx < focusables.length - 1) {
      focusables[idx + 1].focus();
    }
  }

  // ── Focus management ───────────────────────────────────────────────────────

  let fieldAreaEl: HTMLDivElement;

  function focusFirstError() {
    if (!fieldAreaEl) return;
    const firstName = Object.keys(errors)[0];
    if (!firstName) return;
    const el = fieldAreaEl.querySelector<HTMLElement>(
      `[data-field="${firstName}"] input, [data-field="${firstName}"] textarea`
    );
    el?.focus();
  }

  onMount(() => {
    if (!isEditable || !fieldAreaEl) return;
    const autofocusName = view.source?.autofocus;
    if (autofocusName) {
      const el = fieldAreaEl.querySelector<HTMLElement>(
        `[data-field="${autofocusName}"] input, [data-field="${autofocusName}"] textarea`
      );
      el?.focus();
    } else {
      const first = fieldAreaEl.querySelector<HTMLElement>(
        'input:not([disabled]):not([readonly]):not([type="hidden"]), textarea:not([disabled]):not([readonly])'
      );
      first?.focus();
    }
  });

  // ── Toolbar ────────────────────────────────────────────────────────────────

  let toolbarActions = $derived(
    (() => {
      const items = view.actions?.toolbar ?? (isEditable ? ['save', 'cancel'] : []);
      return items.map((item) =>
        typeof item === 'string' ? { id: item } : item
      );
    })()
  );

  const STATUS_ICON: Record<string, string> = {
    info: 'ℹ', warning: '⚠', error: '✕', success: '✓',
  };
  const STATUS_COLOR: Record<string, string> = {
    info: 'text-blue-600', warning: 'text-amber-600',
    error: 'text-danger', success: 'text-green-600',
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
  <!-- ── Toolbar ─────────────────────────────────────────────────────────── -->
  {#if showToolbar}
    <div class="flex flex-shrink-0 items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2">

      <!-- Action buttons (only when editable) -->
      {#if isEditable}
        {#each toolbarActions as action (action.id)}
          {#if action.id === 'save'}
            <button
              class="btn btn-primary py-1.5 text-xs"
              disabled={!dirty || saving}
              onclick={handleSave}
              title="Salva (F12 o Ctrl+Enter)"
            >
              {saving ? 'Salvataggio…' : (action.label ?? 'Salva')}
            </button>

          {:else if action.id === 'cancel'}
            <button
              class="btn btn-secondary py-1.5 text-xs"
              disabled={saving}
              onclick={handleCancel}
              title="Annulla (Esc)"
            >
              {action.label ?? 'Annulla'}
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

      <!-- Right side: status | toolbarExtra | dirty indicator -->
      <div class="ml-auto flex items-center gap-3">
        {#if status}
          <span class="flex items-center gap-1 text-xs {STATUS_COLOR[status.type ?? 'info']}">
            <span aria-hidden="true">{STATUS_ICON[status.type ?? 'info']}</span>
            {status.message}
          </span>
        {:else if dirty && isEditable}
          <span class="text-xs text-gray-400">Modifiche non salvate</span>
        {/if}

        {#if toolbarExtra}
          {@render toolbarExtra()}
        {/if}
      </div>

    </div>
  {/if}

  <!-- ── Field area ──────────────────────────────────────────────────────── -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    bind:this={fieldAreaEl}
    class="flex-1 min-h-0 overflow-y-auto p-4"
    onkeydown={handleFieldAreaKeydown}
    role="form"
  >
    {#if fieldGroups.length === 0}
      <p class="text-sm text-gray-400">Nessun campo configurato.</p>
    {/if}

    {#each fieldGroups as group (group[0].name)}
      {#if group.length === 1}
        <!-- ── Single field ── -->
        <div class="mb-4" data-field={group[0].name}>
          {@render fieldContent(group[0])}
        </div>

      {:else}
        <!-- ── Row of fields (same_row) ── -->
        <div class="mb-4 flex gap-4">
          {#each group as field (field.name)}
            <div style={fieldWidthStyle(field)} data-field={field.name}>
              {@render fieldContent(field)}
            </div>
          {/each}
        </div>
      {/if}
    {/each}
  </div>
</div>

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
    {#if widgetType === 'text'}
      <WidgetText
        value={draft[field.name]}
        onchange={(v) => patch(field.name, v)}
        onblur={() => validateField(field.name)}
        readonly={fieldReadonly}
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
