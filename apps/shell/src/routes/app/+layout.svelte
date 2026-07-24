<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$coframe/auth/store.svelte';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';
  import { loadLocale } from '$coframe/i18n';
  import MessageBox from '$coframe/components/MessageBox.svelte';
  import Chrome from '$coframe/chrome/Chrome.svelte';
  import { setPluginLoader } from '$coframe/plugins/context';
  import { pluginLoader } from '$app-plugins/registry';
  import '$app-plugins/formatters';

  setPluginLoader(pluginLoader);

  let { children } = $props();

  let ready = $state(false);

  onMount(async () => {
    authStore.checkAuth();
    if (!authStore.isAuthenticated) {
      goto('/login');
    } else {
      // Await server config so that reload_all_threshold and page_size are
      // available before any DataView renders. No-op if already loaded.
      await serverConfig.load();
      const locale = serverConfig.config?.locale ?? 'en';
      await loadLocale(locale);
      ready = true;
    }
  });
</script>

<MessageBox />

{#if ready}
  <Chrome blueprint="classic">
    {@render children()}
  </Chrome>
{/if}
