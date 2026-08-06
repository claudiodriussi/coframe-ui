/**
 * What this client is: the generic shell — project-agnostic, it hosts Chrome
 * and plugin-contributed UI and can be pointed at any app-instance.
 *
 * It is the only client with `overridable`, so COFRAME_APP selects the backend:
 *   COFRAME_APP=demo pnpm --filter shell dev
 * A custom client would refuse that, being bound to one backend by definition.
 */
import { resolveApp } from '../../apps.config.js';

export default resolveApp({ app: 'devtest', devPort: 5174, overridable: true });
