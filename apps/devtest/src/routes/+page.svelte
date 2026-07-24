<script lang="ts">
  // Entry router: same app-only flow as the shell (auth -> /app, else -> /login).
  // The playground stays reachable directly at /playground for dev work.
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$coframe/auth/store.svelte';

  onMount(() => {
    authStore.checkAuth();
    goto(authStore.isAuthenticated ? '/app' : '/login', { replaceState: true });
  });
</script>
