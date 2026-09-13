import { useEffect, useState } from 'react';
import { CITIES, CITY_ORDER } from '../../data/cities';
import type { describeProgress } from '../../state/progress';
import { curio } from '../../ai/curio';
import { useSettings } from '../../hooks/useSettings';
import { sfx } from '../../audio/sound';

function buildStudentSummary(summary: ReturnType<typeof describeProgress>): string {
  const lines: string[] = [`${summary.totalComplete} of ${summary.totalLevels} destinations completed.`];
  for (const cityId of CITY_ORDER) {
    const { done, total } = summary.cityProgress(cityId);
    if (done > 0) lines.push(`${CITIES[cityId].name}: ${done}/${total} complete.`);
  }
  if (summary.badges.length > 0) lines.push(`Badges earned: ${summary.badges.length}.`);
  lines.push(`Coins earned: ${summary.coins}.`);
  return lines.join(' ');
}

const STORAGE_PREFIX = 'curio.parentUpdate.v1.';

function loadSaved(studentId: string): string | null {
  try {
    return localStorage.getItem(STORAGE_PREFIX + studentId);
  } catch {
    return null;
  }
}

function save(studentId: string, text: string) {
  try {
    localStorage.setItem(STORAGE_PREFIX + studentId, text);
  } catch {
    /* private browsing - the note just won't survive a reload */
  }
}

/**
 * A saved (not just live-and-gone) note a teacher can generate once and
 * copy into an email or message home - the same idea as ClassInsights,
 * aimed at a parent instead of a teacher, about one child instead of a
 * whole roster. Persisted to localStorage per student so reopening this
 * student later still shows the last note rather than an empty card.
 */
export function ParentUpdate({
  studentId,
  studentName,
  summary,
}: {
  studentId: string;
  studentName: string;
  summary: ReturnType<typeof describeProgress>;
}) {
  const { aiEnabled } = useSettings();
  const [note, setNote] = useState<string | null>(() => loadSaved(studentId));
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [copied, setCopied] = useState(false);

  // A different student was opened - the note in state belongs to whoever
  // was open before, not this one.
  useEffect(() => {
    setNote(loadSaved(studentId));
    setStatus('idle');
    setCopied(false);
  }, [studentId]);

  if (!aiEnabled) return null;

  const generate = async () => {
    setStatus('loading');
    sfx.play('tap');
    const reply = await curio.parentUpdate(studentName, buildStudentSummary(summary));
    if (reply) {
      setNote(reply);
      save(studentId, reply);
      setStatus('idle');
    } else {
      setStatus('error');
    }
  };

  const copy = async () => {
    if (!note) return;
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      sfx.play('tap');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard API unavailable - the note is still readable and selectable on screen */
    }
  };

  return (
    <section className="panel teacher__insights">
      <div className="drawer__city-head">
        <strong>📝 Parent update</strong>
        {status !== 'loading' && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={generate}>
            {note ? 'Regenerate' : 'Generate'}
          </button>
        )}
      </div>

      {status === 'loading' && <p className="teacher__insights-text">Writing a note...</p>}
      {status === 'error' && (
        <p className="teacher__insights-text teacher__insights-text--muted">
          Couldn't generate this right now - try again in a moment.
        </p>
      )}
      {status === 'idle' && !note && (
        <p className="teacher__insights-text teacher__insights-text--muted">
          A short, warm note about {studentName}'s progress, ready to copy into an email or message
          home.
        </p>
      )}
      {status === 'idle' && note && (
        <>
          <p className="teacher__insights-text">{note}</p>
          <button type="button" className="btn btn--ghost btn--sm teacher__insights-copy" onClick={copy}>
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </>
      )}
    </section>
  );
}
