<script lang="ts">
  import type { FormField } from '../dataform.types';
  import { syncStringState, dispatchEnter } from './widget.svelte.ts';

  interface Props {
    value: unknown;
    onchange: (v: number | null) => void;
    onblur?: () => void;
    readonly?: boolean;
    field: FormField;
  }

  let { value, onchange, onblur, readonly = false, field }: Props = $props();

  const state = syncStringState(() => value);

  let prefix = $derived((field.widget_props?.prefix as string | undefined) ?? '');
  let suffix = $derived((field.widget_props?.suffix as string | undefined) ?? '');
  let step = $derived(
    field.type === 'Int' || field.type === 'int' ? '1' : 'any'
  );

  function handleBlur() {
    if (state.current === '') {
      onchange(null);
    } else {
      const n = parseFloat(state.current);
      onchange(isNaN(n) ? null : n);
    }
    onblur?.();
  }
</script>

<div class="relative flex items-center">
  {#if prefix}
    <span class="absolute left-3 select-none text-sm text-gray-400">{prefix}</span>
  {/if}

  <input
    type="number"
    class="input {field.error ? 'input-error' : ''} {readonly ? 'read-only:bg-gray-50 read-only:cursor-default read-only:text-gray-600' : ''}
           {prefix ? 'pl-8' : ''} {suffix ? 'pr-8' : ''}"
    value={state.current}
    oninput={(e) => (state.current = (e.target as HTMLInputElement).value)}
    onblur={handleBlur}
    onkeydown={dispatchEnter}
    {readonly}
    {step}
    min={field.widget_props?.min as number | undefined}
    max={field.widget_props?.max as number | undefined}
    placeholder={field.placeholder as string | undefined}
    aria-label={field.label ?? field.name}
  />

  {#if suffix}
    <span class="absolute right-3 select-none text-sm text-gray-400">{suffix}</span>
  {/if}
</div>
