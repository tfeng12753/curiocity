import { useMemo } from 'react';
import { LessonShell, type LessonScene } from './LessonShell';
import { FractionTask } from './FractionTask';
import { TeachNotation } from './scenes/TeachNotation';
import { LessonComplete } from './scenes/LessonComplete';

interface FractionLesson4Props {
  onExit: () => void;
  onKeepExploring: () => void;
}

const FIFTHS_CUTS = [
  { axis: 'v' as const, t: 1 / 5 },
  { axis: 'v' as const, t: 2 / 5 },
  { axis: 'v' as const, t: 3 / 5 },
  { axis: 'v' as const, t: 4 / 5 },
];

const TENTHS_CUTS = Array.from({ length: 9 }, (_, i) => ({ axis: 'v' as const, t: (i + 1) / 10 }));

/** Chapter 2, Lesson 1 - fifths, tenths, and the same equivalence trick as thirds/sixths. */
export function FractionLesson4({ onExit, onKeepExploring }: FractionLesson4Props) {
  const scenes = useMemo<LessonScene[]>(
    () => [
      {
        id: 'fifths',
        title: 'Split into fifths',
        render: (next) => (
          <FractionTask
            kind="rect"
            allow={['v']}
            requiredCuts={4}
            requiredShaded={1}
            objective="MAKE 1/5"
            askLine="The alien crew's landing strip needs 5 equal fuel zones. Can you split it into 5 equal parts?"
            cutInstruction="Make 4 cuts so the strip has 5 equal parts."
            shadeInstruction="Colour 1 of the 5 equal parts."
            successLine="That is one-fifth - 1 out of 5 equal parts."
            successLabel="1 OUT OF 5 EQUAL PARTS"
            fractionLabel="1/5"
            size={420}
            onSolved={next}
          />
        ),
      },
      {
        id: 'learn-fifth',
        title: 'Meet one-fifth',
        render: (next) => (
          <TeachNotation
            numerator={1}
            denominator={5}
            word="ONE-FIFTH"
            line="When a whole is split into five equal parts, each part is called one-fifth."
            kind="rect"
            cuts={FIFTHS_CUTS}
            shaded={['r0c0']}
            onNext={next}
          />
        ),
      },
      {
        id: 'tenths-bar',
        title: 'Cut it again for tenths',
        render: (next) => (
          <FractionTask
            kind="rect"
            allow={['v']}
            requiredCuts={9}
            requiredShaded={2}
            preCuts={FIFTHS_CUTS}
            objective="MAKE 10 EQUAL PARTS"
            askLine="Here's the landing strip already split into fifths. What if we cut each fifth in half? Add 5 more cuts to make 10 equal parts, then colour 2 of them."
            cutInstruction="Make 5 more cuts so the strip has 10 equal parts."
            shadeInstruction="Colour 2 of the 10 equal parts."
            successLine="2/10 coloured - and that's the exact same amount as 1/5! Same size, different name."
            successLabel="2 OUT OF 10 EQUAL PARTS"
            fractionLabel="2/10 = 1/5"
            explodeOnSuccess
            size={420}
            onSolved={next}
          />
        ),
      },
      {
        id: 'learn-tenth',
        title: 'Meet one-tenth',
        render: (next) => (
          <TeachNotation
            numerator={1}
            denominator={10}
            word="ONE-TENTH"
            line="One of these ten equal parts is called one-tenth. Two of them, 2/10, is the same amount as 1/5."
            kind="rect"
            cuts={TENTHS_CUTS}
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
            levelId="alien-1"
            badgeId="alien-landing-navigator"
            title="Alien Landing Site Complete!"
            blurb="You split the landing strip into fifths and tenths, and discovered that 2/10 is the same amount as 1/5."
            learned={['Fifths', 'Tenths', 'Equivalent fractions (2/10 = 1/5)', 'Cutting a shape twice as fine']}
            recap={[
              { top: '5 EQUAL PARTS', bottom: 'fifths' },
              { top: '10 EQUAL PARTS', bottom: 'tenths' },
            ]}
            fractions={['1/5 = 1 out of 5', '1/10 = 1 out of 10', '2/10 = 1/5']}
            onReturn={onExit}
            onKeepExploring={onKeepExploring}
          />
        ),
      },
    ],
    [],
  );

  return <LessonShell pathLabel="Math City / Alien Landing Site / Level 04" scenes={scenes} onExit={onExit} />;
}
