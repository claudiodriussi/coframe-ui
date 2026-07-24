<script lang="ts">
  /**
   * MenuSidebar.svelte — sidebar-tree consuming `get_menu` (docs/pending/menu.md §9.5).
   *
   * Renders the composed, filtered, ordered tree for one menu root and, on leaf
   * click, opens the target page via PanelPage. Sidebar clicks are a change of
   * work (UI_ARCHITECTURE §3.1) — clear the stack rather than pushing on top of
   * whatever was open before.
   */
  import { api } from '$coframe/api/client';
  import { stack } from '$coframe/stack/stack.svelte';
  import PanelPage from './PanelPage.svelte';
  import { resolveIcon } from './icons';

  interface MenuNode {
    id: string;
    label: string;
    icon?: string;
    action?: string;
    panel?: string;
    children?: MenuNode[];
    [key: string]: unknown;
  }

  interface Props {
    rootId?: string;
  }

  let { rootId = 'main' }: Props = $props();

  let items = $state<MenuNode[]>([]);
  let error = $state<string | null>(null);
  let activeId = $state<string | null>(null);
  let expanded = $state<Set<string>>(new Set());

  function collectGroupIds(nodes: MenuNode[]): string[] {
    const ids: string[] = [];
    for (const node of nodes) {
      if (node.children?.length) {
        ids.push(node.id, ...collectGroupIds(node.children));
      }
    }
    return ids;
  }

  async function load(id: string) {
    error = null;
    try {
      const res = await api.endpoint('get_menu', { id });
      if (res.status === 'success') {
        const data = res.data as { items?: MenuNode[] };
        items = data.items ?? [];
        expanded = new Set(collectGroupIds(items));
      } else {
        error = res.message ?? 'Unknown error';
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  function toggle(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expanded = next;
  }

  function open(node: MenuNode) {
    if (node.action !== 'stack_push' || !node.panel) return;
    activeId = node.id;
    stack.clear();
    stack.push(PanelPage, { panelId: node.panel });
  }

  $effect(() => {
    load(rootId);
  });
</script>

<nav class="px-2 pb-4 text-sm">
  {#if error}
    <div class="px-2 py-1 text-xs text-red-600">{error}</div>
  {/if}

  {#snippet renderNodes(nodes: MenuNode[], depth: number)}
    {#each nodes as node (node.id)}
      {@const Icon = resolveIcon(node.icon)}
      {@const isGroup = !!node.children?.length}
      <div>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-gray-700 hover:bg-gray-100"
          class:bg-gray-100={activeId === node.id}
          class:font-medium={isGroup}
          style="padding-left: {8 + depth * 14}px"
          onclick={() => (isGroup ? toggle(node.id) : open(node))}
        >
          {#if Icon}
            <Icon size={15} class="shrink-0 text-gray-500" />
          {/if}
          <span class="truncate">{node.label}</span>
        </button>
        {#if isGroup && expanded.has(node.id)}
          {@render renderNodes(node.children ?? [], depth + 1)}
        {/if}
      </div>
    {/each}
  {/snippet}

  {@render renderNodes(items, 0)}
</nav>
