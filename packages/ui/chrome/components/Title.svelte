<script lang="ts">
  import { getContext } from 'svelte';
  import { serverConfig } from '../../api/serverConfig.svelte';
  import { _ } from '../../i18n';
  import { stack as globalStack, type StackInstance } from '../../stack/stack.svelte';

  // Seam: the app title. Today read from serverConfig.config (delivered by
  // get_server_config from config.yaml `title`), falling back to 'Kitebase'.
  // Later this resolves through env.config('company_name'). The value must
  // never be hardcoded here. Like the logo, it leads home.
  const title = $derived(
    (serverConfig.config as Record<string, unknown> | undefined)?.app_title as string | undefined ?? 'Kitebase'
  );
  const stack = getContext<StackInstance>('kb:stack') ?? globalStack;
</script>

<button type="button" class="kb-title" onclick={() => stack.clear()}
        title={_('Back to home')}>{title}</button>

<style>
  .kb-title {
    border: 0;
    background: none;
    padding: 0;
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--kb-text);
    cursor: pointer;
  }
</style>
