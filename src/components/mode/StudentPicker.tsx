import { useState } from 'react';
import { motion } from 'motion/react';
import { useClassroom } from '../../state/classroom';
import { sfx } from '../../audio/sound';
import './mode.css';

export function StudentPicker({ onPicked, onBack }: { onPicked: () => void; onBack: () => void }) {
  const { students, selectStudent, addStudent } = useClassroom();
  const [name, setName] = useState('');

  const pick = (id: string) => {
    selectStudent(id);
    sfx.play('tap');
    onPicked();
  };

  const create = () => {
    const student = addStudent(name);
    if (!student) return;
    sfx.play('success');
    setName('');
    onPicked();
  };

  return (
    <motion.div
      className="mode-gate"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="mode-gate__brand">
        <p className="eyebrow">Student</p>
        <h1>Who is playing?</h1>
        <p>Your progress is saved under your name on this computer.</p>
      </div>

      {students.length > 0 && (
        <ul className="mode-gate__list">
          {students.map((student) => (
            <li key={student.id}>
              <button type="button" className="mode-gate__row" onClick={() => pick(student.id)}>
                {student.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mode-gate__form"
        onSubmit={(event) => {
          event.preventDefault();
          create();
        }}
      >
        <label htmlFor="student-name">New student</label>
        <div className="mode-gate__join">
          <input
            id="student-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Type your name"
            maxLength={32}
            autoComplete="nickname"
          />
          <button type="submit" className="btn btn--sm" disabled={!name.trim()}>
            Start
          </button>
        </div>
      </form>

      <button type="button" className="mode-gate__back" onClick={onBack}>
        ← Choose student or teacher
      </button>
    </motion.div>
  );
}
