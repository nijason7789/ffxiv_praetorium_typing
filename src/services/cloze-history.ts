import type { Language } from "../game/types";
import { shuffle } from "../game/random";

interface Progress {
  pool: string[];
  remaining: string[];
  last: string | null;
}

const memory = new Map<string, Progress>();
const KEY_PREFIX = "ffxiv-praetorium:cloze:v1:";

function isProgress(value: unknown, pool: string[]): value is Progress {
  if (!value || typeof value !== "object") return false;
  const progress = value as Partial<Progress>;
  return (
    Array.isArray(progress.pool) &&
    progress.pool.length === pool.length &&
    progress.pool.every((word, index) => word === pool[index]) &&
    Array.isArray(progress.remaining) &&
    progress.remaining.every(
      (word) => typeof word === "string" && pool.includes(word),
    ) &&
    new Set(progress.remaining).size === progress.remaining.length &&
    (progress.last === null ||
      (typeof progress.last === "string" && pool.includes(progress.last)))
  );
}

/** Persist canonical words, so switching Chinese terminology doesn't reset the deck. */
export function nextClozeBlank(
  lineId: string,
  language: Language,
  words: readonly string[],
): string {
  const pool = [...new Set(words.filter((word) => word.length > 0))];
  if (pool.length === 0)
    throw new Error(`No cloze words for ${lineId}/${language}`);
  const key = `${KEY_PREFIX}${lineId}:${language}`;
  let saved: unknown = memory.get(key);
  try {
    // Read on each draw so another tab's progress is usually respected too.
    const stored = localStorage.getItem(key);
    if (stored !== null) saved = JSON.parse(stored);
  } catch {
    // Storage may be blocked or contain invalid JSON; memory still works.
  }
  const progress: Progress = isProgress(saved, pool)
    ? saved
    : { pool, remaining: [], last: null };

  if (progress.remaining.length === 0) {
    progress.remaining = shuffle(pool);
    // Avoid repeating the last word at the boundary between two rounds.
    if (pool.length > 1 && progress.remaining[0] === progress.last) {
      [progress.remaining[0], progress.remaining[1]] = [
        progress.remaining[1],
        progress.remaining[0],
      ];
    }
  }

  const chosen = progress.remaining.shift()!;
  progress.last = chosen;
  memory.set(key, progress);
  try {
    localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // A full or unavailable store must not prevent answering questions.
  }
  return chosen;
}
