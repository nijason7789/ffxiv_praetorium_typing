/** Pure per-session scoring rules. No DOM, timers, storage or global game state. */
interface QuestionScore {
  previousInput: string;
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
    scoreProgress: {},
  };
}

function questionScore(state: ScoringState, id: string): QuestionScore {
  return (
    state.scoreProgress[id] ?? {
      previousInput: "",
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

/** Find the inserted/replaced range; deletion and shifted old suffixes aren't new input. */
function changedRange(previous: string, input: string) {
  let start = 0;
  while (
    start < previous.length &&
    start < input.length &&
    previous[start] === input[start]
  )
    start++;
  let suffix = 0;
  while (
    suffix < previous.length - start &&
    suffix < input.length - start &&
    previous[previous.length - 1 - suffix] === input[input.length - 1 - suffix]
  )
    suffix++;
  return { start, end: input.length - suffix };
}

export function resetTypingInput(
  state: ScoringState,
  questionId: string,
): ScoringState {
  return withQuestion(state, questionId, {
    ...questionScore(state, questionId),
    previousInput: "",
  });
}

/** Input and target are normalized by the text adapter before scoring. */
export function scoreTyping(
  state: ScoringState,
  attempt: {
    questionId: string;
    target: string;
    input: string;
  },
): ScoringState {
  const { questionId, target, input } = attempt;
  const previous = questionScore(state, questionId);
  const next = { ...state };
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
      next.errorCount++;
      next.combo = 0;
    } else if (
      !previous.completed &&
      index < prefixLength &&
      !rewarded.has(index)
    ) {
      rewarded.add(index);
      addCombo(next, 1);
      next.score += Math.round(25 * multiplier(next.combo));
      next.correctChars++;
      next.totalTypedChars++;
    }
  }

  const complete = target.length > 0 && prefixLength === target.length;
  if (complete && !previous.completed) next.score += 100;
  return withQuestion(next, questionId, {
    ...previous,
    previousInput: input,
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
