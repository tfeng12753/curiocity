/*
  Curio's spoken variety.

  Every task in every lesson runs through FractionTask, so its handful of
  hardcoded lines were heard dozens of times in a sitting - and the one a child
  heard most was the retry line, because the more they struggled the more often
  it fired. Hearing the identical sentence read back after every miss is the
  fastest way to make a friendly guide sound like a broken machine.

  Two things fix that, and they are deliberately split:

    - these pools, which are instant, free, work with no network and no API key,
      and cover the lines that fire constantly
    - the AI hint path (hint.ts), which is genuinely contextual but costs a
      round-trip, so it is prefetched in the background and only ever used when
      it is already sitting ready

  Keeping the hot path local also protects the narration bill: the speech proxy
  caches by exact text, so a small rotating set of phrases still gets cache
  hits, where endlessly unique text would mean a fresh ElevenLabs synthesis for
  every single cut a child makes.
*/

export type LineKind =
  | 'retryGentle'
  | 'retryWarmer'
  | 'retrySupportive'
  | 'cutGood'
  | 'cutLast'
  | 'toShade'
  | 'shadeProgress'
  | 'shadeTooMany'
  | 'quizGentle'
  | 'quizWarmer'
  | 'quizSupportive';

/**
 * Retry lines never name the fix ("make them equal") as an instruction to
 * copy - they point attention back at the shape and hand the try back. The
 * three tiers escalate with how long the student has been stuck.
 */
const POOLS: Record<LineKind, string[]> = {
  retryGentle: [
    'Ooh, not quite yet - have another look at the pieces and try that one again.',
    'Close! Take a peek at the sizes, then give it another go.',
    "Hmm, those pieces don't quite match. Want to try that cut once more?",
    'Nearly! Check whether every piece is the same, then have another try.',
  ],

  retryWarmer: [
    "That's a tricky one. Look at which piece is biggest, and try again - I'm right here.",
    'Still not matching. Compare the pieces to each other, then have another go.',
    "No worries at all - tricky cuts take a few tries. Check the sizes and try again.",
    'Almost there. See if one piece is bigger than the others, then try once more.',
  ],

  retrySupportive: [
    "You're working really hard at this one, and that's exactly right. Take your time and try again.",
    "This one is genuinely tricky - lots of people need a few goes. Have another try.",
    "I know this one is stubborn. Go slowly, look at each piece, and try again - you've got this.",
    "Don't worry, we can keep trying as long as you like. Have a careful look and go again.",
  ],

  cutGood: [
    'Nice cut!',
    'Lovely - that one landed well.',
    'Great slice!',
    'Ooh, neat.',
    "That's the one.",
  ],

  cutLast: [
    'One more to go!',
    'Just one more cut and we are there.',
    'Last one now!',
    'One left - you can almost see it.',
  ],

  toShade: [
    'Perfect! Now colour in the parts we need.',
    'Lovely cutting. Time to colour some parts in.',
    'That is a beautiful split. Now let us colour the parts we want.',
    'Great! Next job - colour in the right number of parts.',
  ],

  shadeProgress: [
    'Keep going!',
    'That is it - carry on.',
    'Nice, keep colouring.',
    'Good - a few more to pick.',
  ],

  shadeTooMany: [
    'That is one too many - tap one again to take it back off.',
    'Ooh, a few too many. Tap one to remove it.',
    'We only need a certain number - tap one again to undo it.',
  ],

  /*
    Picking the wrong picture used to say nothing at all - the option wobbled,
    a sound played, and Curio carried on as if nothing had happened. A child
    who guesses wrong is exactly the one who needs to hear something, so these
    answer instead of leaving the silence. They point at what to compare
    without ever naming the right picture.
  */
  quizGentle: [
    'Not that one - have another look at the pictures.',
    'Hmm, not quite. Compare them again and pick another.',
    'Close! Look carefully at how much is coloured in each one.',
    'Not this time - check the pictures once more.',
  ],

  quizWarmer: [
    'Still not it. Count the coloured parts in each picture, then choose.',
    'Try comparing them side by side - which one has more filled in?',
    'Have a really close look at the parts before you pick again.',
    'Not that one either. Take your time - what is different between them?',
  ],

  quizSupportive: [
    'These ones are tricky! Look slowly at each picture, and pick when you are ready.',
    'No rush at all. Count the parts in one picture, then the other.',
    'You are doing fine - this is a hard one. Have another careful look.',
    'Keep going, you will spot it. Compare how much is coloured in each.',
  ],
};

/**
 * Remembers what was said last for each kind, so a phrase is never repeated
 * back-to-back. Module scope rather than per-component on purpose: the same
 * task is re-mounted constantly as scenes advance, and a per-instance memory
 * would happily say the same thing twice in a row across that boundary.
 */
const lastIndex = new Map<LineKind, number>();

export function pickLine(kind: LineKind): string {
  const pool = POOLS[kind];
  if (pool.length === 1) return pool[0];

  const previous = lastIndex.get(kind);
  let index = Math.floor(Math.random() * pool.length);
  if (index === previous) index = (index + 1) % pool.length;
  lastIndex.set(kind, index);
  return pool[index];
}

/** Picks the retry tier from how long the student has been stuck on this task. */
export function retryLineFor(mistakeCount: number): string {
  if (mistakeCount >= 4) return pickLine('retrySupportive');
  if (mistakeCount >= 2) return pickLine('retryWarmer');
  return pickLine('retryGentle');
}

/** Same escalation, for picking the wrong picture in a quiz round. */
export function quizRetryFor(wrongCount: number): string {
  if (wrongCount >= 4) return pickLine('quizSupportive');
  if (wrongCount >= 2) return pickLine('quizWarmer');
  return pickLine('quizGentle');
}

/** Praise for a good cut, with a nudge about what is left to do. */
export function cutPraise(cutsRemaining: number): string {
  return cutsRemaining === 1 ? `${pickLine('cutGood')} ${pickLine('cutLast')}` : pickLine('cutGood');
}

/** Test hook - clears the "do not repeat" memory. */
export function _resetDialogueMemory() {
  lastIndex.clear();
}
