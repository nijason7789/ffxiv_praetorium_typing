import type { ScoringState } from "./scoring";
import type { Difficulty } from "./types";

export interface TypingClock {
  elapsedMs: number;
  startedAt: number | null;
}
export function createTypingClock(): TypingClock {
  return { elapsedMs: 0, startedAt: null };
}
export function startTypingClock(clock: TypingClock, now: number): TypingClock {
  return clock.startedAt === null ? { ...clock, startedAt: now } : clock;
}
export function typingElapsedMs(clock: TypingClock, now: number): number {
  return (
    clock.elapsedMs +
    (clock.startedAt === null ? 0 : Math.max(0, now - clock.startedAt))
  );
}
export function pauseTypingClock(clock: TypingClock, now: number): TypingClock {
  return { elapsedMs: typingElapsedMs(clock, now), startedAt: null };
}
export interface SessionStats {
  cpm: number | null;
  accuracy: number | null;
  rank: "B" | "A" | "S+" | null;
  completed: number;
  total: number;
  completionRate: number;
}
export interface SessionResult extends SessionStats {
  score: number;
  maxCombo: number;
  difficulty: Difficulty;
  hasUsedAssistance: boolean;
}
export function calculateStats(
  scoring: ScoringState,
  clock: TypingClock,
  validQuestionIds: readonly string[],
  clozeOnly: boolean,
  now: number,
): SessionStats {
  const attempts = scoring.correctChars + scoring.errorCount;
  const accuracy =
    attempts === 0 ? null : Math.round((scoring.correctChars / attempts) * 100);
  const total = new Set(validQuestionIds).size;
  const completed = [...new Set(validQuestionIds)].filter(
    (id) => scoring.scoreProgress[id]?.completed,
  ).length;
  return {
    cpm: clozeOnly
      ? null
      : Math.round(
          scoring.totalTypedChars /
            Math.max(typingElapsedMs(clock, now) / 60_000, 0.05),
        ),
    accuracy,
    rank:
      accuracy === null
        ? null
        : accuracy < 80
          ? "B"
          : accuracy < 93
            ? "A"
            : "S+",
    total,
    completed,
    completionRate:
      total === 0
        ? 0
        : completed === total
          ? 100
          : Math.min(99, Math.round((completed / total) * 100)),
  };
}
