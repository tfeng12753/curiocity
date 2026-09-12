import { useEffect, useSyncExternalStore } from 'react';
import { tracker, type CursorSample, type TrackerState } from './trackerStore';

export function useTrackerState(): TrackerState {
  return useSyncExternalStore(
    (listener) => tracker.subscribeState(listener),
    () => tracker.getState(),
    () => tracker.getState(),
  );
}

/** Subscribes to the raw 60fps cursor stream without re-rendering the caller. */
export function useCursorStream(onSample: (sample: CursorSample) => void) {
  useEffect(() => tracker.subscribeCursor(onSample), [onSample]);
}

export { tracker };
export type { CursorSample, TrackerState };
