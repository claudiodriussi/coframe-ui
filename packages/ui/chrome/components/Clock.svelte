<script lang="ts">
  import { onMount } from 'svelte';

  // Client-side clock. Seam: format/locale later from serverConfig locale and,
  // for a business/operational date, env.op_date server-side.
  let now = $state(new Date());

  onMount(() => {
    const id = setInterval(() => (now = new Date()), 30_000);
    return () => clearInterval(id);
  });

  const label = $derived(
    now.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })
  );
</script>

<span class="kb-clock">{label}</span>

<style>
  .kb-clock {
    font-size: 0.8rem;
    color: var(--kb-text-muted);
    font-variant-numeric: tabular-nums;
  }
</style>
