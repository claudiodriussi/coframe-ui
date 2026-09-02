/**
 * Backend app-instances a client can be bound to.
 *
 * Two orthogonal dimensions, one source each:
 *
 *   - the *app-instance* is a backend directory. Everything about it — plugin
 *     roots, API prefix, API port — is already declared in its `config.yaml`,
 *     so this file only has to say where that directory is.
 *   - the *client* owns its dev port and declares which app it is bound to,
 *     in its own `coframe.config.js`.
 *
 * Adding an app costs one line here, or none when it sits at the conventional
 * path `coframe/apps/<name>` where real app-instances live.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** This repository. */
const CLIENT = __dirname;

/** How far above this repository a workspace is looked for. */
const REACH = 3;

/**
 * The workspace directory that holds `relative`, looked for above this
 * repository.
 *
 * Which is not the same as counting levels: cloned from GitHub this repository
 * is `<workspace>/coframe-ui`, and in the development workspace it is
 * `<workspace>/client/svelte` — one arrangement of the same siblings, and
 * neither is the right one to hard-code.
 *
 * @param {string} relative  path of an app-instance, relative to a workspace
 * @returns {string|null} the absolute app directory, when one was found
 */
function lookUp(relative) {
  let directory = CLIENT;
  for (let level = 0; level < REACH; level++) {
    directory = dirname(directory);
    const candidate = resolve(directory, relative);
    if (existsSync(resolve(candidate, 'config.yaml'))) return candidate;
  }
  return null;
}

/**
 * App-instances this repository knows by name. Only devtest is here: it ships
 * inside the coframe checkout, which whoever works on the library has anyway,
 * and `apps/devtest` is a client bound to it. Anything else is found by the
 * convention `coframe/apps/<name>`, or says where it is with COFRAME_APP_ROOT
 * — which is how an app in a repository of its own is reached, the commons
 * demo included.
 * @type {Record<string, string>}
 */
const APP_ROOTS = {
  devtest: 'coframe/devtest'
};

/**
 * What a client needs to know about the app-instance it is bound to.
 *
 * @typedef {object} ResolvedApp
 * @property {string} app             app-instance name
 * @property {string} appRoot         absolute directory holding its config.yaml
 * @property {string[]} pluginRoots   absolute plugin roots, in declaration order
 * @property {number} devPort         port of the client's dev server
 * @property {string} apiPrefix       API route prefix
 * @property {string} endpointPrefix  dispatcher prefix
 * @property {string} apiBase         backend base URL in dev
 */

/**
 * Absolute directory of an app-instance — the one holding its `config.yaml`.
 *
 * Apps of this repository are found by the table above, or by the convention
 * `coframe/apps/<name>`. An app that lives anywhere else says where it is,
 * with COFRAME_APP_ROOT — which is what keeps a symlink into `coframe/apps/`
 * a convenience for editing both at once, rather than the only way to build.
 *
 * @param {string} app
 */
export function appRoot(app) {
  const given = process.env.COFRAME_APP_ROOT;
  if (given) return resolve(given);

  const relative = APP_ROOTS[app] ?? `coframe/apps/${app}`;
  // Not found: name the nearest place it would have been, which is the one
  // worth naming in the error that follows.
  return lookUp(relative) ?? resolve(CLIENT, '..', relative);
}

/**
 * True when `child` is nested inside `parent`.
 * @param {string} child
 * @param {string} parent
 */
function isInside(child, parent) {
  const rel = relative(parent, child);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

/**
 * Resolve the binding of a client to an app-instance.
 *
 * @param {object} client
 * @param {string} client.app          app-instance this client is bound to
 * @param {number} client.devPort      port of this client's dev server
 * @param {boolean} [client.overridable]  honour COFRAME_APP (only the generic shell does)
 * @returns {ResolvedApp}
 */
export function resolveApp({ app, devPort, overridable = false }) {
  const requested = process.env.COFRAME_APP;
  const givenRoot = process.env.COFRAME_APP_ROOT;

  if ((requested && requested !== app) || givenRoot) {
    if (!overridable) {
      throw new Error(
        `COFRAME_APP${givenRoot ? '_ROOT' : ''} is set but this client is bound to ` +
          `'${app}'. Custom clients target one backend; use apps/shell to switch ` +
          `app-instance.`
      );
    }
    // An out-of-repo app has no entry in the table: its name is the one its
    // own config.yaml declares, read below.
    app = requested ?? app;
  }

  const root = appRoot(app);
  const configPath = resolve(root, 'config.yaml');
  if (!existsSync(configPath)) {
    throw new Error(
      `App-instance '${app}': no config.yaml at ${configPath}\n` +
        `This client is bound to '${app}', which lives in the coframe checkout ` +
        `beside this one — looked for up to ${REACH} levels above this ` +
        `repository. To point the shell at an application of your own:\n` +
        `  COFRAME_APP_ROOT=/path/to/app pnpm --filter shell dev\n` +
        `or, from that application's directory: coframe dev`
    );
  }
  const config = parse(readFileSync(configPath, 'utf8')) ?? {};
  const api = config.api ?? {};
  if (givenRoot) app = config.name ?? app;

  // Plugin roots come from the same `plugins:` list the backend composes from,
  // so a root added there is seen by the client without a second edit. An entry
  // is a path, or the mapping the backend also accepts — `{ path, include }`,
  // which is how a shared root is taken in part. A root nested inside another is
  // dropped: the outer glob already covers it, and the duplicate would only
  // produce components discovered twice.
  const declared = [
    ...new Set(
      (config.plugins ?? ['plugins']).map((entry) => {
        const given = typeof entry === 'string' ? entry : entry?.path;
        if (typeof given !== 'string') {
          throw new Error(
            `${configPath}: a plugin root is a path, or a mapping with one — ` +
              `got ${JSON.stringify(entry)}`
          );
        }
        return resolve(root, given);
      })
    )
  ];
  const pluginRoots = declared.filter((r) => !declared.some((other) => isInside(r, other)));

  return {
    app,
    appRoot: root,
    pluginRoots,
    devPort,
    apiPrefix: api.prefix ?? 'coframe',
    endpointPrefix: api.endpoint_prefix ?? 'endpoint',
    apiBase: `http://localhost:${api.port ?? 8300}`
  };
}
