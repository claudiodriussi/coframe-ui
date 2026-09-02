/**
 * `pnpm build:app` — what it refuses, and what it runs.
 *
 * The compilation itself is vite's and is not ours to check; what is worth a
 * test is the part that would otherwise fail late and confusingly: a target
 * that is not an application, and the one environment variable that tells the
 * shell which application it is building for.
 */
import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { resolve } from 'path';
import { appDirectory, buildApp, CLIENT } from './build-app.js';

function anApp() {
  const app = mkdtempSync(resolve(tmpdir(), 'coframe-app-'));
  writeFileSync(resolve(app, 'config.yaml'), 'name: sample\n');
  return app;
}

describe('the target', () => {
  it('is the application directory given', () => {
    const app = anApp();
    expect(appDirectory([app])).toBe(app);
  });

  it('has to be given at all', () => {
    expect(() => appDirectory([])).toThrow(/usage/);
  });

  it('takes a bare word as an app-instance of this repository', () => {
    expect(() => appDirectory(['nosuchapp']))
      .toThrow(/coframe[/\\]apps[/\\]nosuchapp/);
  });

  it('has to be an application', () => {
    const notAnApp = mkdtempSync(resolve(tmpdir(), 'coframe-none-'));
    expect(() => appDirectory([notAnApp])).toThrow(/no config.yaml/);
  });
});

describe('the build', () => {
  it('tells the shell which application it is for', () => {
    const app = anApp();
    let seen;
    const run = (command, args, options) => {
      seen = { command, args, options };
      mkdirSync(resolve(CLIENT, 'apps/shell/build'), { recursive: true });
      return { status: 0 };
    };
    buildApp(app, { run });

    expect(seen.command).toBe('pnpm');
    expect(seen.args).toEqual(['--filter', 'shell', 'build']);
    expect(seen.options.env.COFRAME_APP_ROOT).toBe(app);
    expect(seen.options.cwd).toBe(CLIENT);
  });

  it('does not install a failed build', () => {
    const app = anApp();
    const run = () => ({ status: 1 });
    expect(() => buildApp(app, { run })).toThrow(/failed/);
  });
});
