import { describe, it, expect } from 'vitest';
import {
  parseTime, splitDateTime, joinDateTime, withTimeNow, isDateOnly, plausibleYear,
} from './datetime';

describe('a time as people type it', () => {
  it.each([
    ['930', '09:30'], ['0930', '09:30'], ['1715', '17:15'],
    ['9.30', '09:30'], ['9:30', '09:30'], ['9,30', '09:30'], ['17:05', '17:05'],
    ['9', '09:00'], ['17', '17:00'], ['9.3', '09:30'],
  ])('%s is %s', (text, time) => {
    expect(parseTime(text)).toEqual({ time, valid: true });
  });

  it('is no time when empty', () => {
    expect(parseTime('  ')).toEqual({ time: null, valid: true });
  });

  it.each(['24', '2460', '9:75', 'ab', '9-30', '12345'])('refuses %s', (text) => {
    expect(parseTime(text).valid).toBe(false);
  });
});

describe('the two halves of a datetime', () => {
  it('splits and joins, keeping the seconds it was given', () => {
    const v = '2026-09-29T18:38:53.523000';
    const { date, time } = splitDateTime(v);
    expect(date).toBe('2026-09-29');
    expect(time).toBe('18:38:53.523000');
    expect(joinDateTime(date, time)).toBe(v);
  });

  it('reads a date alone as a date without a time', () => {
    expect(splitDateTime('2026-10-03')).toEqual({ date: '2026-10-03', time: null });
  });

  it('is not a value until both halves are there', () => {
    expect(joinDateTime('2026-10-03', null)).toBeNull();
    expect(joinDateTime(null, '09:30')).toBeNull();
  });
});

describe('a datetime default from a date', () => {
  it('takes the time from now', () => {
    expect(withTimeNow('2026-10-03', new Date(2026, 0, 1, 9, 5))).toBe('2026-10-03T09:05:00');
  });

  it('applies to a date and nothing more', () => {
    expect(isDateOnly('2026-10-03')).toBe(true);
    expect(isDateOnly('2026-10-03T09:00:00')).toBe(false);
    expect(isDateOnly(null)).toBe(false);
  });
});

describe('a plausible year', () => {
  it('refuses a year nobody meant', () => {
    expect(plausibleYear('0260-02-29T09:30:00')).toBe(false);
    expect(plausibleYear('2260-01-01')).toBe(false);
  });

  it('accepts the ones people use, and says nothing about no value', () => {
    expect(plausibleYear('2026-10-03')).toBe(true);
    expect(plausibleYear('1938-05-12')).toBe(true);
    expect(plausibleYear(null)).toBe(true);
  });
});
