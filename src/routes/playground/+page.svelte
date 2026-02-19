<script lang="ts">
  // Index delle pagine di test disponibili nel playground.
  // Aggiungere qui i link man mano che si creano nuove pagine.

  const pages: { href: string; label: string }[] = [
    { href: '/playground/api',     label: 'API & Auth' },
    { href: '/playground/plugins', label: 'Plugin System' },
    { href: '/playground/stack',   label: 'Stack Navigation' },
    // { href: '/playground/bits',  label: 'bits-ui Components' },
  ];
</script>

<h1 class="mb-4 text-xl font-semibold">Playground</h1>

{#if pages.length === 0}
  <p class="text-sm text-gray-400">Nessuna pagina di test ancora. Aggiungile in questo file.</p>
{:else}
  <ul class="space-y-2">
    {#each pages as page}
      <li>
        <a href={page.href} class="text-sm text-blue-600 hover:underline">{page.label}</a>
      </li>
    {/each}
  </ul>
{/if}
