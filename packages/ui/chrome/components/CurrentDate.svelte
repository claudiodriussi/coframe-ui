<script lang="ts">
  import { authStore } from '$kitebase/auth/store.svelte';

  // Operational ("working") date. It follows today until the user picks one;
  // picking reissues the token via updateContext with op_date, so every
  // endpoint sees it in the context (default date for new records,
  // accounting-period selection). Reset sends null: back to following today.

  const opDate = $derived(authStore.opDate);
  const isOverridden = $derived(authStore.opDateChosen);

  let editing = $state(false);
  let draft = $state('');

  const label = $derived(
    new Date(opDate + 'T00:00:00').toLocaleDateString(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  );

  function open() {
    draft = opDate;
    editing = true;
  }

  async function commit(value: string) {
    editing = false;
    if (value && value !== opDate) {
      await authStore.updateContext({ op_date: value });
    }
  }

  async function resetToday() {
    if (isOverridden) await authStore.updateContext({ op_date: null });
  }

  // Focus + open the native picker as soon as the input mounts (attachment).
  function pick(node: HTMLInputElement) {
    node.focus();
    try {
      node.showPicker?.();
    } catch {
      /* showPicker needs user activation; the click that opened us provides it */
    }
  }
</script>

<div class="kb-current-date" class:kb-overridden={isOverridden}>
  {#if editing}
    <input
      type="date"
      class="kb-date-input"
      bind:value={draft}
      {@attach pick}
      onchange={() => commit(draft)}
      onblur={() => (editing = false)}
    />
  {:else}
    <button type="button" class="kb-date-btn" onclick={open} title="Data operativa">
      <span class="kb-date-dot"></span>
      <span>{label}</span>
    </button>
    {#if isOverridden}
      <button type="button" class="kb-date-reset" onclick={resetToday} title="Torna a oggi">
        ↺
      </button>
    {/if}
  {/if}
</div>

<style>
  .kb-current-date {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
  }
  .kb-date-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    color: var(--kb-text-muted);
    cursor: pointer;
  }
  .kb-date-btn:hover {
    background: var(--kb-bg);
    color: var(--kb-text);
  }
  .kb-date-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background: var(--kb-text-muted);
    flex: 0 0 auto;
  }
  .kb-overridden .kb-date-btn {
    color: var(--kb-text);
    font-weight: 600;
  }
  .kb-overridden .kb-date-dot {
    background: var(--kb-warning, #d97706);
  }
  .kb-date-reset {
    padding: 0 0.25rem;
    border-radius: 0.25rem;
    color: var(--kb-text-muted);
    cursor: pointer;
    line-height: 1;
  }
  .kb-date-reset:hover {
    background: var(--kb-bg);
    color: var(--kb-text);
  }
  .kb-date-input {
    font-size: 0.78rem;
    padding: 0.1rem 0.35rem;
    border: 1px solid var(--kb-border);
    border-radius: 0.25rem;
    background: var(--kb-bg);
    color: var(--kb-text);
  }
</style>
