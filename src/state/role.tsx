import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Role = 'student' | 'teacher';

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

const STORAGE_KEY = 'learnverse.role.v1';
const RoleContext = createContext<RoleContextValue | null>(null);

function loadRole(): Role {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'teacher' ? 'teacher' : 'student';
  } catch {
    return 'student';
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(loadRole);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch {
      /* role is a convenience, not critical */
    }
  }, [role]);

  const setRole = useCallback((next: Role) => {
    setRoleState(next);
  }, []);

  return <RoleContext.Provider value={{ role, setRole }}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used inside <RoleProvider>');
  return ctx;
}
