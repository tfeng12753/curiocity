import { useMemo } from 'react';
import { LessonShell, type LessonScene } from './LessonShell';
import { AtomTask } from './chemistry/AtomTask';
import { ELEMENTS } from './chemistry/atomGeometry';
import { LessonComplete } from './scenes/LessonComplete';

interface ChemistryLesson1Props {
  onExit: () => void;
  onKeepExploring: () => void;
}

const [HYDROGEN, HELIUM, CARBON] = ELEMENTS;

/**
 * Chemistry City, Lesson 1: Atoms & Elements. The same "point, commit,
 * watch it build up" shape as cutting a shape or setting a ramp height -
 * here each tap adds one particle, and the target is a real element
 * instead of a fraction or a distance.
 */
export function ChemistryLesson1({ onExit, onKeepExploring }: ChemistryLesson1Props) {
  const scenes = useMemo<LessonScene[]>(
    () => [
      {
        id: 'hydrogen',
        title: 'Build hydrogen',
        render: (next) => (
          <AtomTask
            target={HYDROGEN}
            askLine="Every atom starts with protons in the middle and electrons around the outside. Let's build the simplest one there is - tap the particles to add them."
            onSolved={next}
          />
        ),
      },
      {
        id: 'helium',
        title: 'Build helium',
        render: (next) => (
          <AtomTask
            target={HELIUM}
            askLine="This one needs two of everything - protons and neutrons packed in the middle, two electrons around the outside."
            onSolved={next}
          />
        ),
      },
      {
        id: 'carbon',
        title: 'Build carbon',
        render: (next) => (
          <AtomTask
            target={CARBON}
            askLine="The biggest one yet - six of every particle. Take your time!"
            onSolved={next}
          />
        ),
      },
      {
        id: 'complete',
        title: 'Lesson complete',
        render: () => (
          <LessonComplete
            cityId="chemistry"
            levelId="atoms"
            badgeId="atom-builder"
            title="Atoms & Elements Complete!"
            blurb="You built hydrogen, helium and carbon, one proton, neutron and electron at a time."
            learned={[
              'Atoms are built from protons, neutrons and electrons',
              'Protons and neutrons pack into the nucleus',
              'Electrons circle around the outside',
              'The number of protons decides which element it is',
            ]}
            recap={[
              { top: 'PROTONS + NEUTRONS', bottom: 'the nucleus' },
              { top: 'ELECTRONS', bottom: 'orbit around it' },
            ]}
            fractions={['Hydrogen: 1 proton', 'Helium: 2 of everything', 'Carbon: 6 of everything']}
            onReturn={onExit}
            onKeepExploring={onKeepExploring}
          />
        ),
      },
    ],
    [],
  );

  return (
    <LessonShell
      pathLabel="Chemistry City / Atoms & Elements / Level 01"
      scenes={scenes}
      onExit={onExit}
      backdropSymbols={['H', 'He', 'C', 'e-', 'p+']}
    />
  );
}
