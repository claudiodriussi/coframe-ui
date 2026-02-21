<script lang="ts">
  import { onMount } from 'svelte';
  import { stack } from '$coframe/stack/stack.svelte';
  import { api } from '$coframe/api/client';

  interface Book {
    id: number;
    title: string;
    isbn?: string;
    author_id?: number;
    published_date?: string;
  }
  interface Author {
    id: number;
    name: string;
    birth_date?: string;
  }

  interface Props {
    bookId: number;
  }
  let { bookId }: Props = $props();

  let book = $state<Book | null>(null);
  let author = $state<Author | null>(null);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    const bookRes = await api.endpoint<Book>('db', { table: 'Book', method: 'get', id: bookId });
    if (bookRes.status === 'success' && bookRes.data) {
      book = bookRes.data;
      if (book.author_id) {
        const authorRes = await api.endpoint<Author>('db', { table: 'Author', method: 'get', id: book.author_id });
        if (authorRes.status === 'success') author = authorRes.data ?? null;
      }
    } else {
      error = bookRes.message ?? 'Failed to load book';
    }
    loading = false;
  });
</script>

<div class="flex h-full flex-col bg-white p-6">
  <div class="mb-5 flex items-center justify-between">
    <h2 class="text-xl font-semibold text-gray-800">Book Details</h2>
    <button
      onclick={() => stack.pop()}
      class="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100"
    >
      ← Back
    </button>
  </div>

  {#if loading}
    <div class="flex flex-1 items-center justify-center text-gray-400">Loading…</div>
  {:else if error}
    <div class="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
  {:else if book}
    <div class="flex-1 overflow-auto">
      <div class="space-y-4 rounded-lg bg-gray-50 p-5">
        <div>
          <p class="mb-1 text-xs font-medium uppercase text-gray-500">Title</p>
          <p class="text-lg font-semibold text-gray-900">{book.title}</p>
        </div>
        {#if book.isbn}
          <div>
            <p class="mb-1 text-xs font-medium uppercase text-gray-500">ISBN</p>
            <p class="text-gray-800">{book.isbn}</p>
          </div>
        {/if}
        {#if book.published_date}
          <div>
            <p class="mb-1 text-xs font-medium uppercase text-gray-500">Published</p>
            <p class="text-gray-800">{book.published_date}</p>
          </div>
        {/if}
        {#if author}
          <div class="border-t border-gray-200 pt-4">
            <p class="mb-2 text-xs font-medium uppercase text-gray-500">Author</p>
            <div class="rounded-lg border border-gray-200 bg-white p-4">
              <p class="font-medium text-gray-900">{author.name}</p>
              {#if author.birth_date}
                <p class="mt-1 text-sm text-gray-500">Born: {author.birth_date}</p>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
