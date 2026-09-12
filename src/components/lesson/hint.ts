/*
  Curio's AI-generated hints - a short, encouraging nudge from IFM when a
  student is stuck, without giving the answer away. Optional: if the
  backend has no IFM_API_KEY, or the request fails for any reason, this
  quietly returns null and the lesson falls back to its static retry line.
*/
const ENDPOINT = (import.meta.env.VITE_API_ENDPOINT ?? '/api').replace(/\/$/, '');

export async function fetchHint(
  objective: string,
  instruction: string,
  mistakeCount: number,
): Promise<string | null> {
  try {
    const response = await fetch(`${ENDPOINT}/hint`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ objective, instruction, mistakeCount }),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { hint?: unknown };
    return typeof data.hint === 'string' ? data.hint : null;
  } catch {
    return null;
  }
}
