/**
 * Date and time values as the form holds them: ISO strings, "YYYY-MM-DD" for a
 * date and "YYYY-MM-DDTHH:MM[:SS[.ffffff]]" for a datetime. Pure functions, so
 * the widget stays a thin shell around them.
 */

/**
 * A time typed the way people type it: `930`, `0930`, `9.30`, `9:30`, `9,30`,
 * `9`. Empty text is no time (null); text that is not a time is `valid: false`,
 * so the widget can say so instead of guessing.
 */
export function parseTime(text: string): { time: string | null; valid: boolean } {
  const t = text.trim();
  if (!t) return { time: null, valid: true };

  let h: number;
  let m: number;
  const sep = t.match(/^(\d{1,2})[.:,](\d{1,2})$/);
  if (sep) {
    h = Number(sep[1]);
    m = Number(sep[2].padEnd(2, '0'));      // "9.3" is half past, as on a clock
  } else if (/^\d{1,4}$/.test(t)) {
    if (t.length <= 2) { h = Number(t); m = 0; }
    else { h = Number(t.slice(0, -2)); m = Number(t.slice(-2)); }
  } else {
    return { time: null, valid: false };
  }
  if (h > 23 || m > 59) return { time: null, valid: false };
  return { time: `${pad(h)}:${pad(m)}`, valid: true };
}

/** The date and the time of an ISO value; either is null when absent. */
export function splitDateTime(v: unknown): { date: string | null; time: string | null } {
  if (typeof v !== 'string' || v.length < 10) return { date: null, time: null };
  const date = v.slice(0, 10);
  const rest = v.slice(10).replace(/^[T ]/, '');
  return { date, time: rest || null };
}

/** One value from the two halves; a datetime without its time is not a value yet. */
export function joinDateTime(date: string | null, time: string | null): string | null {
  return date && time ? `${date}T${time}` : null;
}

/** A date with the time it is now on this machine: the default of a datetime. */
export function withTimeNow(date: string, now: Date = new Date()): string {
  return `${date}T${pad(now.getHours())}:${pad(now.getMinutes())}:00`;
}

/** True for a value that is a date and nothing more ("2026-10-03"). */
export function isDateOnly(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * Whether the year is one somebody meant. A segment typed without its leading
 * zeros gives 0260 and is accepted by the input: nobody files a report in the
 * third century, so it is caught here.
 */
export function plausibleYear(v: unknown, min = 1900, max = 2100): boolean {
  if (typeof v !== 'string' || v.length < 4) return true;
  const year = Number(v.slice(0, 4));
  return Number.isNaN(year) || (year >= min && year <= max);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
