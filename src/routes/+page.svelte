<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$coframe/auth/store.svelte';

  let username = $state('');
  let password = $state('');

  onMount(() => {
    authStore.checkAuth();
    if (authStore.isAuthenticated) goto('/app');
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    const ok = await authStore.login({ username, password });
    if (ok) goto('/app');
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
  <div class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
    <h1 class="mb-6 text-2xl font-semibold text-gray-900">Coframe</h1>

    <form onsubmit={handleSubmit} class="space-y-4">
      <div>
        <label for="username" class="mb-1 block text-sm font-medium text-gray-700">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          required
          autocomplete="username"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label for="password" class="mb-1 block text-sm font-medium text-gray-700">Password</label>
        <input
          id="password"
          type="password"
          bind:value={password}
          required
          autocomplete="current-password"
          class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {#if authStore.error}
        <p class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{authStore.error}</p>
      {/if}

      <button
        type="submit"
        disabled={authStore.isLoading}
        class="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {authStore.isLoading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  </div>
</div>
