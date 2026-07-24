<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$coframe/auth/store.svelte';
  import { serverConfig } from '$coframe/api/serverConfig.svelte';
  import { loadLocale } from '$coframe/i18n';
  import MessageBox from '$coframe/components/MessageBox.svelte';
  import MenuSidebar from '$coframe/components/MenuSidebar.svelte';
  import StackContainer from '$coframe/stack/StackContainer.svelte';
  import { stack } from '$coframe/stack/stack.svelte';
  import { setPluginLoader } from '$coframe/plugins/context';
  import { pluginLoader } from '$app-plugins/registry';
  import '$app-plugins/formatters';

  setPluginLoader(pluginLoader);

  let { children } = $props();

  let ready = $state(false);

  function handleLogout() {
    authStore.logout();
    goto('/login');
  }

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
  <!-- Chrome root: h-screen + overflow-hidden (UI_ARCHITECTURE §2.4 R1/R2) -->
  <div class="flex h-screen flex-col overflow-hidden">
    <div class="flex flex-1 min-h-0">
      <!-- Sidebar -->
      <aside class="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div class="p-4 text-sm font-semibold text-gray-900">Coframe</div>
        <div class="min-h-0 flex-1 overflow-y-auto">
          <MenuSidebar />
        </div>
        <!-- Footer: current user + logout (app-only flow, no landing card) -->
        <div class="border-t border-gray-200 p-3">
          {#if authStore.user}
            <div class="mb-2 truncate px-1 text-xs text-gray-500">{authStore.user.username}</div>
          {/if}
          <button onclick={handleLogout} class="btn btn-secondary w-full text-sm">Logout</button>
        </div>
      </aside>

      <!-- Main content (Desktop, single-tab for now) -->
      <main class="relative flex-1 min-h-0 overflow-hidden bg-gray-50">
        <div class="h-full overflow-auto p-6">
          {@render children()}
        </div>
        {#if $stack.length > 0}
          <div class="absolute inset-0 bg-white">
            <StackContainer />
          </div>
        {/if}
      </main>
    </div>
  </div>
{/if}
