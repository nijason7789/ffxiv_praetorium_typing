import type { GameState } from "./types";
import { createScoringState } from "./scoring";
import { createTypingClock } from "./statistics";
export const state: GameState = {
  lang: "zh", // 'zh' | 'jp' | 'en'
  difficulty: "experience",
  mode: "typing", // 'typing' | 'cloze' | 'exam' | 'script'
  actFilter: "all", // 'all' | 'act1' | 'act2' | 'act3'
  useAltTerm: false, // false = 艾奧傑亞, true = 艾歐澤亞
  skipPunct: true,
  showSubtitles: true,
  queue: [],
  currentIndex: 0,
  isComposing: false,
  sessionMode: "typing",
  typingClock: createTypingClock(),
  result: null,
  sessionError: false,
  ...createScoringState(),
  clozeAnswered: false,
  activeClozeBlank: "",
};
