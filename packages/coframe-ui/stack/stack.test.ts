/**
 * Frame ids, and the context they have to work in.
 *
 * `crypto.randomUUID()` exists only in a secure context — HTTPS, or localhost.
 * A compiled client served over plain HTTP from a LAN address is neither, and
 * there every `push` threw `crypto.randomUUID is not a function`: the menu drew,
 * and no panel would open.
 */
import { describe, expect, it, afterEach } from 'vitest';
import { get } from 'svelte/store';

import { createStack } from './stack.svelte.ts';

const Component = () => null;
const realCrypto = globalThis.crypto;

afterEach(() => {
  Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true });
});

/** A context without `randomUUID`, which is what plain HTTP gives you. */
function withoutRandomUUID() {
  Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
}

describe('pushing a frame', () => {
  it('returns an id', () => {
    const stack = createStack();
    expect(stack.push(Component)).toMatch(/.+/);
    expect(get(stack)).toHaveLength(1);
  });

  it('works where crypto.randomUUID does not exist', () => {
    withoutRandomUUID();
    const stack = createStack();

    expect(() => stack.push(Component)).not.toThrow();
    expect(get(stack)).toHaveLength(1);
  });

  it('gives every frame an id of its own, there too', () => {
    withoutRandomUUID();
    const stack = createStack();

    stack.push(Component);
    stack.push(Component);

    const ids = get(stack).map((page) => page.id);
    expect(new Set(ids).size).toBe(2);
  });
});
