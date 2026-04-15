<script lang="ts">
  import type { FormField } from '../dataform.types';
  import { syncStringState } from './widget.svelte.ts';

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

<textarea
  class="input resize-y {field.error ? 'input-error' : ''} {readonly ? 'read-only:bg-gray-50 read-only:cursor-default read-only:text-gray-600' : ''}"
  rows={field.rows as number | undefined ?? 3}
  value={state.current}
  oninput={(e) => (state.current = (e.target as HTMLTextAreaElement).value)}
  onblur={handleBlur}
  {readonly}
  placeholder={field.placeholder as string | undefined}
  aria-label={field.label ?? field.name}
></textarea>
