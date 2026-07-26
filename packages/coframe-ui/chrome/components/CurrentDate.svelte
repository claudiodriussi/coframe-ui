<script lang="ts">
  import { authStore } from '$coframe/auth/store.svelte';

  // Operational ("working") date. It's a framework context field baked into the
  // JWT (default = server system date at login). Changing it here reissues the
  // token via updateContext, so every endpoint sees the new op_date via the
  // context — e.g. default date for new records, accounting-period selection.
  //
  // Seam: "today" is compared against the client-local date; the badge for an
  // overridden date is a heuristic until the server exposes its own today.

  // Local YYYY-MM-DD (not UTC), to match the server's date.today() default.
  const today = () => new Date().toLocaleDateString('sv-SE');

  const opDate = $derived(authStore.user?.op_date ?? today());
  const isOverridden = $derived(opDate !== today());

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
    if (isOverridden) await authStore.updateContext({ op_date: today() });
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

<div class="cf-current-date" class:cf-overridden={isOverridden}>
  {#if editing}
    <input
      type="date"
      class="cf-date-input"
      bind:value={draft}
      {@attach pick}
      onchange={() => commit(draft)}
      onblur={() => (editing = false)}
    />
  {:else}
    <button type="button" class="cf-date-btn" onclick={open} title="Data operativa">
      <span class="cf-date-dot"></span>
      <span>{label}</span>
    </button>
    {#if isOverridden}
      <button type="button" class="cf-date-reset" onclick={resetToday} title="Torna a oggi">
        ↺
      </button>
    {/if}
  {/if}
</div>

<style>
  .cf-current-date {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.78rem;
    font-variant-numeric: tabular-nums;
  }
  .cf-date-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.1rem 0.35rem;
    border-radius: 0.25rem;
    color: var(--cf-text-muted);
    cursor: pointer;
  }
  .cf-date-btn:hover {
    background: var(--cf-bg);
    color: var(--cf-text);
  }
  .cf-date-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background: var(--cf-text-muted);
    flex: 0 0 auto;
  }
  .cf-overridden .cf-date-btn {
    color: var(--cf-text);
    font-weight: 600;
  }
  .cf-overridden .cf-date-dot {
    background: var(--cf-warning, #d97706);
  }
  .cf-date-reset {
    padding: 0 0.25rem;
    border-radius: 0.25rem;
    color: var(--cf-text-muted);
    cursor: pointer;
    line-height: 1;
  }
  .cf-date-reset:hover {
    background: var(--cf-bg);
    color: var(--cf-text);
  }
  .cf-date-input {
    font-size: 0.78rem;
    padding: 0.1rem 0.35rem;
    border: 1px solid var(--cf-border);
    border-radius: 0.25rem;
    background: var(--cf-bg);
    color: var(--cf-text);
  }
</style>
