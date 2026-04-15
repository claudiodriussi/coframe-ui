<script lang="ts">
  import type { FormField } from '../dataform.types';
  import { syncStringState, dispatchEnter } from './widget.svelte.ts';

  interface Props {
    value: unknown;
    onchange: (v: string | null) => void;
    onblur?: () => void;
    readonly?: boolean;
    field: FormField;
  }

  let { value, onchange, onblur, readonly = false, field }: Props = $props();

  const state = syncStringState(() => value);

  function handleBlur() {
    onchange(state.current === '' ? null : state.current);
    onblur?.();
  }
</script>

<input
  type="text"
  class="input {field.error ? 'input-error' : ''} {readonly ? 'read-only:bg-gray-50 read-only:cursor-default read-only:text-gray-600' : ''}"
  value={state.current}
  oninput={(e) => (state.current = (e.target as HTMLInputElement).value)}
  onblur={handleBlur}
  onkeydown={dispatchEnter}
  {readonly}
  placeholder={field.placeholder as string | undefined}
  maxlength={field.max_length as number | undefined}
  aria-label={field.label ?? field.name}
/>
