<script lang="ts">
  // Entry router: coframe is app-only, so `/` never renders a landing —
  // it sends you straight to the app (authenticated) or the login form.
  // An app with a public part would override this route with its own page.
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$coframe/auth/store.svelte';

  onMount(() => {
    authStore.checkAuth();
    goto(authStore.isAuthenticated ? '/app' : '/login', { replaceState: true });
  });
</script>
