import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { sfx } from '../../audio/sound';
import { CameraStage } from '../../tracker/CameraStage';
import { AirTrail } from '../../tracker/AirTrail';
import { TrackerModeControl } from '../../tracker/TrackerModeControl';
import { DwellTarget } from '../../tracker/DwellTarget';
import { tracker } from '../../tracker/trackerStore';
import { useTrackerState } from '../../tracker/useTracker';
import { FractionTask } from './FractionTask';
import { SceneIntro } from './scenes/SceneIntro';
import { TeachNotation } from './scenes/TeachNotation';
import { SceneRecognition } from './scenes/SceneRecognition';
import { SceneSummary } from './scenes/SceneSummary';
import { SceneComplete } from './scenes/SceneComplete';
import { WorkshopBackdrop } from './WorkshopBackdrop';
import './lesson.css';

interface Scene {
  id: string;
  /** Shown in the HUD so the student always knows what they are doing. */
  title: string;
  challenge?: number;
  render: (next: () => void) => ReactNode;
}

interface FractionLessonProps {
  onExit: () => void;
  onKeepExploring: () => void;
}

export function FractionLesson({ onExit, onKeepExploring }: FractionLessonProps) {
  const [index, setIndex] = useState(0);
  const { mode, status } = useTrackerState();

  const scenes = useMemo<Scene[]>(
    () => [
      {
        id: 'intro',
        title: 'Meet the whole',
        render: (next) => <SceneIntro onNext={next} />,
      },
      {
        id: 'split-two',
        title: 'Share the whole',
        render: (next) => (
          <FractionTask
            kind="circle"
            skin="pizza"
            allow={['radial']}
            requiredCuts={1}
            objective="SPLIT THE PIZZA"
            askLine="What if we want to share this pizza with a friend? Can we share it equally?"
            cutInstruction="Split the whole into 2 equal parts."
            successLine="Great! We split the whole into two equal parts."
            successLabel="2 EQUAL PARTS"
            explodeOnSuccess
            onSolved={next}
          />
        ),
      },
      {
        id: 'learn-half',
        title: 'Meet one-half',
        render: (next) => (
          <TeachNotation
            numerator={1}
            denominator={2}
            word="ONE-HALF"
            line="When a whole is split into two equal parts, each part is called one-half."
            kind="circle"
            skin="pizza"
            cuts={[{ axis: 'radial', t: Math.PI / 2 }]}
            shaded={['s0']}
            onNext={next}
          />
        ),
      },
      {
        id: 'build-half',
        title: 'Build 1/2',
        render: (next) => (
          <FractionTask
            kind="circle"
            allow={['radial']}
            requiredCuts={1}
            requiredShaded={1}
            objective="MAKE 1/2"
            askLine="Your turn! Split this whole into 2 equal parts."
            cutInstruction="Split the whole into 2 equal parts."
            shadeLine="Now colour in one of the two equal parts."
            shadeInstruction="Colour 1 of the 2 equal parts."
            successLine="That is one-half - 1 out of 2 equal parts."
            successLabel="1 OUT OF 2 EQUAL PARTS"
            fractionLabel="1/2"
            onSolved={next}
          />
        ),
      },
      {
        id: 'chocolate',
        title: 'Share with four friends',
        render: (next) => (
          <FractionTask
            kind="rect"
            skin="chocolate"
            allow={['v', 'h']}
            requiredCuts={3}
            objective="MAKE 4 EQUAL PARTS"
            askLine="What if we want to share our chocolate with four friends? Can we divide the whole into four equal parts?"
            cutInstruction="Make 3 cuts so the bar has 4 equal parts - across or down, your choice."
            successLine="Four equal parts! Each one of these is called a fourth."
            successLabel="4 EQUAL PARTS · FOURTHS"
            explodeOnSuccess
            size={420}
            onSolved={next}
          />
        ),
      },
      {
        id: 'learn-fourth',
        title: 'Meet one-fourth',
        render: (next) => (
          <TeachNotation
            numerator={1}
            denominator={4}
            word="ONE-FOURTH"
            line="One of these four equal parts is called one-fourth."
            kind="rect"
            skin="chocolate"
            cuts={[
              { axis: 'v', t: 0.25 },
              { axis: 'v', t: 0.5 },
              { axis: 'v', t: 0.75 },
            ]}
            shaded={['r0c0']}
            onNext={next}
          />
        ),
      },
      {
        id: 'square-fourths',
        title: 'Fourths of a square',
        render: (next) => (
          <FractionTask
            kind="square"
            allow={['v', 'h']}
            requiredCuts={2}
            objective="DIVIDE INTO 4 EQUAL PARTS"
            askLine="Shapes can be split too. Can you divide this square into four equal parts?"
            cutInstruction="Draw two lines through the middle - one across, one down."
            successLine="Nice work. Four equal parts, every one the same size."
            successLabel="4 EQUAL PARTS"
            onSolved={next}
          />
        ),
      },
      {
        id: 'shade-two-fourths',
        title: 'Show 2/4',
        render: (next) => (
          <FractionTask
            kind="square"
            requiredCuts={0}
            requiredShaded={2}
            preCuts={[
              { axis: 'v', t: 0.5 },
              { axis: 'h', t: 0.5 },
            ]}
            objective="SHOW 2/4"
            askLine="We have four equal parts. Can you show me two-fourths?"
            cutInstruction="Colour 2 parts."
            shadeLine="Colour in 2 of the 4 equal parts."
            shadeInstruction="2 parts shaded of 4 parts total."
            successLine="That is two-fourths: 2 parts shaded, 4 parts in the whole."
            successLabel="2 SHADED OF 4 PARTS"
            fractionLabel="2/4"
            onSolved={next}
          />
        ),
      },
      {
        id: 'recognition',
        title: 'Spot the fraction',
        render: (next) => <SceneRecognition onNext={next} />,
      },
      {
        id: 'summary',
        title: 'Putting it together',
        render: (next) => <SceneSummary onNext={next} />,
      },
      {
        id: 'challenge-1',
        title: 'Final challenge',
        challenge: 1,
        render: (next) => (
          <FractionTask
            key="challenge-1"
            kind="circle"
            allow={['radial']}
            requiredCuts={1}
            requiredShaded={1}
            objective="CHALLENGE 1 · MAKE 1/2"
            askLine="Challenge one! Divide the circle into two equal parts and colour one."
            cutInstruction="Split the circle into 2 equal parts."
            shadeInstruction="Colour 1 of the 2 parts."
            successLine="1/2 complete. On to the next one!"
            successLabel="CHALLENGE 1 COMPLETE"
            fractionLabel="1/2"
            nextLabel="Challenge 2"
            onSolved={next}
          />
        ),
      },
      {
        id: 'challenge-2',
        title: 'Final challenge',
        challenge: 2,
        render: (next) => (
          <FractionTask
            key="challenge-2"
            kind="square"
            allow={['v', 'h']}
            requiredCuts={2}
            requiredShaded={1}
            objective="CHALLENGE 2 · MAKE 1/4"
            askLine="Challenge two! Divide the square into four equal parts and colour one."
            cutInstruction="Draw two lines through the middle."
            shadeInstruction="Colour 1 of the 4 parts."
            successLine="1/4 complete. One challenge to go!"
            successLabel="CHALLENGE 2 COMPLETE"
            fractionLabel="1/4"
            nextLabel="Challenge 3"
            onSolved={next}
          />
        ),
      },
      {
        id: 'challenge-3',
        title: 'Final challenge',
        challenge: 3,
        render: (next) => (
          <FractionTask
            key="challenge-3"
            kind="rect"
            allow={['v', 'h']}
            requiredCuts={3}
            requiredShaded={3}
            objective="CHALLENGE 3 · MAKE 3/4"
            askLine="Last challenge! Divide the bar into four equal parts, then colour three of them."
            cutInstruction="Make 3 cuts for 4 equal parts - across or down, your choice."
            shadeInstruction="Colour 3 of the 4 parts."
            successLine="Three out of four equal parts - that is 3/4!"
            successLabel="CHALLENGE 3 COMPLETE"
            fractionLabel="3/4"
            nextLabel="Finish"
            size={420}
            onSolved={next}
          />
        ),
      },
      {
        id: 'complete',
        title: 'Adventure complete',
        render: () => <SceneComplete onReturn={onExit} onKeepExploring={onKeepExploring} />,
      },
    ],
    [onExit, onKeepExploring],
  );

  const scene = scenes[index];
  const isChallenge = Boolean(scene.challenge);
  const isComplete = scene.id === 'complete';
  const cameraActive = mode === 'hand' && status === 'ready';

  useEffect(() => {
    return () => tracker.setDwell(0);
  }, []);

  const next = () => {
    sfx.play('tap');
    setIndex((current) => Math.min(current + 1, scenes.length - 1));
  };

  return (
    <motion.div
      className={`lesson ${isChallenge ? 'lesson--challenge' : ''} ${cameraActive ? 'lesson--camera' : ''}`}
      data-city="math"
      initial={{ opacity: 0, scale: 1.06 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <WorkshopBackdrop challenge={isChallenge} />
      {cameraActive && <CameraStage />}
      {cameraActive && <AirTrail />}

      {!isComplete && (
        <header className="lesson__hud">
          <DwellTarget onActivate={onExit}>
            <button className="city__back" onClick={onExit}>
              ← Math City
            </button>
          </DwellTarget>

          <div className="lesson__crumbs">
            <span className="lesson__path">Math City / Fractions / Level 01</span>
            <strong>{scene.title}</strong>
            <div className="lesson__steps" aria-label={`Step ${index + 1} of ${scenes.length - 1}`}>
              {scenes.slice(0, -1).map((item, i) => (
                <span key={item.id} className={i <= index ? 'is-done' : ''} />
              ))}
            </div>
          </div>

          <div className="lesson__tools">
            <TrackerModeControl />
          </div>
        </header>
      )}

      <div className="lesson__stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={scene.id}
            className="lesson__scene"
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
          >
            {scene.render(next)}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
