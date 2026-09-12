import { useMemo } from 'react';
import { LessonShell, type LessonScene } from './LessonShell';
import { FractionTask } from './FractionTask';
import { TeachNotation } from './scenes/TeachNotation';
import { LessonComplete } from './scenes/LessonComplete';

interface FractionLesson2Props {
  onExit: () => void;
  onKeepExploring: () => void;
}

/** Chapter 1, Lesson 2 - thirds, sixths, and a first taste of equivalence. */
export function FractionLesson2({ onExit, onKeepExploring }: FractionLesson2Props) {
  const scenes = useMemo<LessonScene[]>(
    () => [
      {
        id: 'thirds',
        title: 'Split into thirds',
        render: (next) => (
          <FractionTask
            kind="rect"
            allow={['v']}
            requiredCuts={2}
            requiredShaded={1}
            objective="MAKE 1/3"
            askLine="Three friends want to share this ribbon equally. Can you split it into 3 equal parts?"
            cutInstruction="Make 2 cuts so the ribbon has 3 equal parts."
            shadeInstruction="Colour 1 of the 3 equal parts."
            successLine="That is one-third - 1 out of 3 equal parts."
            successLabel="1 OUT OF 3 EQUAL PARTS"
            fractionLabel="1/3"
            size={420}
            onSolved={next}
          />
        ),
      },
      {
        id: 'learn-third',
        title: 'Meet one-third',
        render: (next) => (
          <TeachNotation
            numerator={1}
            denominator={3}
            word="ONE-THIRD"
            line="When a whole is split into three equal parts, each part is called one-third."
            kind="rect"
            cuts={[
              { axis: 'v', t: 1 / 3 },
              { axis: 'v', t: 2 / 3 },
            ]}
            shaded={['r0c0']}
            onNext={next}
          />
        ),
      },
      {
        id: 'sixths-bar',
        title: 'Cut it again for sixths',
        render: (next) => (
          <FractionTask
            kind="rect"
            skin="chocolate"
            allow={['v']}
            requiredCuts={5}
            requiredShaded={2}
            preCuts={[
              { axis: 'v', t: 1 / 3 },
              { axis: 'v', t: 2 / 3 },
            ]}
            objective="MAKE 6 EQUAL PARTS"
            askLine="Here's a chocolate bar already split into thirds. What if we cut each third in half? Add 3 more cuts to make 6 equal parts, then colour 2 of them."
            cutInstruction="Make 3 more cuts so the bar has 6 equal parts."
            shadeInstruction="Colour 2 of the 6 equal parts."
            successLine="2/6 coloured - and that's the exact same amount as 1/3! Same size, different name."
            successLabel="2 OUT OF 6 EQUAL PARTS"
            fractionLabel="2/6 = 1/3"
            explodeOnSuccess
            size={420}
            onSolved={next}
          />
        ),
      },
      {
        id: 'learn-sixth',
        title: 'Meet one-sixth',
        render: (next) => (
          <TeachNotation
            numerator={1}
            denominator={6}
            word="ONE-SIXTH"
            line="One of these six equal parts is called one-sixth. Two of them, 2/6, is the same amount as 1/3."
            kind="rect"
            skin="chocolate"
            cuts={[
              { axis: 'v', t: 1 / 6 },
              { axis: 'v', t: 2 / 6 },
              { axis: 'v', t: 3 / 6 },
              { axis: 'v', t: 4 / 6 },
              { axis: 'v', t: 5 / 6 },
            ]}
            shaded={['r0c0']}
            onNext={next}
          />
        ),
      },
      {
        id: 'complete',
        title: 'Lesson complete',
        render: () => (
          <LessonComplete
            cityId="math"
            levelId="fractions-2"
            badgeId="thirds-and-sixths-explorer"
            title="Thirds & Sixths Complete!"
            blurb="You split wholes into thirds and sixths, and discovered that 2/6 and 1/3 are the same amount."
            learned={['Thirds', 'Sixths', 'Equivalent fractions (2/6 = 1/3)', 'Cutting a shape twice as fine']}
            recap={[
              { top: '3 EQUAL PARTS', bottom: 'thirds' },
              { top: '6 EQUAL PARTS', bottom: 'sixths' },
            ]}
            fractions={['1/3 = 1 out of 3', '1/6 = 1 out of 6', '2/6 = 1/3']}
            onReturn={onExit}
            onKeepExploring={onKeepExploring}
          />
        ),
      },
    ],
    [],
  );

  return <LessonShell pathLabel="Math City / Thirds & Sixths / Level 02" scenes={scenes} onExit={onExit} />;
}
