import { describe, it, expect, vi } from 'vitest';
import { popupKeys } from './widget.svelte';

function key(k: string, altKey = false) {
  return { key: k, altKey, preventDefault: vi.fn() } as unknown as KeyboardEvent;
}

describe('popup keys', () => {
  it('opens on F4 and on Alt+ArrowDown', () => {
    for (const e of [key('F4'), key('ArrowDown', true)]) {
      const open = vi.fn();
      expect(popupKeys(e, { open })).toBe(true);
      expect(open).toHaveBeenCalledOnce();
      expect(e.preventDefault).toHaveBeenCalled();
    }
  });

  it('searches on F3', () => {
    const search = vi.fn();
    expect(popupKeys(key('F3'), { search })).toBe(true);
    expect(search).toHaveBeenCalledOnce();
  });

  it('leaves to the browser a key the field cannot serve', () => {
    const e = key('F3');
    expect(popupKeys(e, { open: vi.fn() })).toBe(false);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it('ignores a plain ArrowDown and F2', () => {
    const open = vi.fn();
    expect(popupKeys(key('ArrowDown'), { open })).toBe(false);
    expect(popupKeys(key('F2'), { open })).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
