/**
 * Resolving the binding of a client to an app-instance.
 *
 * What is worth a test here is the reading of `plugins:`, because that list is
 * written for the backend and the client only follows it: a form the backend
 * accepts and the client does not fails late, in a vite config, as a TypeError
 * with no application in it.
 */
import { describe, expect, it, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { resolveApp } from './apps.config.js';

/** An app-instance holding the given `plugins:` list, reached as an outside app. */
function anApp(pluginsYaml) {
  const root = mkdtempSync(resolve(tmpdir(), 'coframe-app-'));
  writeFileSync(resolve(root, 'config.yaml'), `name: sample\n${pluginsYaml}`);
  process.env.COFRAME_APP_ROOT = root;
  return root;
}

const resolved = () => resolveApp({ app: 'sample', devPort: 5174, overridable: true });

afterEach(() => {
  delete process.env.COFRAME_APP_ROOT;
});

describe('the plugin roots', () => {
  it('are the paths the list names', () => {
    const root = anApp('plugins: [plugins]\n');
    expect(resolved().pluginRoots).toEqual([resolve(root, 'plugins')]);
  });

  it('also read the mapping form, which is how a shared root is taken in part', () => {
    const root = anApp('plugins:\n  - path: ../commons/plugins\n    include: [common]\n  - plugins\n');
    expect(resolved().pluginRoots).toEqual([
      resolve(root, '../commons/plugins'),
      resolve(root, 'plugins')
    ]);
  });

  it('say which entry they cannot read', () => {
    anApp('plugins:\n  - include: [common]\n');
    expect(() => resolved()).toThrow(/a plugin root is a path/);
  });
});
