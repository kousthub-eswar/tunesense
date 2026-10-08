export * from './types.js';
export * from './IMusicProvider.js';
export { JamendoProvider } from './JamendoProvider.js';

import { IMusicProvider } from './IMusicProvider.js';
import { JamendoProvider } from './JamendoProvider.js';

// Default singleton instance of the active music provider
let defaultProvider: IMusicProvider | null = null;

export function getMusicProvider(): IMusicProvider {
  if (!defaultProvider) {
    defaultProvider = new JamendoProvider();
  }
  return defaultProvider;
}
