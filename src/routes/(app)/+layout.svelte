<script lang="ts">
  // TODO: auth guard - redirect to /login if not authenticated
  // import { authStore } from '$coframe/auth/store.svelte';
  let { children } = $props();
</script>

{@render children()}
