<script lang="ts">
  import { Switch } from 'bits-ui';
  import type { FormField } from '../dataform.types';

  interface Props {
    value: unknown;
    onchange: (v: boolean) => void;
    onblur?: () => void;
    readonly?: boolean;
    field: FormField;
  }

  let { value, onchange, onblur, readonly = false, field }: Props = $props();

  let checked = $derived(Boolean(value));
</script>

{#if readonly}
  <span
    class="inline-flex items-center gap-1.5 text-sm text-gray-700"
    aria-label={field.label ?? field.name}
  >
    <span
      class="inline-block h-4 w-4 rounded-sm border {checked ? 'border-brand bg-brand' : 'border-gray-300 bg-white'}"
    ></span>
    {checked ? 'Sì' : 'No'}
  </span>

{:else}
  <Switch.Root
    checked={checked}
    onCheckedChange={(v) => { onchange(v); onblur?.(); }}
    class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors
           bg-gray-300 data-[state=checked]:bg-brand
           focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1"
    aria-label={field.label ?? field.name}
  >
    <Switch.Thumb
      class="block h-4 w-4 translate-x-1 rounded-full bg-white shadow transition-transform
             data-[state=checked]:translate-x-6"
    />
  </Switch.Root>
{/if}
