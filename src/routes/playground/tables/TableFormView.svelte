<script lang="ts">
  import { stack } from '$coframe/stack/stack.svelte';
  import DataForm from '$coframe/components/DataForm.svelte';
  import type { FormDescriptor } from '$coframe/components/dataform.types';

  let {
    formDescriptor,
    recordId = null,
    tableName = '',
    onSaved,
  }: {
    formDescriptor: FormDescriptor;
    recordId: number | string | null;
    tableName: string;
    onSaved: () => void;
  } = $props();

  const isNew = $derived(recordId === null);
  const title = $derived(isNew ? `Nuovo ${tableName}` : `Modifica ${tableName}`);

  function handleSave() {
    onSaved();
    stack.pop();
  }

  function handleCancel() {
    stack.pop();
  }
</script>

<div class="flex h-full flex-col bg-white">
  <div class="flex flex-shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-2">
    <button
      onclick={() => stack.pop()}
      class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      title="Torna alla lista"
    >
      ←
    </button>
    <h2 class="text-sm font-semibold text-gray-700">{title}</h2>
  </div>

  <div class="min-h-0 flex-1 overflow-auto p-4">
    <DataForm
      view={formDescriptor}
      {recordId}
      onSave={handleSave}
      onCancel={handleCancel}
    />
  </div>
</div>
