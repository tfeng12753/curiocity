import { useMemo } from 'react';
import { LessonShell, type LessonScene } from './LessonShell';
import { RampTask } from './physics/RampTask';
import { LessonComplete } from './scenes/LessonComplete';

interface PhysicsLesson1Props {
  onExit: () => void;
  onKeepExploring: () => void;
}

/**
 * Physics City, Lesson 1: Motion Ramps. The same "point to set a value,
 * commit, see what happens" shape the Fraction Workshop uses for cutting -
 * here the value is a ramp's height, and what happens is a ball rolling
 * farther the taller you make it. Three tries at increasing distance teach
 * the relationship by feel rather than by formula.
 */
export function PhysicsLesson1({ onExit, onKeepExploring }: PhysicsLesson1Props) {
  const scenes = useMemo<LessonScene[]>(
    () => [
      {
        id: 'ramp-near',
        title: 'Roll it to the flag',
        render: (next) => (
          <RampTask
            target={{ x: 46, tolerance: 7 }}
            objective="REACH THE FLAG"
            askLine="A taller ramp sends the ball rolling faster - and farther! Set a height and let it go to reach the flag."
            instruction="Get the ball to land on the flag."
            successLine="You did it! A taller ramp really does send the ball farther."
            successLabel="REACHED THE FLAG"
            onSolved={next}
          />
        ),
      },
      {
        id: 'ramp-mid',
        title: 'A farther flag',
        render: (next) => (
          <RampTask
            target={{ x: 62, tolerance: 6 }}
            objective="REACH THE FARTHER FLAG"
            askLine="This flag is farther away. What do you think - taller ramp, or shorter?"
            instruction="This one needs more height. Reach the flag."
            successLine="Exactly - a taller ramp for a farther flag. You're getting the feel for it!"
            successLabel="REACHED THE FLAG"
            onSolved={next}
          />
        ),
      },
      {
        id: 'ramp-far',
        title: 'The long shot',
        render: (next) => (
          <RampTask
            target={{ x: 80, tolerance: 5 }}
            objective="THE LONG SHOT"
            askLine="Last one - and it's the farthest flag yet. Give it everything you've got!"
            instruction="Send the ball as far as it can go, right onto the flag."
            successLine="A perfect long shot! Height in, distance out - that's the whole idea."
            successLabel="LONG SHOT LANDED"
            nextLabel="Finish"
            onSolved={next}
          />
        ),
      },
      {
        id: 'complete',
        title: 'Lesson complete',
        render: () => (
          <LessonComplete
            cityId="physics"
            levelId="motion"
            badgeId="ramp-master"
            title="Motion Ramps Complete!"
            blurb="You found the right ramp height for three flags at three different distances."
            learned={[
              'A taller ramp sends a ball rolling faster',
              'More speed at the bottom means it rolls farther',
              'Height in, distance out - the taller the ramp, the farther it goes',
            ]}
            recap={[
              { top: 'TALLER RAMP', bottom: 'more speed' },
              { top: 'MORE SPEED', bottom: 'farther roll' },
            ]}
            fractions={['Short ramp = short roll', 'Tall ramp = long roll']}
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
      pathLabel="Physics City / Motion Ramps / Level 01"
      scenes={scenes}
      onExit={onExit}
      backdropSymbols={['→', '↗', '⚡', '⤴', '●']}
    />
  );
}
