<script lang="ts">
  import { serverConfig } from '$kitebase/api/serverConfig.svelte';

  // Seam: the app title. Today read from serverConfig.config (delivered by
  // get_server_config), falling back to 'Kitebase'. Later this resolves through
  // env.config('company_name'). The value must never be hardcoded here.
  const title = $derived(
    (serverConfig.config as Record<string, unknown> | undefined)?.app_title as string | undefined ?? 'Kitebase'
  );
</script>

<span class="kb-title">{title}</span>

<style>
  .kb-title {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--kb-text);
  }
</style>
