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

{#if readonly}
  <span class="cf-widget-ro">{state.current ?? ''}{suffix ? ` ${suffix}` : ''}</span>
{:else}
  <div class="relative flex items-center">
    {#if prefix}
      <span class="absolute left-3 select-none text-sm text-gray-400">{prefix}</span>
    {/if}
    <input
      type="number"
      class="input {field.error ? 'input-error' : ''} {prefix ? 'pl-8' : ''} {suffix ? 'pr-8' : ''}"
      value={state.current}
      oninput={(e) => { state.current = (e.target as HTMLInputElement).value; const n = parseFloat(state.current); if (state.current === '' || !isNaN(n)) onchange(state.current === '' ? null : n); }}
      onblur={handleBlur}
      onkeydown={dispatchEnter}
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
{/if}

<style>
  .cf-widget-ro {
    display: block;
    padding: 0.4rem 0;
    font-size: 0.875rem;
    color: var(--cf-text);
    min-height: 2rem;
    line-height: 1.5;
  }
</style>
