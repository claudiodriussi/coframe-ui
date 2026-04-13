<script lang="ts">
  /**
   * TabView.svelte — tab bar with N ViewRenderer panes (class:hidden strategy).
   *
   * All tabs mount immediately so switching is instant (no re-fetch).
   * trigger and collapsed are forwarded to every tab's ViewRenderer.
   *
   * Descriptor shape (after $ref resolution by get_page):
   *   type: tabs
   *   tabs:
   *     - id: reviews
   *       label: Reviews
   *       type: table        ← resolved from $ref
   *       source: ...
   *     - id: loans
   *       label: Loans
   *       type: table
   *       source: ...
   */
  import ViewRenderer from './ViewRenderer.svelte';

  interface Tab {
    id: string;
    label?: string;
    [key: string]: unknown;
  }

  let {
    tabs = [] as Tab[],
    trigger = undefined as Record<string, unknown> | undefined,
    collapsed = false,
    onEvent = undefined as ((name: string, data: unknown) => void) | undefined,
  }: {
    tabs?: Tab[];
    trigger?: Record<string, unknown>;
    collapsed?: boolean;
    onEvent?: (name: string, data: unknown) => void;
  } = $props();

  let activeId = $state(tabs[0]?.id ?? '');
</script>

<div class="cf-tabview">
  {#if tabs.length > 1}
    <div class="cf-tabview-bar" role="tablist">
      {#each tabs as tab (tab.id)}
        <button
          class="cf-tabview-tab"
          class:cf-tabview-tab-active={activeId === tab.id}
          role="tab"
          aria-selected={activeId === tab.id}
          onclick={() => (activeId = tab.id)}
        >
          {tab.label ?? tab.id}
        </button>
      {/each}
    </div>
  {/if}

  <div class="cf-tabview-body">
    {#each tabs as tab (tab.id)}
      <div
        class="cf-tabview-panel"
        class:hidden={activeId !== tab.id}
        role="tabpanel"
        aria-hidden={activeId !== tab.id}
      >
        <ViewRenderer
          view={tab as Record<string, unknown>}
          {trigger}
          {collapsed}
          {onEvent}
        />
      </div>
    {/each}
  </div>
</div>

<style>
  .cf-tabview {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  /* ── Tab bar ─────────────────────────────────────────────────────────── */

  .cf-tabview-bar {
    display: flex;
    align-items: flex-end;
    gap: 0;
    padding: 0 0.5rem;
    background: var(--cf-surface);
    border-bottom: 1px solid var(--cf-border);
    flex-shrink: 0;
  }

  .cf-tabview-tab {
    appearance: none;
    padding: 0.3rem 0.75rem;
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--cf-text-muted);
    background: none;
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: 0.3rem 0.3rem 0 0;
    cursor: pointer;
    transition: color 0.1s, background 0.1s;
    margin-bottom: -1px;  /* overlap the bar border-bottom */
    line-height: 1.5;
  }

  .cf-tabview-tab:hover:not(.cf-tabview-tab-active) {
    color: var(--cf-text);
    background: var(--cf-surface-hover);
  }

  .cf-tabview-tab-active {
    color: var(--cf-text);
    background: var(--cf-bg);
    border-color: var(--cf-border);
    border-bottom-color: var(--cf-bg);  /* "lifts" the active tab above the bar border */
  }

  /* ── Tab body ────────────────────────────────────────────────────────── */

  .cf-tabview-body {
    flex: 1;
    min-height: 0;
    position: relative;
  }

  .cf-tabview-panel {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  .cf-tabview-panel.hidden {
    display: none;
  }
</style>
