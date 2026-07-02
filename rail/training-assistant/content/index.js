// ==========================================================================
// CONTENT REGISTRY — the one place every domain is registered. To add a domain
// (signals, switching, operating): write content/<domain>.js, import it here,
// and spread it into ENTRIES. Nothing else in the app needs to change.
// ==========================================================================

import { defs } from './defs.js';
import { signals } from './signals.js';
import { switching } from './switching.js';
import { operating } from './operating.js';

export const ENTRIES = [...defs, ...signals, ...switching, ...operating];
