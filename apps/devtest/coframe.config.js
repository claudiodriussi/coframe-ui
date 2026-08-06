/**
 * What this client is: a custom client bound to the devtest app-instance.
 * Everything else — plugin roots, API prefix and port — is derived from that
 * app's config.yaml (see ../../apps.config.js).
 */
import { resolveApp } from '../../apps.config.js';

export default resolveApp({ app: 'devtest', devPort: 5173 });
