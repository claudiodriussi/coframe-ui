/**
 * What this client is: the generic shell — project-agnostic, it hosts Chrome
 * and plugin-contributed UI and can be pointed at any app-instance.
 *
 * It is the only client with `overridable`, so it accepts another backend:
 *   COFRAME_APP=<name> pnpm --filter shell dev          an app of this workspace
 *   COFRAME_APP_ROOT=/path/to/app pnpm --filter shell dev   an app anywhere else
 * A custom client would refuse that, being bound to one backend by definition.
 */
import { resolveApp } from '../../apps.config.js';

export default resolveApp({ app: 'devtest', devPort: 5174, overridable: true });
