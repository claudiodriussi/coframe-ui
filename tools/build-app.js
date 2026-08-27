#!/usr/bin/env node
/**
 * Build the admin client for an application, and put it where its server
 * serves it from.
 *
 *   pnpm build:app /path/to/myapp        →  myapp/static/
 *
 * An application does not own a client: it contributes UI through the .svelte
 * files of its plugins, and the generic shell — the only re-pointable client —
 * builds them. The application only says where it is; everything else, plugin
 * roots included, the shell reads from that application's own config.yaml.
 *
 * This lives in the client repository rather than beside the application,
 * because the checkout that can build is this one. Nothing here assumes any
 * particular arrangement of repositories on disk.
 */
import { spawnSync } from 'child_process';
import { cpSync, existsSync, rmSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

/** This repository — the parent of tools/. */
export const CLIENT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Where `pnpm --filter shell build` leaves the compiled client. */
export const SHELL_BUILD = resolve(CLIENT, 'apps/shell/build');

/**
 * The application to build for, from the command line.
 *
 * @param {string[]} argv  arguments after the script name
 * @returns {string} absolute application directory
 */
export function appDirectory(argv) {
  const [given] = argv;
  if (!given) {
    throw new Error('usage: pnpm build:app <app-directory>');
  }
  const app = resolve(given);
  if (!existsSync(resolve(app, 'config.yaml'))) {
    throw new Error(`${app} holds no config.yaml — is it an application?`);
  }
  return app;
}

/**
 * Build the shell for one application and install it as that app's `static/`.
 *
 * The directory is replaced whole rather than merged: a stale chunk from an
 * earlier build is indistinguishable from a current one, and the browser would
 * load it just as happily.
 *
 * @param {string} app  absolute application directory
 * @param {{ run?: typeof spawnSync }} [io]  seam for testing
 * @returns {string} the directory written
 */
export function buildApp(app, { run = spawnSync } = {}) {
  const result = run('pnpm', ['--filter', 'shell', 'build'], {
    cwd: CLIENT,
    stdio: 'inherit',
    env: { ...process.env, COFRAME_APP_ROOT: app }
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`the client build failed (exit ${result.status})`);
  }

  const target = resolve(app, 'static');
  rmSync(target, { recursive: true, force: true });
  cpSync(SHELL_BUILD, target, { recursive: true });
  return target;
}

/** Entry point: only when run, never when imported by a test. */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const app = appDirectory(process.argv.slice(2));
    console.log(`Building the client for ${app} ...`);
    console.log(`Written: ${buildApp(app)}`);
  } catch (e) {
    console.error(`error: ${e.message}`);
    process.exit(1);
  }
}
