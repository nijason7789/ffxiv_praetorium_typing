import {
  changedRange,
  reconcileInputSources,
  type InputSource,
} from "./input-source";

/** Pure per-session scoring rules. No DOM, timers, storage or global game state. */
interface QuestionScore {
  previousInput: string;
  inputSources: InputSource[];
  rewardedPositions: number[];
  completed: boolean;
  rpgRewarded: boolean;
}

export interface ScoringState {
  score: number;
  combo: number;
  maxCombo: number;
  correctChars: number;
  totalTypedChars: number;
  errorCount: number;
  hasUsedAssistance: boolean;
  scoreProgress: Record<string, QuestionScore>;
}

export function createScoringState(): ScoringState {
  return {
    score: 0,
    combo: 0,
    maxCombo: 0,
    correctChars: 0,
    totalTypedChars: 0,
    errorCount: 0,
    hasUsedAssistance: false,
    scoreProgress: {},
  };
}

function questionScore(state: ScoringState, id: string): QuestionScore {
  return (
    state.scoreProgress[id] ?? {
      previousInput: "",
      inputSources: [],
      rewardedPositions: [],
      completed: false,
      rpgRewarded: false,
    }
  );
}

function withQuestion(
  state: ScoringState,
  id: string,
  question: QuestionScore,
): ScoringState {
  return {
    ...state,
    scoreProgress: { ...state.scoreProgress, [id]: question },
  };
}

function multiplier(combo: number): number {
  return 1 + Math.floor(combo / 10) * 0.2;
}

function addCombo(state: ScoringState, amount: number) {
  state.combo += amount;
  state.maxCombo = Math.max(state.maxCombo, state.combo);
}

export function resetTypingInput(
  state: ScoringState,
  questionId: string,
): ScoringState {
  return withQuestion(state, questionId, {
    ...questionScore(state, questionId),
    previousInput: "",
    inputSources: [],
  });
}

/** Input and target are normalized by the text adapter before scoring. */
export function scoreTyping(
  state: ScoringState,
  attempt: {
    questionId: string;
    target: string;
    input: string;
    source?: InputSource;
    inputSources?: InputSource[];
  },
): ScoringState {
  const { questionId, target, input } = attempt;
  const previous = questionScore(state, questionId);
  const next = { ...state };
  const source = attempt.source ?? "manual";
  const inputSources =
    attempt.inputSources ??
    reconcileInputSources(
      previous.previousInput,
      previous.inputSources,
      input,
      source,
    );
  next.hasUsedAssistance ||=
    source === "assist" || inputSources.includes("assist");
  const rewarded = new Set(previous.rewardedPositions);
  const changed = changedRange(previous.previousInput, input);
  let prefixLength = 0;
  while (
    prefixLength < target.length &&
    prefixLength < input.length &&
    target[prefixLength] === input[prefixLength]
  )
    prefixLength++;

  for (let index = 0; index < Math.min(input.length, target.length); index++) {
    if (
      index >= changed.start &&
      index < changed.end &&
      input[index] !== target[index]
    ) {
      if (inputSources[index] === "manual") next.errorCount++;
      next.combo = 0;
    } else if (
      !previous.completed &&
      index < prefixLength &&
      !rewarded.has(index)
    ) {
      if (inputSources[index] === "automatic") continue;
      rewarded.add(index);
      addCombo(next, 1);
      next.score += Math.round(25 * multiplier(next.combo));
      if (inputSources[index] === "manual") {
        next.correctChars++;
        next.totalTypedChars++;
      }
    }
  }

  const complete = target.length > 0 && prefixLength === target.length;
  if (complete && !previous.completed) next.score += 100;
  return withQuestion(next, questionId, {
    ...previous,
    previousInput: input,
    inputSources: [...inputSources],
    rewardedPositions: [...rewarded],
    completed: previous.completed || complete,
  });
}

export function scoreCloze(
  state: ScoringState,
  attempt: {
    questionId: string;
    correct: boolean;
    answerLength: number;
  },
): ScoringState {
  const { questionId, correct, answerLength } = attempt;
  const previous = questionScore(state, questionId);
  if (!correct) return { ...state, errorCount: state.errorCount + 1, combo: 0 };
  if (
    previous.completed ||
    !Number.isInteger(answerLength) ||
    answerLength <= 0
  )
    return state;
  const next = { ...state, correctChars: state.correctChars + answerLength };
  addCombo(next, 3);
  next.score += Math.round(200 * multiplier(next.combo));
  return withQuestion(next, questionId, { ...previous, completed: true });
}

export function scoreRpg(
  state: ScoringState,
  questionId: string,
): ScoringState {
  const previous = questionScore(state, questionId);
  if (previous.rpgRewarded) return state;
  const next = { ...state, score: state.score + 150 };
  addCombo(next, 2);
  return withQuestion(next, questionId, { ...previous, rpgRewarded: true });
}
