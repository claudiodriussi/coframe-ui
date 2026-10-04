<script lang="ts">
  import { statusBar } from '$kitebase/status/statusBar.svelte';

  // Passive ambient status line (see statusBar.svelte.ts). Reflects the last
  // client- or server-set status; empty when there's nothing to say.
  let entry = $derived(statusBar.current);
</script>

<div class="kb-status-area" data-level={entry?.level ?? 'info'}>
  {#if entry}
    <span class="kb-status-dot"></span>
    <span class="kb-status-text">{entry.text}</span>
  {/if}
</div>

<style>
  .kb-status-area {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    min-width: 0;
    font-size: 0.78rem;
    color: var(--kb-text-muted);
  }
  .kb-status-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .kb-status-dot {
    flex: 0 0 auto;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background: var(--kb-text-muted);
  }
  .kb-status-area[data-level='success'] .kb-status-dot {
    background: var(--kb-success, #16a34a);
  }
  .kb-status-area[data-level='warning'] .kb-status-dot {
    background: var(--kb-warning, #d97706);
  }
  .kb-status-area[data-level='error'] .kb-status-dot {
    background: var(--kb-danger);
  }
  .kb-status-area[data-level='success'] .kb-status-text,
  .kb-status-area[data-level='error'] .kb-status-text {
    color: var(--kb-text);
  }
</style>
