import { useCallback, useState, type ComponentType } from 'react';
import { AnimatePresence } from 'motion/react';
import { ProgressProvider } from './state/progress';
import { RoleProvider, useRole } from './state/role';
import type { CityId } from './data/cities';
import { WorldScene } from './components/world/WorldScene';
import { CityScene } from './components/city/CityScene';
import { LevelEntrance } from './components/level/LevelEntrance';
import { FractionLesson } from './components/lesson/FractionLesson';
import { FractionLesson2 } from './components/lesson/FractionLesson2';
import { FractionLesson3 } from './components/lesson/FractionLesson3';
import { TopNav, type NavPanel } from './components/layout/TopNav';
import { NavDrawer } from './components/layout/NavDrawer';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { FingerCursor } from './tracker/FingerCursor';
import { CameraGate } from './tracker/CameraGate';
import { TrackerModeControl } from './tracker/TrackerModeControl';
import { useTrackerState } from './tracker/useTracker';

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
  return (
    <ProgressProvider>
      <RoleProvider>
        <AppShell />
      </RoleProvider>
    </ProgressProvider>
  );
}

function AppShell() {
  const [view, setView] = useState<View>({ name: 'world' });
  const [panel, setPanel] = useState<NavPanel>(null);
  const { role, setRole } = useRole();
  const { onboarded } = useTrackerState();
  const teacherMode = role === 'teacher';

  // Camera/hand mode, once chosen, now follows the student around the whole
  // site instead of being reset back to pointer on every navigation - this
  // used to force pointer mode on every world/city visit, which is exactly
  // why hand tracking felt lesson-only rather than something the rest of
  // the site could be played with too.
  const goWorld = useCallback(() => {
    setPanel(null);
    setView({ name: 'world' });
  }, []);

  const goCity = useCallback((cityId: CityId) => {
    setPanel(null);
    setView({ name: 'city', cityId });
  }, []);

  const goTeacher = useCallback(() => {
    setPanel(null);
    setRole('teacher');
  }, [setRole]);

  const goStudent = useCallback(() => {
    setPanel(null);
    setRole('student');
    setView({ name: 'world' });
  }, [setRole]);

  const cityId = 'cityId' in view ? view.cityId : undefined;

  return (
    <div className="app" data-city={teacherMode ? undefined : cityId}>
      <AnimatePresence mode="wait">
        {teacherMode && <TeacherDashboard key="teacher" />}

        {!teacherMode && view.name === 'world' && <WorldScene key="world" onEnterCity={goCity} />}

        {!teacherMode && view.name === 'city' && (
          <CityScene
            key={`city-${view.cityId}`}
            cityId={view.cityId}
            onBack={goWorld}
            onOpenLevel={(levelId) => setView({ name: 'entrance', cityId: view.cityId, levelId })}
          />
        )}

        {!teacherMode && view.name === 'entrance' && (
          <LevelEntrance
            key={`entrance-${view.levelId}`}
            cityId={view.cityId}
            levelId={view.levelId}
            onBack={() => setView({ name: 'city', cityId: view.cityId })}
            onStart={() => setView({ name: 'lesson', cityId: view.cityId, levelId: view.levelId })}
          />
        )}

        {!teacherMode &&
          view.name === 'lesson' &&
          (() => {
            const Lesson = LESSON_COMPONENTS[view.levelId] ?? FractionLesson;
            return <Lesson key="lesson" onExit={() => goCity(view.cityId)} onKeepExploring={goWorld} />;
          })()}
      </AnimatePresence>

      {(teacherMode || view.name !== 'lesson') && (
        <TopNav
          onHome={teacherMode ? goStudent : goWorld}
          openPanel={panel}
          onOpenPanel={setPanel}
          teacherMode={teacherMode}
          onTeacher={goTeacher}
          onStudent={goStudent}
        />
      )}

      <AnimatePresence>
        {!teacherMode && panel && <NavDrawer key={panel} panel={panel} onClose={() => setPanel(null)} />}
      </AnimatePresence>

      {/* The character cursor and its mode toggle live at the app root, not
          inside any one screen, so hand-tracking (once taught) works the
          same way on the world map, a city, an entrance screen, or a
          lesson - not just lessons. */}
      {!teacherMode && <FingerCursor active={onboarded} />}
      {!teacherMode && view.name !== 'lesson' && <TrackerModeControl className="tracker-mode--floating" />}

      <AnimatePresence>
        {!teacherMode && !onboarded && <CameraGate key="onboarding" onDone={() => {}} />}
      </AnimatePresence>
    </div>
  );
}
