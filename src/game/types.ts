export type Language = "zh" | "jp" | "en";
export type Mode = "typing" | "cloze" | "exam" | "script";
export type Difficulty = "experience" | "challenge";
export type Act = "act1" | "act2" | "act3" | "act4";
export type Localized<T> = Record<Language, T>;
export interface ScriptLine {
  id: string;
  act: Act;
  actTitle: Localized<string>;
  speaker: Localized<string>;
  text: string;
  jp: string;
  en: string;
  clozePool: Localized<string[]>;
  rpgQuestion?: Localized<{ prompt: string; choices: string[] }>;
}
export interface GameState {
  lang: Language;
  difficulty: Difficulty;
  mode: Mode;
  actFilter: Act | "all";
  useAltTerm: boolean;
  skipPunct: boolean;
  showSubtitles: boolean;
  queue: ScriptLine[];
  currentIndex: number;
  isComposing: boolean;
  startTime: number | null;
  totalTypedChars: number;
  correctChars: number;
  errorCount: number;
  combo: number;
  maxCombo: number;
  score: number;
  lastMatchedLen: number;
  clozeAnswered: boolean;
  activeClozeBlank: string;
  rpgAnsweredForLine: Record<string, boolean>;
}
