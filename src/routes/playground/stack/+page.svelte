<script lang="ts">
  import { onMount } from 'svelte';
  import StackContainer from '$coframe/stack/StackContainer.svelte';
  import { stack } from '$coframe/stack/stack.svelte';
  import FormPage from './FormPage.svelte';
  import BookList from './BookList.svelte';

  type Demo = 'form' | 'books';
  let demo = $state<Demo>('form');
  let stackLength = $state(0);
  stack.subscribe((pages) => (stackLength = pages.length));

  function startDemo(d: Demo) {
    demo = d;
    stack.clear();
    stack.push(d === 'form' ? FormPage : BookList);
  }

  onMount(() => {
    startDemo('form');
    return () => stack.clear();
  });
</script>

<div class="flex flex-col">
  <!-- Demo selector + depth -->
  <div class="mb-3 flex items-center justify-between">
    <div class="flex gap-2">
      <button
        onclick={() => startDemo('form')}
        class="rounded px-3 py-1 text-sm {demo === 'form'
          ? 'bg-blue-600 text-white'
          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}"
      >
        Form + Lookup
      </button>
      <button
        onclick={() => startDemo('books')}
        class="rounded px-3 py-1 text-sm {demo === 'books'
          ? 'bg-blue-600 text-white'
          : 'border border-gray-300 text-gray-600 hover:bg-gray-50'}"
      >
        Books (API)
      </button>
    </div>
    <span class="text-sm text-gray-400">
      depth: <span class="font-mono font-medium text-blue-600">{stackLength}</span>
    </span>
  </div>

  <div class="h-[560px] overflow-hidden rounded-lg border border-gray-200 shadow-sm">
    <StackContainer />
  </div>

  <p class="mt-3 text-xs text-gray-400">
    Back del browser: pop stack se depth &gt; 1, altrimenti torna al playground (un solo click).
  </p>
</div>

<a href="/playground" class="mt-4 block text-sm text-blue-600 hover:underline">← Playground</a>
