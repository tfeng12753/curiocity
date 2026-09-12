import { useMemo } from 'react';
import { LessonShell, type LessonScene } from './LessonShell';
import { FractionTask } from './FractionTask';
import { SceneCompare, type CompareRound } from './scenes/SceneCompare';
import { LessonComplete } from './scenes/LessonComplete';

const COMPARE_ROUNDS: CompareRound[] = [
  {
    left: {
      id: 'third',
      kind: 'rect',
      cuts: [
        { axis: 'v', t: 1 / 3 },
        { axis: 'v', t: 2 / 3 },
      ],
      shaded: ['r0c0'],
      fraction: '1/3',
    },
    right: {
      id: 'fourth',
      kind: 'rect',
      cuts: [
        { axis: 'v', t: 0.25 },
        { axis: 'v', t: 0.5 },
        { axis: 'v', t: 0.75 },
      ],
      shaded: ['r0c0'],
      fraction: '1/4',
    },
    answerId: 'third',
    ask: 'Which is bigger - one-third or one-fourth?',
    success: 'Right! Fewer, bigger pieces - 1/3 is more than 1/4.',
  },
  {
    left: {
      id: 'two-sixths',
      kind: 'rect',
      cuts: [
        { axis: 'v', t: 1 / 6 },
        { axis: 'v', t: 2 / 6 },
        { axis: 'v', t: 3 / 6 },
        { axis: 'v', t: 4 / 6 },
        { axis: 'v', t: 5 / 6 },
      ],
      shaded: ['r0c0', 'r0c1'],
      fraction: '2/6',
    },
    right: {
      id: 'half',
      kind: 'circle',
      cuts: [{ axis: 'radial', t: Math.PI / 2 }],
      shaded: ['s0'],
      fraction: '1/2',
    },
    answerId: 'half',
    ask: 'Trickier one: which is bigger - two-sixths or one-half? (Hint: what is 2/6 the same as?)',
    success: "2/6 is the same as 1/3, and 1/3 is less than 1/2 - so 1/2 wins!",
  },
];

interface FractionLesson3Props {
  onExit: () => void;
  onKeepExploring: () => void;
}

/** Chapter 1, Lesson 3 - mixed practice across everything so far, then a comparison challenge. */
export function FractionLesson3({ onExit, onKeepExploring }: FractionLesson3Props) {
  const scenes = useMemo<LessonScene[]>(
    () => [
      {
        id: 'challenge-half',
        title: 'Final challenge',
        challenge: 1,
        render: (next) => (
          <FractionTask
            key="challenge-half"
            kind="circle"
            skin="pizza"
            allow={['radial']}
            requiredCuts={1}
            requiredShaded={1}
            objective="CHALLENGE 1 · MAKE 1/2"
            askLine="Warm-up round! Split the pizza into 2 equal parts and colour one."
            cutInstruction="Split the whole into 2 equal parts."
            shadeInstruction="Colour 1 of the 2 parts."
            successLine="1/2 - nice and quick. Let's speed up."
            successLabel="CHALLENGE 1 COMPLETE"
            fractionLabel="1/2"
            nextLabel="Challenge 2"
            onSolved={next}
          />
        ),
      },
      {
        id: 'challenge-fourths',
        title: 'Final challenge',
        challenge: 2,
        render: (next) => (
          <FractionTask
            key="challenge-fourths"
            kind="square"
            allow={['v', 'h']}
            requiredCuts={3}
            requiredShaded={3}
            objective="CHALLENGE 2 · MAKE 3/4"
            askLine="Divide the square into 4 equal parts, then colour 3 of them."
            cutInstruction="Make 3 cuts for 4 equal parts - across or down, your choice."
            shadeInstruction="Colour 3 of the 4 parts."
            successLine="3/4! You've got fourths down."
            successLabel="CHALLENGE 2 COMPLETE"
            fractionLabel="3/4"
            nextLabel="Challenge 3"
            onSolved={next}
          />
        ),
      },
      {
        id: 'challenge-thirds',
        title: 'Final challenge',
        challenge: 3,
        render: (next) => (
          <FractionTask
            key="challenge-thirds"
            kind="rect"
            allow={['v']}
            requiredCuts={2}
            requiredShaded={1}
            objective="CHALLENGE 3 · MAKE 1/3"
            askLine="One more cut challenge! Split the bar into 3 equal parts and colour one."
            cutInstruction="Make 2 cuts for 3 equal parts."
            shadeInstruction="Colour 1 of the 3 parts."
            successLine="1/3 - now let's compare some fractions."
            successLabel="CHALLENGE 3 COMPLETE"
            fractionLabel="1/3"
            nextLabel="Challenge 4"
            size={420}
            onSolved={next}
          />
        ),
      },
      {
        id: 'compare',
        title: 'Compare fractions',
        challenge: 4,
        render: (next) => <SceneCompare rounds={COMPARE_ROUNDS} onNext={next} />,
      },
      {
        id: 'complete',
        title: 'Lesson complete',
        render: () => (
          <LessonComplete
            cityId="math"
            levelId="fractions-3"
            badgeId="fraction-master"
            title="Fraction Challenge Complete!"
            blurb="You practiced everything - halves, fourths, thirds and sixths - and proved you can compare fractions."
            learned={[
              'Mixed practice with halves, fourths and thirds',
              'Comparing two fractions to find the bigger one',
              'Spotting equivalent fractions in disguise',
            ]}
            recap={[
              { top: '1/3 > 1/4', bottom: 'fewer, bigger pieces' },
              { top: '1/2 > 2/6', bottom: 'since 2/6 = 1/3' },
            ]}
            fractions={['1/2', '3/4', '1/3', '2/6 = 1/3']}
            chapterCompleteNote="Chapter 1 complete! Chapter 2 is now open."
            onReturn={onExit}
            onKeepExploring={onKeepExploring}
          />
        ),
      },
    ],
    [],
  );

  return <LessonShell pathLabel="Math City / Fraction Challenge / Level 03" scenes={scenes} onExit={onExit} />;
}
