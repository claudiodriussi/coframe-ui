<script lang="ts">
  // Entry router: kitebase is app-only, so `/` never renders a landing —
  // it sends you straight to the app (authenticated) or the login form.
  // An app with a public part would override this route with its own page.
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { authStore } from '$kitebase/auth/store.svelte';

  onMount(async () => {
    if (await authStore.start()) goto(`${base}/app`, { replaceState: true });
    else authStore.toLogin();
  });
</script>
