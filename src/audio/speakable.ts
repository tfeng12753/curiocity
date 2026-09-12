/*
  Turns written lesson copy into something a voice can read aloud.

  The dialogue is written to be *read*, so it is full of "1/2", "2/6 = 1/3"
  and "3/4". Handed to a speech engine verbatim, ElevenLabs and the browser
  both say "one slash two" (or worse, "one divided by two"), which is exactly
  the misconception the lesson is trying to prevent. The on-screen text keeps
  its notation; only the narration is rewritten.
*/

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six',
  'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
];

/** Denominator names, singular and plural. */
const DENOMINATORS: Record<number, [string, string]> = {
  2: ['half', 'halves'],
  3: ['third', 'thirds'],
  4: ['fourth', 'fourths'],
  5: ['fifth', 'fifths'],
  6: ['sixth', 'sixths'],
  7: ['seventh', 'sevenths'],
  8: ['eighth', 'eighths'],
  9: ['ninth', 'ninths'],
  10: ['tenth', 'tenths'],
  12: ['twelfth', 'twelfths'],
};

function numberWord(value: number) {
  return ONES[value] ?? String(value);
}

/** "3/4" -> "three fourths", "1/2" -> "one half". */
export function fractionToWords(numerator: number, denominator: number) {
  const names = DENOMINATORS[denominator];
  // Anything outside the lesson's vocabulary reads as "n over m", which is
  // still correct English and far better than "n slash m".
  if (!names) return `${numberWord(numerator)} over ${numberWord(denominator)}`;

  // A whole is a whole, not "four fourths".
  if (numerator === denominator) return 'one whole';

  const [singular, plural] = names;
  return `${numberWord(numerator)} ${numerator === 1 ? singular : plural}`;
}

export function speakable(text: string) {
  return (
    text
      // Fractions first, so the "/" is gone before anything else looks at it.
      .replace(/(\d+)\s*\/\s*(\d+)/g, (match, top: string, bottom: string) => {
        const numerator = Number(top);
        const denominator = Number(bottom);
        if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
          return match;
        }
        return fractionToWords(numerator, denominator);
      })
      // "2/6 = 1/3" is read as a sentence, not as an equation.
      .replace(/\s*=\s*/g, ' is the same as ')
      // An en dash used as a pause becomes a comma, which speech engines
      // actually honour; a hyphen inside a word (one-sixth) is left alone.
      .replace(/\s+[-–—]\s+/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}
