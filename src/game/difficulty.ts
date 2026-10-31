import type { Difficulty } from "./types";

export const difficultyLabels: Record<Difficulty, string> = {
  experience: "體驗",
  challenge: "挑戰",
  savage: "零式",
  ultimate: "絕",
};

export function isMemoryDifficulty(difficulty: Difficulty) {
  return difficulty === "savage" || difficulty === "ultimate";
}
