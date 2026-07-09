<script lang="ts">
  import type { FormField } from '../dataform.types';
  import { syncStringState, dispatchEnter } from './widget.svelte.ts';

  interface Props {
    value: unknown;
    onchange: (v: string | null) => void;
    onblur?: () => void;
    readonly?: boolean;
    type?: string;
    field: FormField;
  }

  let { value, onchange, onblur, readonly = false, type = 'text', field }: Props = $props();

  const state = syncStringState(() => value);

  function handleBlur() {
    onchange(state.current === '' ? null : state.current);
    onblur?.();
  }
</script>

{#if readonly}
  <span class="cf-widget-ro">{state.current ?? ''}</span>
{:else}
  <input
    type={type}
    class="input {field.error ? 'input-error' : ''}"
    value={state.current}
    oninput={(e) => { state.current = (e.target as HTMLInputElement).value; onchange(state.current === '' ? null : state.current); }}
    onblur={handleBlur}
    onkeydown={dispatchEnter}
    placeholder={field.placeholder as string | undefined}
    maxlength={field.max_length as number | undefined}
    aria-label={field.label ?? field.name}
  />
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
