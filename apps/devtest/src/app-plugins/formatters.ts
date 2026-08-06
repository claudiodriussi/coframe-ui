/**
 * Auto-discovers and registers every plugin formatter module.
 * Import this module once at app startup.
 */

import { registerFormatters } from '$coframe/formatters/loader';
import { formatterGlobs } from 'virtual:coframe/plugins';

registerFormatters(formatterGlobs);
