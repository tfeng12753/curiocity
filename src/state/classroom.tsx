import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export interface Student {
  id: string;
  name: string;
}

interface ClassroomState {
  students: Student[];
  activeStudentId: string | null;
}

interface ClassroomContextValue extends ClassroomState {
  activeStudent: Student | null;
  addStudent: (name: string) => Student | null;
  selectStudent: (id: string | null) => void;
  removeStudent: (id: string) => void;
}

const STORAGE_KEY = 'learnverse.classroom.v1';
const LEGACY_PROGRESS_KEY = 'learnverse.progress.v1';
const ClassroomContext = createContext<ClassroomContextValue | null>(null);

function newId() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function cleanName(name: string) {
  return name.trim().slice(0, 32);
}

function loadClassroom(): ClassroomState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ClassroomState>;
      const students = Array.isArray(parsed.students)
        ? parsed.students.filter((entry): entry is Student =>
            Boolean(entry && typeof entry.id === 'string' && typeof entry.name === 'string'),
          )
        : [];
      const activeStudentId =
        typeof parsed.activeStudentId === 'string' && students.some((student) => student.id === parsed.activeStudentId)
          ? parsed.activeStudentId
          : (students[0]?.id ?? null);
      return { students, activeStudentId };
    }
  } catch {
    /* fall through to empty / legacy */
  }

  // A save from before named students existed becomes the first roster entry.
  try {
    if (localStorage.getItem(LEGACY_PROGRESS_KEY)) {
      return {
        students: [{ id: 'legacy', name: 'Student' }],
        activeStudentId: 'legacy',
      };
    }
  } catch {
    /* ignore */
  }

  return { students: [], activeStudentId: null };
}

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ClassroomState>(loadClassroom);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* roster is local-only */
    }
  }, [state]);

  const addStudent = useCallback((rawName: string) => {
    const name = cleanName(rawName);
    if (!name) return null;
    const student: Student = { id: newId(), name };
    setState((prev) => ({
      students: [...prev.students, student],
      activeStudentId: student.id,
    }));
    return student;
  }, []);

  const selectStudent = useCallback((id: string | null) => {
    setState((prev) => {
      if (id && !prev.students.some((student) => student.id === id)) return prev;
      return { ...prev, activeStudentId: id };
    });
  }, []);

  const removeStudent = useCallback((id: string) => {
    try {
      localStorage.removeItem(id === 'legacy' ? LEGACY_PROGRESS_KEY : `${LEGACY_PROGRESS_KEY}:${id}`);
    } catch {
      /* ignore */
    }
    setState((prev) => {
      const students = prev.students.filter((student) => student.id !== id);
      return {
        students,
        activeStudentId: prev.activeStudentId === id ? (students[0]?.id ?? null) : prev.activeStudentId,
      };
    });
  }, []);

  const value = useMemo<ClassroomContextValue>(() => {
    const activeStudent = state.students.find((student) => student.id === state.activeStudentId) ?? null;
    return { ...state, activeStudent, addStudent, selectStudent, removeStudent };
  }, [state, addStudent, selectStudent, removeStudent]);

  return <ClassroomContext.Provider value={value}>{children}</ClassroomContext.Provider>;
}

export function useClassroom() {
  const ctx = useContext(ClassroomContext);
  if (!ctx) throw new Error('useClassroom must be used inside <ClassroomProvider>');
  return ctx;
}
