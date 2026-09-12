import { useSyncExternalStore } from 'react';
import { settings } from '../state/settings';

/**
 * React's view of the settings module. useSyncExternalStore rather than a
 * context because the store is also read synchronously by non-React code
 * (voice.ts, ai/curio.ts) - there is one source of truth, and this just
 * subscribes to it.
 */
export function useSettings() {
  return useSyncExternalStore(settings.subscribe, settings.get, settings.get);
}
