import { useState } from 'react';
import { CITIES, CITY_ORDER } from '../../data/cities';
import type { describeProgress } from '../../state/progress';
import { curio } from '../../ai/curio';
import { useSettings } from '../../hooks/useSettings';
import { sfx } from '../../audio/sound';

interface Row {
  name: string;
  summary: ReturnType<typeof describeProgress>;
}

const NAME_LIST_CAP = 6;

function namesWithOverflow(names: string[]): string {
  if (names.length <= NAME_LIST_CAP) return names.join(', ');
  const shown = names.slice(0, NAME_LIST_CAP);
  return `${shown.join(', ')}, and ${names.length - NAME_LIST_CAP} more`;
}

/**
 * A compact, plain-text roll-up of the whole class - not a data dump. Kept
 * short on purpose (names only for the students actually worth flagging,
 * capped lists) so it stays well inside the server's context limit however
 * large the class is, and so the model gets signal instead of noise.
 */
function buildClassSummary(rows: Row[]): string {
  const lines: string[] = [`Class of ${rows.length} student${rows.length === 1 ? '' : 's'}.`];

  for (const cityId of CITY_ORDER) {
    const city = CITIES[cityId];
    const playable = city.levels.filter((level) => level.status !== 'soon');
    if (playable.length === 0) continue;
    const perLevel = playable.map((level) => {
      const done = rows.filter((row) => row.summary.isLevelComplete(cityId, level.id)).length;
      return `${level.name} ${done}/${rows.length}`;
    });
    lines.push(`${city.name}: ${perLevel.join(', ')}.`);
  }

  const notStarted = rows.filter((row) => row.summary.totalComplete === 0).map((row) => row.name);
  if (notStarted.length > 0) {
    lines.push(`Have not completed anything yet: ${namesWithOverflow(notStarted)}.`);
  }

  const started = rows.filter((row) => row.summary.totalComplete > 0);
  if (started.length > 0) {
    const best = Math.max(...started.map((row) => row.summary.totalComplete));
    const ahead = started.filter((row) => row.summary.totalComplete === best).map((row) => row.name);
    lines.push(`Furthest along, ${best} destination${best === 1 ? '' : 's'} complete: ${namesWithOverflow(ahead)}.`);
  }

  const avgCoins = Math.round(rows.reduce((sum, row) => sum + row.summary.coins, 0) / rows.length);
  lines.push(`Average coins earned: ${avgCoins}.`);

  return lines.join(' ');
}

/**
 * A one-tap AI read of the whole roster, sitting above the individual
 * student cards - "who needs a hand, who's ready for more" is exactly the
 * kind of pattern that's tedious to spot by eye across a dozen-plus rows
 * but cheap for a model to summarise from the same data already on screen.
 */
export function ClassInsights({ rows }: { rows: Row[] }) {
  const { aiEnabled } = useSettings();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [insight, setInsight] = useState<string | null>(null);

  if (!aiEnabled || rows.length === 0) return null;

  const run = async () => {
    setStatus('loading');
    sfx.play('tap');
    const reply = await curio.classInsight(buildClassSummary(rows));
    if (reply) {
      setInsight(reply);
      setStatus('done');
    } else {
      setStatus('error');
    }
  };

  return (
    <section className="panel teacher__insights">
      <div className="drawer__city-head">
        <strong>✨ Class insights</strong>
        {status !== 'loading' && (
          <button type="button" className="btn btn--ghost btn--sm" onClick={run}>
            {insight ? 'Refresh' : 'Get insights'}
          </button>
        )}
      </div>

      {status === 'idle' && (
        <p className="teacher__insights-text teacher__insights-text--muted">
          An AI-generated read of who might need a hand and who's ready for more, from the same
          progress shown below.
        </p>
      )}
      {status === 'loading' && <p className="teacher__insights-text">Looking over the class...</p>}
      {status === 'error' && (
        <p className="teacher__insights-text teacher__insights-text--muted">
          Couldn't generate insights right now - try again in a moment.
        </p>
      )}
      {status === 'done' && insight && <p className="teacher__insights-text">{insight}</p>}
    </section>
  );
}
