<script lang="ts">
  import { serverConfig } from '$coframe/api/serverConfig.svelte';

  // Seam: the app title. Today read from serverConfig.config (delivered by
  // get_server_config), falling back to 'Coframe'. Later this resolves through
  // env.config('company_name'). The value must never be hardcoded here.
  const title = $derived(
    (serverConfig.config as Record<string, unknown> | undefined)?.app_title as string | undefined ?? 'Coframe'
  );
</script>

<span class="cf-title">{title}</span>

<style>
  .cf-title {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--cf-text);
  }
</style>
