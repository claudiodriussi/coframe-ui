<script lang="ts">
  import { onMount } from 'svelte';
  import { stack } from '$coframe/stack/stack.svelte';
  import { api } from '$coframe/api/client';
  import BookDetail from './BookDetail.svelte';

  interface Book {
    id: number;
    title: string;
    isbn?: string;
    author_id?: number;
    published_date?: string;
  }

  let books = $state<Book[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    const res = await api.endpoint<{ records: Book[] }>('db', { table: 'Book', method: 'get' });
    if (res.status === 'success' && res.data) {
      books = res.data.records;
    } else {
      error = res.message ?? 'Failed to load books';
    }
    loading = false;
  });

  function openDetail(book: Book) {
    stack.push(BookDetail, { bookId: book.id });
  }
</script>

<div class="flex h-full flex-col bg-white p-6">
  <h2 class="mb-4 text-xl font-semibold text-gray-800">Library — Books</h2>

  {#if loading}
    <div class="flex flex-1 items-center justify-center text-gray-400">Loading…</div>
  {:else if error}
    <div class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
  {:else if books.length === 0}
    <div class="flex flex-1 items-center justify-center text-gray-400">No books found.</div>
  {:else}
    <div class="flex-1 overflow-auto">
      <div class="grid gap-3">
        {#each books as book}
          <button
            onclick={() => openDetail(book)}
            class="rounded-lg border border-gray-200 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50"
          >
            <p class="font-medium text-gray-800">{book.title}</p>
            {#if book.isbn}
              <p class="mt-0.5 text-sm text-gray-500">ISBN: {book.isbn}</p>
            {/if}
            {#if book.published_date}
              <p class="mt-0.5 text-sm text-gray-400">{book.published_date}</p>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
