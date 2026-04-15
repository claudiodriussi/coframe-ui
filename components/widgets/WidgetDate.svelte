<script lang="ts">
  import { untrack } from 'svelte';
  import { DatePicker } from 'bits-ui';
  import { parseDate, type DateValue } from '@internationalized/date';
  import type { FormField } from '../dataform.types';

  interface Props {
    value: unknown;       // ISO date string (e.g. "2024-03-15") or null
    onchange: (v: string | null) => void;
    onblur?: () => void;
    readonly?: boolean;
    field: FormField;
  }

  let { value, onchange, onblur, readonly = false, field }: Props = $props();

  // Parse incoming ISO string to DateValue for bits-ui
  function toDateValue(v: unknown): DateValue | undefined {
    if (!v || typeof v !== 'string') return undefined;
    try { return parseDate(v); } catch { return undefined; }
  }

  let dateValue = $state<DateValue | undefined>(untrack(() => toDateValue(value)));

  // Sync external value changes
  $effect(() => {
    const dv = toDateValue(value);
    // untrack dateValue so user interactions (open/close picker) don't re-trigger this effect.
    if (dv?.toString() !== untrack(() => dateValue)?.toString()) {
      dateValue = dv;
    }
  });

  function handleValueChange(dv: DateValue | undefined) {
    dateValue = dv;
    onchange(dv ? dv.toString() : null);
    // bits-ui closes the picker after selection — treat that as blur
    onblur?.();
  }

  // Display helpers
  let displayValue = $derived(
    dateValue
      ? new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
          new Date(dateValue.toString() + 'T00:00:00')
        )
      : '—'
  );

  const segClass =
    'rounded px-0.5 text-sm tabular-nums caret-transparent ' +
    'focus:bg-brand focus:text-white focus:outline-none ' +
    'data-[placeholder]:text-gray-400';

  const dayClass =
    'flex h-8 w-8 items-center justify-center rounded-md text-sm ' +
    'hover:bg-gray-100 ' +
    'data-[selected]:bg-brand data-[selected]:text-white ' +
    'data-[disabled]:opacity-30 data-[disabled]:pointer-events-none ' +
    'data-[outside-month]:opacity-40 ' +
    'data-[today]:border data-[today]:border-brand';
</script>

{#if readonly}
  <span class="block text-sm text-gray-700 py-2">{displayValue}</span>

{:else}
  <DatePicker.Root
    value={dateValue}
    onValueChange={handleValueChange}
    granularity="day"
    locale="it"
  >
    <div class="relative">
      <DatePicker.Input
        class="input flex items-center gap-0.5 pr-9 {field.error ? 'input-error' : ''}"
      >
        {#snippet children({ segments })}
          {#each segments as { part, value: segVal }}
            {#if part === 'literal'}
              <span class="select-none text-gray-400">{segVal}</span>
            {:else}
              <DatePicker.Segment {part} class={segClass}>{segVal}</DatePicker.Segment>
            {/if}
          {/each}
        {/snippet}
      </DatePicker.Input>

      <DatePicker.Trigger
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand
               focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-1 rounded"
        aria-label="Apri calendario"
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      </DatePicker.Trigger>
    </div>

    <DatePicker.Portal>
      <DatePicker.Content
        class="z-50 mt-1 rounded-xl border border-gray-200 bg-white p-3 shadow-lg"
      >
        <DatePicker.Calendar>
          {#snippet children({ months, weekdays })}
            <DatePicker.Header class="mb-2 flex items-center justify-between">
              <DatePicker.PrevButton class="rounded p-1 hover:bg-gray-100">←</DatePicker.PrevButton>
              <DatePicker.Heading class="text-sm font-semibold" />
              <DatePicker.NextButton class="rounded p-1 hover:bg-gray-100">→</DatePicker.NextButton>
            </DatePicker.Header>
            {#each months as month}
              <DatePicker.Grid class="w-full">
                <DatePicker.GridHead>
                  <DatePicker.GridRow class="flex">
                    {#each weekdays as day}
                      <DatePicker.HeadCell class="w-8 text-center text-xs font-medium text-gray-400">
                        {day.slice(0, 2)}
                      </DatePicker.HeadCell>
                    {/each}
                  </DatePicker.GridRow>
                </DatePicker.GridHead>
                <DatePicker.GridBody>
                  {#each month.weeks as weekDates}
                    <DatePicker.GridRow class="flex">
                      {#each weekDates as date}
                        <DatePicker.Cell {date} month={month.value} class="p-0.5">
                          <DatePicker.Day class={dayClass} />
                        </DatePicker.Cell>
                      {/each}
                    </DatePicker.GridRow>
                  {/each}
                </DatePicker.GridBody>
              </DatePicker.Grid>
            {/each}
          {/snippet}
        </DatePicker.Calendar>
      </DatePicker.Content>
    </DatePicker.Portal>
  </DatePicker.Root>
{/if}
