<script lang="ts">
  import PanelPage from '../../components/PanelPage.svelte';
  import { home } from '../home.svelte';

  // The menu's home page, under the stack. It fills the work area like a page
  // of the stack does, instead of sitting inside the padded route content.
</script>

{#if home.page}
  <div class="kb-home">
    {#key home.page}
      <PanelPage panelId={home.page} />
    {/key}
  </div>
{/if}

<style>
  .kb-home {
    position: absolute;
    inset: 0;
    background: var(--kb-surface);
  }
</style>
