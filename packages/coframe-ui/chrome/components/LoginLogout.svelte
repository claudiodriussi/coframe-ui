<script lang="ts">
  import { goto } from '$app/navigation';
  import { authStore } from '$coframe/auth/store.svelte';

  function logout() {
    authStore.logout();
    goto('/login');
  }
</script>

{#if authStore.isAuthenticated}
  <button type="button" class="cf-authbtn" onclick={logout}>Logout</button>
{:else}
  <button type="button" class="cf-authbtn" onclick={() => goto('/login')}>Login</button>
{/if}

<style>
  .cf-authbtn {
    font-size: 0.8rem;
    color: var(--cf-text);
    border: 1px solid var(--cf-border-input);
    border-radius: 0.375rem;
    padding: 0.25rem 0.6rem;
    background: var(--cf-bg);
    cursor: pointer;
  }
  .cf-authbtn:hover {
    background: var(--cf-surface-hover);
  }
</style>
