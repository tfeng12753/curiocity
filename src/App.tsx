import { useCallback, useState, type ComponentType } from 'react';
import { AnimatePresence } from 'motion/react';
import { ProgressProvider } from './state/progress';
import { RoleProvider, useRole } from './state/role';
import { ClassroomProvider, useClassroom } from './state/classroom';
import { AuthProvider, useAuth } from './state/auth';
import type { CityId } from './data/cities';
import { WorldScene } from './components/world/WorldScene';
import { CityScene } from './components/city/CityScene';
import { LevelEntrance } from './components/level/LevelEntrance';
import { FractionLesson } from './components/lesson/FractionLesson';
import { FractionLesson2 } from './components/lesson/FractionLesson2';
import { FractionLesson3 } from './components/lesson/FractionLesson3';
import { FractionLesson4 } from './components/lesson/FractionLesson4';
import { PhysicsLesson1 } from './components/lesson/PhysicsLesson1';
import { TopNav, type NavPanel } from './components/layout/TopNav';
import { NavDrawer } from './components/layout/NavDrawer';
import { TeacherDashboard } from './components/teacher/TeacherDashboard';
import { ModeGate } from './components/mode/ModeGate';
import { StudentPicker } from './components/mode/StudentPicker';
import { FingerCursor } from './tracker/FingerCursor';
import { CameraGate } from './tracker/CameraGate';
import { TrackerModeControl } from './tracker/TrackerModeControl';
import { HandScrollAssist } from './tracker/HandScrollAssist';
import { VoiceNav } from './tracker/VoiceNav';
import { useTrackerState } from './tracker/useTracker';
import './components/mode/mode.css';

interface LessonProps {
  onExit: () => void;
  onKeepExploring: () => void;
}

/** Maps a level id to the lesson component that plays it. */
const LESSON_COMPONENTS: Record<string, ComponentType<LessonProps>> = {
  fractions: FractionLesson,
  'fractions-2': FractionLesson2,
  'fractions-3': FractionLesson3,
  'alien-1': FractionLesson4,
  motion: PhysicsLesson1,
};

type View =
  | { name: 'world' }
  | { name: 'city'; cityId: CityId }
  | { name: 'entrance'; cityId: CityId; levelId: string }
  | { name: 'lesson'; cityId: CityId; levelId: string };

export function App() {
  return (
    <AuthProvider>
      <ClassroomProvider>
        <RoleProvider>
          <AppShell />
        </RoleProvider>
      </ClassroomProvider>
    </AuthProvider>
  );
}

function AppShell() {
  const { role, setRole } = useRole();
  const { activeStudent } = useClassroom();
  const { user, token, ready, logout } = useAuth();
  const [playing, setPlaying] = useState(role === 'student' && Boolean(activeStudent));

  const leave = useCallback(() => {
    setPlaying(false);
    setRole('choose');
    void logout();
  }, [setRole, logout]);

  if (!ready) {
    return (
      <div className="app">
        <div className="mode-gate">
          <p className="mode-gate__warn">Signing you in…</p>
        </div>
      </div>
    );
  }

  if (user?.role === 'teacher') {
    return (
      <div className="app">
        <TeacherDashboard onLeave={leave} />
      </div>
    );
  }

  if (user?.role === 'student') {
    return (
      <ProgressProvider key={user.id} studentId={user.id} remoteToken={token}>
        <StudentWorld onLeave={leave} />
      </ProgressProvider>
    );
  }

  if (role === 'choose') {
    return (
      <div className="app">
        <ModeGate
          onLocalChoose={(next) => {
            setPlaying(false);
            setRole(next);
          }}
        />
      </div>
    );
  }

  if (role === 'teacher') {
    return (
      <div className="app">
        <TeacherDashboard onLeave={leave} />
      </div>
    );
  }

  if (!playing) {
    return (
      <div className="app">
        <StudentPicker onPicked={() => setPlaying(true)} onBack={leave} />
      </div>
    );
  }

  if (!activeStudent) {
    return (
      <div className="app">
        <StudentPicker onPicked={() => setPlaying(true)} onBack={leave} />
      </div>
    );
  }

  return (
    <ProgressProvider key={activeStudent.id} studentId={activeStudent.id}>
      <StudentWorld onLeave={leave} />
    </ProgressProvider>
  );
}

function StudentWorld({ onLeave }: { onLeave: () => void }) {
  const [view, setView] = useState<View>({ name: 'world' });
  const [panel, setPanel] = useState<NavPanel>(null);
  const { onboarded } = useTrackerState();

  const goWorld = useCallback(() => {
    setPanel(null);
    setView({ name: 'world' });
  }, []);

  const goCity = useCallback((cityId: CityId) => {
    setPanel(null);
    setView({ name: 'city', cityId });
  }, []);

  const cityId = 'cityId' in view ? view.cityId : undefined;

  return (
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
        <TopNav onHome={goWorld} openPanel={panel} onOpenPanel={setPanel} onLeave={onLeave} />
      )}

      <AnimatePresence>
        {panel && <NavDrawer key={panel} panel={panel} onClose={() => setPanel(null)} />}
      </AnimatePresence>

      <FingerCursor active={onboarded} />
      {onboarded && <HandScrollAssist />}
      {view.name !== 'lesson' && <TrackerModeControl className="tracker-mode--floating" />}
      <VoiceNav
        view={view}
        onGoWorld={goWorld}
        onGoCity={goCity}
        onOpenLevel={(targetCityId, levelId) => setView({ name: 'entrance', cityId: targetCityId, levelId })}
        onOpenPanel={setPanel}
      />

      <AnimatePresence>{!onboarded && <CameraGate key="onboarding" onDone={() => {}} />}</AnimatePresence>
    </div>
  );
}
