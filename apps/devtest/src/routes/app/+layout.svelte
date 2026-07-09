<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$coframe/auth/store.svelte';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';
  import { loadLocale } from '$coframe/i18n';
  import MessageBox from '$coframe/components/MessageBox.svelte';
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
  <div class="flex min-h-screen">
    <!-- Sidebar -->
    <aside class="w-56 shrink-0 border-r border-gray-200 bg-white">
      <div class="p-4 text-sm font-semibold text-gray-900">Coframe</div>
      <nav class="px-2 text-sm text-gray-400">
        <!-- TODO: navigation items from plugin registry -->
        <div class="px-2 py-1">Navigation placeholder</div>
      </nav>
    </aside>

    <!-- Main content -->
    <main class="flex-1 bg-gray-50 p-6">
      {@render children()}
    </main>
  </div>
{/if}
