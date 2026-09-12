import { useCallback, useState, type ComponentType } from 'react';
import { AnimatePresence } from 'motion/react';
import { ProgressProvider } from './state/progress';
import type { CityId } from './data/cities';
import { WorldScene } from './components/world/WorldScene';
import { CityScene } from './components/city/CityScene';
import { LevelEntrance } from './components/level/LevelEntrance';
import { FractionLesson } from './components/lesson/FractionLesson';
import { FractionLesson2 } from './components/lesson/FractionLesson2';
import { FractionLesson3 } from './components/lesson/FractionLesson3';
import { TopNav, type NavPanel } from './components/layout/TopNav';
import { NavDrawer } from './components/layout/NavDrawer';
import { FingerCursor } from './tracker/FingerCursor';
import { tracker } from './tracker/trackerStore';

interface LessonProps {
  onExit: () => void;
  onKeepExploring: () => void;
}

/** Maps a level id to the lesson component that plays it. */
const LESSON_COMPONENTS: Record<string, ComponentType<LessonProps>> = {
  fractions: FractionLesson,
  'fractions-2': FractionLesson2,
  'fractions-3': FractionLesson3,
};

type View =
  | { name: 'world' }
  | { name: 'city'; cityId: CityId }
  | { name: 'entrance'; cityId: CityId; levelId: string }
  | { name: 'lesson'; cityId: CityId; levelId: string };

export function App() {
  const [view, setView] = useState<View>({ name: 'world' });
  const [panel, setPanel] = useState<NavPanel>(null);

  const goWorld = useCallback(() => {
    tracker.stopCamera();
    tracker.usePointer();
    setPanel(null);
    setView({ name: 'world' });
  }, []);

  const goCity = useCallback((cityId: CityId) => {
    tracker.stopCamera();
    tracker.usePointer();
    setPanel(null);
    setView({ name: 'city', cityId });
  }, []);

  const cityId = 'cityId' in view ? view.cityId : undefined;

  return (
    <ProgressProvider>
      <div className="app" data-city={cityId}>
        <AnimatePresence mode="wait">
          {view.name === 'world' && <WorldScene key="world" onEnterCity={goCity} />}

          {view.name === 'city' && (
            <CityScene
              key={`city-${view.cityId}`}
              cityId={view.cityId}
              onBack={goWorld}
              onOpenLevel={(levelId) => setView({ name: 'entrance', cityId: view.cityId, levelId })}
            />
          )}

          {view.name === 'entrance' && (
            <LevelEntrance
              key={`entrance-${view.levelId}`}
              cityId={view.cityId}
              levelId={view.levelId}
              onBack={() => setView({ name: 'city', cityId: view.cityId })}
              onStart={() => setView({ name: 'lesson', cityId: view.cityId, levelId: view.levelId })}
            />
          )}

          {view.name === 'lesson' &&
            (() => {
              const Lesson = LESSON_COMPONENTS[view.levelId] ?? FractionLesson;
              return <Lesson key="lesson" onExit={() => goCity(view.cityId)} onKeepExploring={goWorld} />;
            })()}
        </AnimatePresence>

        {view.name !== 'lesson' && (
          <TopNav onHome={goWorld} openPanel={panel} onOpenPanel={setPanel} />
        )}

        <AnimatePresence>
          {panel && <NavDrawer key={panel} panel={panel} onClose={() => setPanel(null)} />}
        </AnimatePresence>

        <FingerCursor active={view.name === 'lesson'} />
      </div>
    </ProgressProvider>
  );
}