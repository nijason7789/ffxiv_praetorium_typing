import type { GameState } from "./types";
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
  totalTypedChars: 0,
  correctChars: 0,
  errorCount: 0,
  combo: 0,
  maxCombo: 0,
  score: 0,
  lastMatchedLen: 0,
  clozeAnswered: false,
  activeClozeBlank: "",
  lastBlankByLine: {}, // Tracks last selected blank per line ID to guarantee variety
  rpgAnsweredForLine: {},
};
