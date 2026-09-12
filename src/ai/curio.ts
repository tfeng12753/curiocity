/*
  Curio's AI voice, via the server/ proxy (which holds the IFM key).

  Every call here is best-effort and returns null rather than throwing: the
  product has to stay completely playable with the backend switched off, on a
  flaky school network, or when a free-tier service is still cold-starting.
  Callers therefore always have a written fallback ready, and AI only ever
  *upgrades* what the child sees - it never gates it.
*/
import { settings } from '../state/settings';

const ENDPOINT = (import.meta.env.VITE_API_ENDPOINT ?? '/api').replace(/\/$/, '');

/*
  A ceiling on AI calls per page visit. The keys are a fixed monthly budget
  shared by every child using the site, and a single bored one holding down
  "Ask" could spend the lot in an afternoon. Past the budget Curio falls back
  to her written lines, which is exactly what already happens when the
  backend is offline - so there is no new failure mode to handle, just a
  quieter Curio. Raise it in one place if the plan gets bigger.
*/
const CALL_BUDGET = 15;
let callsMade = 0;

type Intent = 'hint' | 'praise' | 'recap' | 'ask';

interface CurioRequest {
  objective?: string;
  instruction?: string;
  detail?: string;
  question?: string;
  mistakeCount?: number;
}

async function request(intent: Intent, body: CurioRequest, signal?: AbortSignal) {
  if (!settings.aiEnabled()) return null;
  if (callsMade >= CALL_BUDGET) return null;
  callsMade += 1;

  try {
    const response = await fetch(`${ENDPOINT}/curio`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent, ...body }),
      signal,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { text?: unknown };
    return typeof data.text === 'string' && data.text.trim() ? data.text.trim() : null;
  } catch {
    return null;
  }
}

export const curio = {
  /** A nudge when a child is stuck, that never gives the answer away. */
  hint: (objective: string, instruction: string, mistakeCount: number) =>
    request('hint', { objective, instruction, mistakeCount }),

  /** A celebration that names what they actually did. */
  praise: (objective: string, detail?: string) => request('praise', { objective, detail }),

  /** "Here's what you worked out" at the end of a lesson. */
  recap: (objective: string, detail?: string) => request('recap', { objective, detail }),

  /** Answers a question the child asked in their own words. */
  ask: (question: string, objective?: string, signal?: AbortSignal) =>
    request('ask', { question, objective }, signal),
};
