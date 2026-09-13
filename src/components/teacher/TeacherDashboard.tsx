import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CITIES, CITY_ORDER } from '../../data/cities';
import {
  BADGES,
  clearProgress,
  describeProgress,
  loadProgress,
  normalizeProgress,
} from '../../state/progress';
import { useClassroom, type Student } from '../../state/classroom';
import { useAuth } from '../../state/auth';
import { fetchClass, resetClassStudent, type ClassStudent } from '../../api';
import { sfx } from '../../audio/sound';
import { Logo } from '../layout/Logo';
import { ClassInsights } from './ClassInsights';
import './teacher.css';

function levelStatus(
  complete: boolean,
  unlocked: boolean,
  comingSoon: boolean,
): { label: string; className: string } {
  if (complete) return { label: 'Complete', className: '' };
  if (comingSoon) return { label: 'Coming soon', className: 'pill--ghost' };
  if (!unlocked) return { label: 'Locked', className: 'pill--ghost' };
  return { label: 'Not started', className: 'pill--ghost' };
}

function StudentDetail({
  student,
  onBack,
  onChanged,
  snapshotSource,
  onReset,
}: {
  student: Student;
  onBack: () => void;
  onChanged?: () => void;
  snapshotSource?: ReturnType<typeof normalizeProgress>;
  onReset?: () => Promise<void> | void;
}) {
  const snapshot = describeProgress(snapshotSource ?? loadProgress(student.id));
  const [confirmReset, setConfirmReset] = useState(false);
  const earned = Object.values(BADGES).filter((badge) => snapshot.badges.includes(badge.id)).length;

  const handleReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      sfx.play('hover');
      return;
    }
    if (onReset) await onReset();
    else clearProgress(student.id);
    setConfirmReset(false);
    onChanged?.();
    sfx.play('tap');
  };

  return (
    <>
      <button type="button" className="teacher__back" onClick={onBack}>
        ← All students
      </button>

      <header className="teacher__hero">
        <p className="eyebrow">Student</p>
        <h1>{student.name}</h1>
        <p>Progress saved on this computer for this student only.</p>
        <div className="teacher__stats">
          <div className="teacher__stat">
            <span>Destinations</span>
            <strong>
              {snapshot.totalComplete} / {snapshot.totalLevels}
            </strong>
          </div>
          <div className="teacher__stat">
            <span>Coins</span>
            <strong>🪙 {snapshot.coins}</strong>
          </div>
          <div className="teacher__stat">
            <span>Badges</span>
            <strong>
              {earned} / {Object.keys(BADGES).length}
            </strong>
          </div>
        </div>
      </header>

      {CITY_ORDER.map((cityId) => {
        const city = CITIES[cityId];
        const { done, total } = snapshot.cityProgress(cityId);
        return (
          <section className="panel teacher__city" key={cityId} data-city={cityId}>
            <div className="drawer__city-head">
              <strong>{city.name}</strong>
              <span className="pill">
                {done} / {total}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar__fill" style={{ width: `${(done / total) * 100}%` }} />
            </div>
            <ul className="teacher__levels">
              {city.levels.map((level) => {
                const complete = snapshot.isLevelComplete(cityId, level.id);
                const unlocked = snapshot.isLevelUnlocked(cityId, level.id);
                const status = levelStatus(complete, unlocked, level.status === 'soon');
                const prereq = city.levels.find((item) => item.id === level.requiresLevelId);
                return (
                  <li key={level.id} className={complete ? 'is-done' : ''}>
                    <span className="drawer__tick">{complete ? '✓' : level.index}</span>
                    <span className="teacher__level-copy">
                      {level.name}
                      {prereq && !complete && !unlocked && <small>Needs {prereq.name} first</small>}
                    </span>
                    <span className={`pill teacher__status ${status.className}`}>{status.label}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section className="panel teacher__badges">
        <div className="drawer__city-head">
          <strong>Badges</strong>
          <span className="pill">{earned} earned</span>
        </div>
        <div className="badge-grid">
          {Object.values(BADGES).map((badge) => {
            const got = snapshot.badges.includes(badge.id);
            return (
              <div className={`badge-card ${got ? 'is-earned' : ''}`} key={badge.id}>
                <div className="badge-card__icon">{badge.icon}</div>
                <strong>{badge.name}</strong>
                <span>{got ? badge.description : 'Not earned yet'}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="panel teacher__actions">
        <p>Reset only clears {student.name}&apos;s save. Other students are unchanged.</p>
        <button
          type="button"
          className={`btn btn--sm teacher__reset ${confirmReset ? 'is-confirming' : ''}`}
          onClick={handleReset}
          onBlur={() => setConfirmReset(false)}
        >
          {confirmReset ? 'Tap again to reset' : `Reset ${student.name}`}
        </button>
      </section>
    </>
  );
}

export function TeacherDashboard({ onLeave }: { onLeave: () => void }) {
  const { user } = useAuth();
  if (user?.role === 'teacher') return <AccountTeacherDashboard onLeave={onLeave} />;
  return <LocalTeacherDashboard onLeave={onLeave} />;
}

function AccountTeacherDashboard({ onLeave }: { onLeave: () => void }) {
  const { user, token } = useAuth();
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [code, setCode] = useState(user?.classCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!token) return;
    fetchClass(token)
      .then((data) => {
        setCode(data.class.code);
        setStudents(data.students);
        setError(null);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : 'Could not load the class.');
      });
  }, [token, tick]);

  const open = students.find((student) => student.id === openId) ?? null;

  return (
    <motion.div
      className="teacher"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="teacher__nav">
        <Logo orientation="horizontal" size={26} />
        <span className="pill">Teacher · {user?.name}</span>
        <button type="button" className="teacher__leave" onClick={onLeave}>
          Sign out
        </button>
      </header>

      <div className="teacher__inner">
        {open ? (
          <StudentDetail
            key={`${open.id}-${tick}`}
            student={{ id: open.id, name: open.name }}
            snapshotSource={normalizeProgress(open.progress)}
            onBack={() => setOpenId(null)}
            onReset={async () => {
              if (!token) return;
              await resetClassStudent(token, open.id);
              setTick((value) => value + 1);
            }}
          />
        ) : (
          <>
            <header className="teacher__hero">
              <p className="eyebrow">Your class</p>
              <h1>Student accounts</h1>
              <p>
                Share this class code. Students create an account with it, and their progress is
                stored on the account server — not just in this browser.
              </p>
              <div className="teacher__code">{code || '••••••'}</div>
            </header>
            {error && <p className="mode-gate__error">{error}</p>}
            <ClassInsights
              rows={students.map((student) => ({
                name: student.name,
                summary: describeProgress(normalizeProgress(student.progress)),
              }))}
            />
            {students.length === 0 ? (
              <section className="panel teacher__empty">
                <p>No students have joined yet. Give them the class code above.</p>
              </section>
            ) : (
              <ul className="teacher__roster">
                {students.map((student) => {
                  const summary = describeProgress(normalizeProgress(student.progress));
                  return (
                    <li key={student.id}>
                      <button
                        type="button"
                        className="teacher__roster-card"
                        onClick={() => {
                          sfx.play('tap');
                          setOpenId(student.id);
                        }}
                      >
                        <strong>{student.name}</strong>
                        <span>
                          {summary.totalComplete} / {summary.totalLevels} destinations · 🪙{' '}
                          {summary.coins}
                        </span>
                        <div className="progress-bar">
                          <div
                            className="progress-bar__fill"
                            style={{
                              width: `${(summary.totalComplete / Math.max(1, summary.totalLevels)) * 100}%`,
                            }}
                          />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

function LocalTeacherDashboard({ onLeave }: { onLeave: () => void }) {
  const { students, addStudent, removeStudent } = useClassroom();
  const [name, setName] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      students.map((student) => ({
        student,
        summary: describeProgress(loadProgress(student.id)),
      })),
    [students, tick],
  );

  const open = rows.find((row) => row.student.id === openId)?.student ?? null;

  const create = () => {
    const student = addStudent(name);
    if (!student) return;
    setName('');
    sfx.play('success');
  };

  return (
    <motion.div
      className="teacher"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="teacher__nav">
        <Logo orientation="horizontal" size={26} />
        <span className="pill">Teacher</span>
        <button type="button" className="teacher__leave" onClick={onLeave}>
          Leave
        </button>
      </header>

      <div className="teacher__inner">
        {open ? (
          <StudentDetail
            key={`${open.id}-${tick}`}
            student={open}
            onBack={() => setOpenId(null)}
            onChanged={() => setTick((value) => value + 1)}
          />
        ) : (
          <>
            <header className="teacher__hero">
              <p className="eyebrow">Teacher view</p>
              <h1>Your students</h1>
              <p>
                This class list lives on this computer. Students play in Student mode under their
                name; you review their progress here. It does not sync to other devices.
              </p>
            </header>

            <ClassInsights rows={rows.map(({ student, summary }) => ({ name: student.name, summary }))} />
            {rows.length === 0 ? (
              <section className="panel teacher__empty">
                <p>No students yet. Add a name, then have that student choose Student mode to play.</p>
              </section>
            ) : (
              <ul className="teacher__roster">
                {rows.map(({ student, summary }) => (
                  <li key={student.id}>
                    <button
                      type="button"
                      className="teacher__roster-card"
                      onClick={() => {
                        sfx.play('tap');
                        setOpenId(student.id);
                      }}
                    >
                      <strong>{student.name}</strong>
                      <span>
                        {summary.totalComplete} / {summary.totalLevels} destinations · 🪙 {summary.coins}
                      </span>
                      <div className="progress-bar">
                        <div
                          className="progress-bar__fill"
                          style={{
                            width: `${(summary.totalComplete / Math.max(1, summary.totalLevels)) * 100}%`,
                          }}
                        />
                      </div>
                    </button>
                    <button
                      type="button"
                      className="teacher__remove"
                      onClick={() => {
                        if (confirmRemove !== student.id) {
                          setConfirmRemove(student.id);
                          sfx.play('hover');
                          return;
                        }
                        removeStudent(student.id);
                        setConfirmRemove(null);
                        sfx.play('tap');
                      }}
                      onBlur={() => setConfirmRemove(null)}
                    >
                      {confirmRemove === student.id ? 'Remove?' : '✕'}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form
              className="panel teacher__add"
              onSubmit={(event) => {
                event.preventDefault();
                create();
              }}
            >
              <label htmlFor="class-student-name">Add a student</label>
              <div className="teacher__add-row">
                <input
                  id="class-student-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Student name"
                  maxLength={32}
                />
                <button type="submit" className="btn btn--sm" disabled={!name.trim()}>
                  Add
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </motion.div>
  );
}
