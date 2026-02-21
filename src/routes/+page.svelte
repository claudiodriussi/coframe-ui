<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore } from '$coframe/auth/store.svelte';

  let ready = $state(false);

  onMount(() => {
    authStore.checkAuth();
    ready = true;
  });

  function handleLogout() {
    authStore.logout();
  }
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
  {#if ready}
    <div class="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm text-center">
      <h1 class="mb-2 text-2xl font-semibold text-gray-900">Coframe</h1>
      <p class="mb-8 text-sm text-gray-500">Sistema gestionale data-driven</p>

      {#if authStore.isAuthenticated}
        <p class="mb-6 text-sm text-gray-600">
          Benvenuto, <span class="font-medium">{authStore.user?.username}</span>
        </p>
        <div class="space-y-3">
          <a href="/app" class="btn btn-primary w-full">App</a>
          <a href="/playground" class="btn btn-secondary w-full">Playground</a>
          <button onclick={handleLogout} class="btn btn-danger w-full">Logout</button>
        </div>
      {:else}
        <a href="/login" class="btn btn-primary w-full">Login</a>
      {/if}
    </div>
  {/if}
</div>
