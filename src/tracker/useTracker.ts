import { useSyncExternalStore } from 'react';
import { tracker, type TrackerState } from './trackerStore';

export function useTrackerState(): TrackerState {
  return useSyncExternalStore(
    (listener) => tracker.subscribeState(listener),
    () => tracker.getState(),
    () => tracker.getState(),
  );
}

export { tracker };
export type { TrackerState };
