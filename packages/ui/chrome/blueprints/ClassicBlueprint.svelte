<script lang="ts">
  import type { Snippet } from 'svelte';

  // Classic desktop blueprint: top bar / left sidebar / main / status bar.
  //
  // Structure only — the blueprint owns the §2.4 height contract (root
  // h-screen + overflow-hidden; body min-h-0; main is the overflow-hidden
  // host so the work-area inside is the single scroller; the status bar is a
  // flex:0 0 auto footer that doesn't steal the scroll). It does NOT know
  // what fills each area — that's the composition. Areas are anonymous:
  // `area1` is "the top strip", not "the header".
  let { area }: { area: Snippet<[string]> } = $props();
</script>

<div class="kb-classic">
  <header class="kb-classic-top">{@render area('area1')}</header>
  <div class="kb-classic-body">
    <aside class="kb-classic-side">{@render area('area2')}</aside>
    <main class="kb-classic-main">{@render area('area3')}</main>
  </div>
  <footer class="kb-classic-status">{@render area('area4')}</footer>
</div>

<style>
  .kb-classic {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--kb-bg);
  }
  .kb-classic-top {
    flex: 0 0 auto;
    border-bottom: 1px solid var(--kb-border);
    background: var(--kb-surface);
  }
  .kb-classic-body {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
  }
  .kb-classic-side {
    flex: 0 0 14rem;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    border-right: 1px solid var(--kb-border);
    background: var(--kb-bg);
  }
  .kb-classic-main {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    background: var(--kb-surface);
  }
  .kb-classic-status {
    flex: 0 0 auto;
    border-top: 1px solid var(--kb-border);
    background: var(--kb-surface);
  }
</style>
