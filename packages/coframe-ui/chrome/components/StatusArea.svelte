<script lang="ts">
  import { statusBar } from '$coframe/status/statusBar.svelte';

  // Passive ambient status line (see statusBar.svelte.ts). Reflects the last
  // client- or server-set status; empty when there's nothing to say.
  let entry = $derived(statusBar.current);
</script>

<div class="cf-status-area" data-level={entry?.level ?? 'info'}>
  {#if entry}
    <span class="cf-status-dot"></span>
    <span class="cf-status-text">{entry.text}</span>
  {/if}
</div>

<style>
  .cf-status-area {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    font-size: 0.78rem;
    color: var(--cf-text-muted);
  }
  .cf-status-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cf-status-dot {
    flex: 0 0 auto;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background: var(--cf-text-muted);
  }
  .cf-status-area[data-level='success'] .cf-status-dot {
    background: var(--cf-success, #16a34a);
  }
  .cf-status-area[data-level='warning'] .cf-status-dot {
    background: var(--cf-warning, #d97706);
  }
  .cf-status-area[data-level='error'] .cf-status-dot {
    background: var(--cf-danger);
  }
  .cf-status-area[data-level='success'] .cf-status-text,
  .cf-status-area[data-level='error'] .cf-status-text {
    color: var(--cf-text);
  }
</style>
