<script lang="ts">
  import { authStore } from '$coframe/auth/store.svelte';
</script>

{#if authStore.user}
  <span class="cf-user" title={authStore.user.email ?? ''}>{authStore.user.username}</span>
{/if}

<style>
  .cf-user {
    font-size: 0.8rem;
    color: var(--cf-text-muted);
  }
</style>
