/**
 * Auto-discovers and registers every plugin formatter module.
 * Import this module once at app startup.
 */

import { registerFormatters } from '$kitebase/formatters/loader';
import { formatterGlobs } from 'virtual:kitebase/plugins';

registerFormatters(formatterGlobs);
