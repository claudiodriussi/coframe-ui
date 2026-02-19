<script lang="ts">
  let { children } = $props();
</script>

<div class="min-h-screen bg-gray-50">
  <header class="border-b border-gray-200 bg-white px-6 py-3">
    <span class="text-sm font-medium text-gray-500">🧪 Playground</span>
    <span class="ml-2 text-xs text-gray-300">(dev only — not linked from the app)</span>
  </header>
  <div class="p-6">
    {@render children()}
  </div>
</div>
