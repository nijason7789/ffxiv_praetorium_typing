export type Language = "zh" | "jp" | "en";
export type Mode = "typing" | "cloze" | "exam" | "script";
export type Difficulty = "experience" | "challenge" | "savage" | "ultimate";
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
export interface GameState extends ScoringState {
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
  sessionMode: Exclude<Mode, "script">;
  typingClock: TypingClock;
  result: Readonly<SessionResult> | null;
  sessionError: boolean;
  clozeAnswered: boolean;
  activeClozeBlank: string;
}
import type { ScoringState } from "./scoring";
import type { TypingClock, SessionResult } from "./statistics";
