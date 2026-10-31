import template from "./components/memory-prototype.html?raw";
import { PRAETORIUM_SCRIPT } from "../data/praetorium";
import { SAVAGE_MASKS } from "../data/savage-masks";
import { ULTIMATE_MASKS } from "../data/ultimate-masks";
import { fixedMask } from "../game/fixed-mask";
import { createScoringState, scoreTyping } from "../game/scoring";
import {
  calculateStats,
  createTypingClock,
  startTypingClock,
  pauseTypingClock,
} from "../game/statistics";
import { state } from "../game/state";
import { normalizeForCompare } from "../game/text";
import type { Language } from "../game/types";
import { bindIme, resetImeGuards } from "./ime";
import { element } from "./dom";

export function mountMemoryPrototype() {
  const fragment = document.createElement("template");
  fragment.innerHTML = template;
  element("app").replaceWith(fragment.content);
  const language = element("memoryLanguage") as HTMLSelectElement;
  const difficulty = element("memoryDifficulty") as HTMLSelectElement;
  const question = element("memoryQuestion") as HTMLSelectElement;
  const input = element("memoryInput") as HTMLInputElement;
  const startButton = element("memoryStart") as HTMLButtonElement;
  const lines = PRAETORIUM_SCRIPT.filter((line) =>
    Object.hasOwn(SAVAGE_MASKS, line.id),
  );
  for (const line of lines) {
    const option = document.createElement("option");
    option.value = line.id;
    option.textContent = line.id;
    question.append(option);
  }
  let score = createScoringState();
  let clock = createTypingClock();
  let active = false;
  let composing = false;
  let target = "";
  let questionId = "";
  function setup() {
    resetImeGuards();
    active = false;
    score = createScoringState();
    clock = createTypingClock();
    input.value = "";
    input.disabled = true;
    language.disabled = false;
    question.disabled = false;
    startButton.disabled = false;
    state.lang = language.value as Language;
    const line = lines.find((line) => line.id === question.value)!;
    target = state.lang === "zh" ? line.text : line[state.lang];
    questionId = state.lang + ":" + line.id;
    element("memoryContext").textContent =
      line.speaker[state.lang] +
      "・" +
      line.actTitle[state.lang] +
      "・第 1 / 1 題";
    element("memoryTarget").textContent = fixedMask(
      target,
      (difficulty.value === "ultimate" ? ULTIMATE_MASKS : SAVAGE_MASKS)[
        line.id
      ][state.lang],
    );
    element("memoryResult").textContent = "";
    update();
  }
  function update() {
    element("memoryStats").textContent =
      `分數 ${score.score}・Combo ${score.combo}・最高 ${score.maxCombo}・錯誤 ${score.errorCount}`;
  }
  function begin() {
    setup();
    active = true;
    input.disabled = false;
    language.disabled = true;
    question.disabled = true;
    startButton.disabled = true;
    input.focus();
  }
  function progress() {
    if (!active || composing) return;
    if (input.value.length > 0) clock = startTypingClock(clock, Date.now());
    score = scoreTyping(score, {
      questionId,
      target: normalizeForCompare(target),
      input: normalizeForCompare(input.value),
    });
    update();
    if (!score.scoreProgress[questionId]?.completed) return;
    active = false;
    input.disabled = true;
    clock = pauseTypingClock(clock, Date.now());
    const stats = calculateStats(score, clock, [questionId], false, Date.now());
    element("memoryResult").textContent =
      `本句完成！精準度 ${stats.accuracy}%・CPM ${stats.cpm}・完成 1 / 1 題`;
  }
  bindIme(input, {
    isActive: () => active,
    onCompositionChange: (value) => {
      composing = value;
      element("memoryIme").classList.toggle("hidden", !value);
    },
    onCommit: progress,
    onInput: progress,
  });
  startButton.addEventListener("click", begin);
  element("memoryRestart").addEventListener("click", begin);
  language.addEventListener("change", () => {
    if (!active) setup();
  });
  question.addEventListener("change", () => {
    if (!active) setup();
  });
  difficulty.addEventListener("change", setup);
  setup();
}
