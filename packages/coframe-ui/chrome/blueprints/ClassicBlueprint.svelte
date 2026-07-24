<script lang="ts">
  import type { Snippet } from 'svelte';

  // Classic desktop blueprint: top bar / left sidebar / main.
  //
  // Structure only — the blueprint owns the §2.4 height contract (root
  // h-screen + overflow-hidden; body min-h-0; main is the overflow-hidden
  // host so the work-area inside is the single scroller). It does NOT know
  // what fills each area — that's the composition. Areas are anonymous:
  // `area1` is "the top strip", not "the header".
  let { area }: { area: Snippet<[string]> } = $props();
</script>

<div class="cf-classic">
  <header class="cf-classic-top">{@render area('area1')}</header>
  <div class="cf-classic-body">
    <aside class="cf-classic-side">{@render area('area2')}</aside>
    <main class="cf-classic-main">{@render area('area3')}</main>
  </div>
</div>

<style>
  .cf-classic {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--cf-bg);
  }
  .cf-classic-top {
    flex: 0 0 auto;
    border-bottom: 1px solid var(--cf-border);
    background: var(--cf-surface);
  }
  .cf-classic-body {
    display: flex;
    flex: 1 1 auto;
    min-height: 0;
  }
  .cf-classic-side {
    flex: 0 0 14rem;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;
    border-right: 1px solid var(--cf-border);
    background: var(--cf-bg);
  }
  .cf-classic-main {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
    background: var(--cf-surface);
  }
</style>
