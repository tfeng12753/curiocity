/*
  Deciding which single target the finger is aiming at.

  Every InteractiveSurface used to subscribe to the cursor stream and decide on
  its own whether it had been activated. With nothing coordinating them, three
  things went wrong at once:

    - overlapping and nested surfaces all committed off the same gesture
    - the global "hand just opened" flag fired every surface under the cursor,
      because each one saw the same flag and each one acted on it
    - a commit on one surface did nothing to suppress its neighbours, so a
      single gesture could cascade through a freshly mounted screen

  So arming is now centralised. Surfaces no longer decide; they *claim*, and
  exactly one claim per frame wins. Everything else is inert - it cannot fill a
  dwell ring and it cannot be committed by a gesture.

  Resolution is deliberately one frame behind. Surfaces claim in whatever order
  React happens to have mounted them, so a winner cannot be known until every
  claim for that frame is in. Reading the previous frame's decision costs ~16ms
  of latency, which is invisible next to the hold times involved, and avoids
  any dependency on subscription order.

  The frame boundary comes from the tracker itself (`beginFrame`, called as each
  cursor sample is published, before any surface sees it) rather than from the
  claims. Deriving it from claims would mean a frame in which nothing claimed -
  the cursor sitting over empty space - never resolved at all, leaving the last
  winner armed indefinitely.
*/

/** Nothing may commit for this long after any commit, anywhere. */
const GLOBAL_COMMIT_LOCK_MS = 520;
/**
 * A surface cannot be armed until it has existed this long. Without it, a scene
 * mounting under a resting hand starts charging a dwell immediately and
 * self-advances - which is exactly why lesson sequences appeared to skip ahead
 * on their own.
 */
export const MOUNT_GRACE_MS = 450;

interface Claim {
  id: number;
  /**
   * Smaller wins. Area in px^2 of the claiming surface, so a button nested
   * inside a larger panel takes precedence over the panel.
   */
  specificity: number;
  /** True when the live cursor is inside, rather than only the prediction. */
  direct: boolean;
}

let claims: Claim[] = [];
let armedId: number | null = null;
let lockUntil = 0;
let nextId = 1;

const armedListeners = new Set<(id: number | null) => void>();

function resolve() {
  // A surface the finger is actually inside always beats one that is merely
  // predicted, so prediction can only ever arm something *early* - never steal
  // an target the student has already reached.
  let best: Claim | null = null;
  for (const claim of claims) {
    if (!best) {
      best = claim;
      continue;
    }
    if (claim.direct !== best.direct) {
      if (claim.direct) best = claim;
      continue;
    }
    if (claim.specificity < best.specificity) best = claim;
  }

  const next = best ? best.id : null;
  if (next !== armedId) {
    armedId = next;
    armedListeners.forEach((listener) => listener(armedId));
  }
  claims = [];
}

export const arbiter = {
  /** Hands out a stable identity for one surface instance. */
  register(): number {
    nextId += 1;
    return nextId;
  },

  /**
   * Closes the previous cursor frame and opens a new one. Called by the tracker
   * as each sample is published, ahead of every surface listener.
   */
  beginFrame() {
    resolve();
  },

  /**
   * Declares that this surface is a candidate for the current cursor frame.
   * Must be called at most once per surface per frame.
   */
  claim(id: number, specificity: number, direct: boolean) {
    claims.push({ id, specificity, direct });
  },

  /**
   * Whether this surface won the most recent resolved frame. Surfaces check
   * this before accumulating dwell or honouring a commit gesture.
   */
  isArmed(id: number): boolean {
    return armedId === id;
  },

  getArmed(): number | null {
    return armedId;
  },

  /** True when the global post-commit lock has expired. */
  canCommit(now: number): boolean {
    return now >= lockUntil;
  },

  /** Starts the global lock. Called by whichever surface just committed. */
  noteCommit(now: number) {
    lockUntil = now + GLOBAL_COMMIT_LOCK_MS;
  },

  /**
   * Drops a surface that is unmounting. Without this, a surface that wins a
   * frame and then unmounts (which is the common case - committing usually
   * advances the scene) leaves `armedId` pointing at something gone, and the
   * next real candidate cannot tell that it is now unopposed.
   */
  release(id: number) {
    claims = claims.filter((claim) => claim.id !== id);
    if (armedId === id) {
      armedId = null;
      armedListeners.forEach((listener) => listener(null));
    }
  },

  subscribeArmed(listener: (id: number | null) => void) {
    armedListeners.add(listener);
    listener(armedId);
    return () => {
      armedListeners.delete(listener);
    };
  },

  /** Test/debug hook - wipes all arbitration state. */
  _reset() {
    claims = [];
    armedId = null;
    lockUntil = 0;
  },
};
