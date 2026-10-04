<script lang="ts">
  import { authStore } from '$kitebase/auth/store.svelte';
</script>

{#if authStore.user}
  <span class="kb-user" title={authStore.user.email ?? ''}>{authStore.user.username}</span>
{/if}

<style>
  .kb-user {
    font-size: 0.8rem;
    color: var(--kb-text-muted);
  }
</style>
