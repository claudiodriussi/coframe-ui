<script lang="ts">
  import { authStore } from '$kitebase/auth/store.svelte';
</script>

{#if authStore.isAuthenticated}
  <button type="button" class="kb-authbtn" onclick={() => authStore.leave()}>Logout</button>
{:else}
  <button type="button" class="kb-authbtn" onclick={() => authStore.toLogin()}>Login</button>
{/if}

<style>
  .kb-authbtn {
    font-size: 0.8rem;
    color: var(--kb-text);
    border: 1px solid var(--kb-border-input);
    border-radius: 0.375rem;
    padding: 0.25rem 0.6rem;
    background: var(--kb-bg);
    cursor: pointer;
  }
  .kb-authbtn:hover {
    background: var(--kb-surface-hover);
  }
</style>
