<script lang="ts">
  import { untrack } from 'svelte';
  import { DatePicker } from 'bits-ui';
  import { _ } from '../../i18n';
  import { parseDate, type DateValue } from '@internationalized/date';
  import type { FormField } from '../dataform.types';
  import { popupKeys, dispatchEnter } from './widget.svelte';
  import { parseTime, splitDateTime, joinDateTime } from '../datetime';

  type Granularity = 'day' | 'hour' | 'minute' | 'second';

  interface Props {
    value: unknown;       // ISO date string (e.g. "2024-03-15") or ISO datetime or null
    onchange: (v: string | null) => void;
    onblur?: () => void;
    readonly?: boolean;
    granularity?: Granularity;
    field: FormField;
  }

  let { value, onchange, onblur, readonly = false, granularity = 'day', field }: Props = $props();

  // A datetime is two inputs: the date in segments, with its calendar, and the
  // time as free text (`930`, `9.30`). The date then needs no time to be shown:
  // a default from the operational date arrives with the day already right.
  const withTime = $derived(granularity !== 'day');

  function toDateValue(v: unknown): DateValue | undefined {
    const { date } = splitDateTime(v);
    if (!date) return undefined;
    try { return parseDate(date); } catch { return undefined; }
  }

  let dateValue = $state<DateValue | undefined>(untrack(() => toDateValue(value)));
  /** The time as held, seconds included: kept as it was until it is retyped. */
  let timeFull = $state<string | null>(untrack(() => splitDateTime(value).time));
  let timeText = $state(untrack(() => (splitDateTime(value).time ?? '').slice(0, 5)));
  let timeInvalid = $state(false);

  /** What this widget would hand back for its own state. */
  function current(): string | null {
    const date = dateValue?.toString() ?? null;
    return withTime ? joinDateTime(date, timeFull) : date;
  }

  // Sync external value changes; untracked reads, so typing does not loop back.
  $effect(() => {
    const v = (value as string | null | undefined) ?? null;
    if (v === untrack(current)) return;
    const { time } = splitDateTime(v);
    dateValue = toDateValue(v);
    timeFull = time;
    timeText = (time ?? '').slice(0, 5);
    timeInvalid = false;
  });

  function emit() {
    onchange(current());
  }

  let open = $state(false);

  // Caught before the segments: on a segment ArrowDown decrements the value, and
  // Alt+ArrowDown must open the calendar instead.
  function handleKeys(e: KeyboardEvent) {
    if (popupKeys(e, { open: () => (open = true) })) e.stopPropagation();
  }

  function handleValueChange(dv: DateValue | undefined) {
    dateValue = dv;
    emit();
    // bits-ui closes the picker after selection — treat that as blur. Not while
    // the time is still to be typed: that would call the field incomplete early.
    if (!withTime || timeFull) onblur?.();
  }

  function handleTimeInput(e: Event) {
    timeText = (e.target as HTMLInputElement).value;
    const { time, valid } = parseTime(timeText);
    timeInvalid = !valid;
    if (!valid) return;
    timeFull = time ? `${time}:00` : null;
    emit();
  }

  function handleTimeBlur() {
    if (!timeInvalid) timeText = (timeFull ?? '').slice(0, 5);
    onblur?.();
  }

  function handleTimeKeys(e: KeyboardEvent) {
    if (popupKeys(e, { open: () => (open = true) })) return;
    dispatchEnter(e);
  }

  // Display helpers
  let displayValue = $derived.by(() => {
    const v = current();
    if (!v) return '—';
    return new Intl.DateTimeFormat('it-IT', withTime
      ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
          ...(granularity === 'second' ? { second: '2-digit' } : {}) }
      : { day: '2-digit', month: '2-digit', year: 'numeric' }
    ).format(new Date(withTime ? v.slice(0, 19) : v + 'T00:00:00'));
  });

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
    bind:open
  >
    <div class="flex gap-2">
    <div class="relative min-w-0 flex-1">
      <DatePicker.Input
        class="input flex items-center gap-0.5 pr-9 {field.error ? 'input-error' : ''}"
        onkeydowncapture={handleKeys}
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

      <!-- Tab skips it: the keyboard opens the calendar with F4 -->
      <DatePicker.Trigger
        tabindex={-1}
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

    {#if withTime}
      <input
        type="text"
        inputmode="numeric"
        class="input w-20 shrink-0 tabular-nums {field.error || timeInvalid ? 'input-error' : ''}"
        placeholder="hh:mm"
        value={timeText}
        oninput={handleTimeInput}
        onblur={handleTimeBlur}
        onkeydown={handleTimeKeys}
        title={timeInvalid ? _('Invalid time: 930, 9.30, 9:30') : undefined}
        aria-label={`${field.label ?? field.name} (${_('time')})`}
        aria-invalid={timeInvalid}
      />
    {/if}
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
