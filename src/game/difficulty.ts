import type { Difficulty, Mode } from "./types";

interface DifficultyRules {
  readonly label: string;
  readonly target: "full" | "savage" | "ultimate";
  readonly typingAssistance: boolean;
  readonly paste: boolean;
  readonly textDrop: boolean;
  readonly cloze: boolean;
  readonly subtitles: boolean;
  readonly skipPunctuation: boolean;
  readonly modeSelection: boolean;
  readonly archive: boolean;
  readonly lineNavigation: boolean;
  readonly chapterSelection: boolean;
  readonly rpgChoices: boolean;
}

const standardRules: DifficultyRules = {
  label: "體驗",
  target: "full",
  typingAssistance: true,
  paste: true,
  textDrop: true,
  cloze: true,
  subtitles: true,
  skipPunctuation: true,
  modeSelection: true,
  archive: true,
  lineNavigation: true,
  chapterSelection: true,
  rpgChoices: true,
};
const memoryRules: DifficultyRules = {
  label: "零式",
  target: "savage",
  typingAssistance: false,
  paste: false,
  textDrop: false,
  cloze: false,
  subtitles: false,
  skipPunctuation: false,
  modeSelection: false,
  archive: false,
  lineNavigation: false,
  chapterSelection: false,
  rpgChoices: false,
};

const rules: Readonly<Record<Difficulty, DifficultyRules>> = {
  experience: standardRules,
  challenge: {
    ...standardRules,
    label: "普通",
    typingAssistance: false,
    paste: false,
    textDrop: false,
  },
  savage: memoryRules,
  ultimate: { ...memoryRules, label: "絕", target: "ultimate" },
};

export function getDifficultyRules(difficulty: Difficulty): DifficultyRules {
  return rules[difficulty];
}

export function canSelectMode(difficulty: Difficulty, mode: Mode) {
  const rule = getDifficultyRules(difficulty);
  return (
    rule.modeSelection &&
    (mode !== "script" || rule.archive) &&
    ((mode !== "cloze" && mode !== "exam") || rule.cloze)
  );
}

export function isMemoryDifficulty(difficulty: Difficulty) {
  return getDifficultyRules(difficulty).target !== "full";
}
