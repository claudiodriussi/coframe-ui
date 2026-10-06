<script lang="ts">
  import { getContext } from 'svelte';
  import { _ } from '../../i18n';
  import { stack as globalStack, type StackInstance } from '../../stack/stack.svelte';

  // Seam: later the logo image URL comes from env.config('logo') /
  // get_server_config. For now a simple framework mark — do not hardcode a
  // brand here. Whatever it shows, it leads home: clearing the stack uncovers
  // the menu's home page.
  const stack = getContext<StackInstance>('kb:stack') ?? globalStack;
</script>

<button type="button" class="kb-logo" onclick={() => stack.clear()}
        title={_('Back to home')} aria-label={_('Back to home')}>K</button>

<style>
  .kb-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    border: 0;
    border-radius: 0.375rem;
    background: var(--kb-accent);
    color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
    cursor: pointer;
  }
</style>
