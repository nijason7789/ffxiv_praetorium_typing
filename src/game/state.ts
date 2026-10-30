import type { GameState } from "./types";
import { createScoringState } from "./scoring";
export const state: GameState = {
  lang: "zh", // 'zh' | 'jp' | 'en'
  difficulty: "experience",
  mode: "typing", // 'typing' | 'cloze' | 'exam' | 'script'
  actFilter: "all", // 'all' | 'act1' | 'act2' | 'act3' | 'act4'
  useAltTerm: false, // false = 艾歐澤亞, true = 艾奧傑亞
  skipPunct: true,
  showSubtitles: true,
  queue: [],
  currentIndex: 0,
  isComposing: false,
  startTime: null,
  ...createScoringState(),
  clozeAnswered: false,
  activeClozeBlank: "",
};
