import { PRAETORIUM_SCRIPT, DISTRACTOR_POOL } from "../data/praetorium";
import { SAVAGE_MASKS } from "../data/savage-masks";
import { ULTIMATE_MASKS } from "../data/ultimate-masks";
import { fixedMask } from "./fixed-mask";
import {
  canSelectMode,
  getDifficultyRules,
  isMemoryDifficulty,
} from "./difficulty";
import { soundFX } from "../services/audio";
import { nextClozeBlank } from "../services/cloze-history";
import { shuffle } from "./random";
import { state } from "./state";
import {
  createScoringState,
  resetTypingInput,
  scoreTyping,
  scoreCloze,
  scoreRpg,
} from "./scoring";
import {
  PUNCT_SET,
  localizeZhTerm,
  normalizeForCompare,
  getLinePrimaryText,
  getLineSpeaker,
  getLineActTitle,
  computeEffectiveInput,
  computeEffectiveInputWithSources,
} from "./text";
import { reconcileInputSources, type InputSource } from "./input-source";
import {
  calculateStats,
  createTypingClock,
  startTypingClock,
  pauseTypingClock,
} from "./statistics";
import { element } from "../ui/dom";
import { resetImeGuards } from "../ui/ime";
import { resetInputRestrictions } from "../ui/input-restrictions";
import { hasPageError, onPageError } from "../ui/page-error";
import type { ScriptLine, Language, Mode, Act } from "./types";
let advanceTimer: ReturnType<typeof setTimeout> | undefined;
let activeTimingQuestion = "";
let resumeAfterArchive = false;
let archiveNeedsRender = false;

onPageError(() => {
  resetInputRestrictions();
  cancelPendingAdvance();
  pauseClock();
  resetImeGuards();
  state.isComposing = false;
  state.sessionError = true;
  state.result = null;
});

function resetCompositionState() {
  resetInputRestrictions();
  resetImeGuards();
  state.isComposing = false;
  element("imeStatusBadge").classList.add("hidden");
}

function pauseClock() {
  state.typingClock = pauseTypingClock(state.typingClock, Date.now());
}

function isSessionLocked() {
  return state.result !== null || state.sessionError;
}

function canAnswer() {
  return !isSessionLocked() && state.mode !== "script";
}

function questionKey(item: ScriptLine) {
  return `${state.lang}:${item.id}`;
}

function cancelPendingAdvance() {
  clearTimeout(advanceTimer);
  advanceTimer = undefined;
}

function focusGameInput(input: HTMLElement) {
  setTimeout(() => {
    if (
      !hasPageError() &&
      element("langSelectModal").classList.contains("hidden") &&
      element("difficultySelectModal").classList.contains("hidden")
    )
      input.focus();
  }, 30);
}
function getFilteredQueue() {
  if (isMemoryDifficulty(state.difficulty))
    return PRAETORIUM_SCRIPT.filter((item) =>
      Object.hasOwn(SAVAGE_MASKS, item.id),
    );
  if (state.actFilter === "all") {
    return [...PRAETORIUM_SCRIPT];
  }
  return PRAETORIUM_SCRIPT.filter((item) => item.act === state.actFilter);
}

function isCurrentStepCloze() {
  if (state.mode === "cloze") return true;
  if (state.mode === "typing") return false;
  return state.currentIndex % 2 === 1;
}

function validClozeWords(item: ScriptLine) {
  const pool = item.clozePool?.[state.lang] ?? item.clozePool?.zh ?? [];
  const sentence = getLinePrimaryText(item);
  return [...new Set(pool)].filter(
    (word) =>
      word.length > 0 &&
      sentence.includes(state.lang === "zh" ? localizeZhTerm(word) : word),
  );
}

function validQuestionIds() {
  return state.queue.flatMap((item, index) => {
    const cloze =
      state.sessionMode === "cloze" ||
      (state.sessionMode === "exam" && index % 2 === 1);
    return getLinePrimaryText(item).length > 0 &&
      (!cloze || validClozeWords(item).length > 0)
      ? [questionKey(item)]
      : [];
  });
}

function currentStats() {
  return (
    state.result ??
    calculateStats(
      state,
      state.typingClock,
      validQuestionIds(),
      state.sessionMode === "cloze",
      Date.now(),
    )
  );
}

function showNoQuestions() {
  pauseClock();
  state.sessionError = true;
  element("sessionNotice").textContent = "沒有可用題目，請重新整理頁面後再試。";
  element("sessionNotice").classList.remove("hidden");
  element("sessionNoticeBox").classList.remove("hidden");
  element("sessionReload").classList.remove("hidden");
  element("stageCompleteModal").classList.add("hidden");
  element("typingInput").disabled = true;
  element("clozeInput").disabled = true;
  updateStatsUI();
}

export function selectMode(mode: Mode) {
  if (hasPageError()) return;
  if (!canSelectMode(state.difficulty, mode)) return;
  if (mode === "script") {
    if (state.mode === "script") return;
    resetCompositionState();
    resumeAfterArchive = state.typingClock.startedAt !== null && canAnswer();
    pauseClock();
    archiveNeedsRender = advanceTimer !== undefined;
    if (archiveNeedsRender) {
      cancelPendingAdvance();
      state.currentIndex++;
    }
    state.mode = mode;
    updateNavigationTabs();
    return;
  }
  const returning = state.mode === "script" && mode === state.sessionMode;
  state.mode = mode;
  updateNavigationTabs();
  if (returning) {
    if (archiveNeedsRender) renderCurrentStep();
    else {
      if (resumeAfterArchive && canAnswer())
        state.typingClock = startTypingClock(state.typingClock, Date.now());
      updateStatsUI();
      if (canAnswer())
        focusGameInput(
          isCurrentStepCloze() ? element("clozeInput") : element("typingInput"),
        );
    }
    resumeAfterArchive = false;
    archiveNeedsRender = false;
  } else startNewSession();
}

// Pick a random blank word from the item's clozePool for the current language
function pickRandomClozeQuestion(item: ScriptLine) {
  const validPool = validClozeWords(item);
  const canonicalBlank = nextClozeBlank(item.id, state.lang, validPool);
  const chosenBlank =
    state.lang === "zh" ? localizeZhTerm(canonicalBlank) : canonicalBlank;
  state.activeClozeBlank = chosenBlank;

  // Build 3 randomized distractors from same-language distractor pool + other pool words
  const langDistractors = (DISTRACTOR_POOL[state.lang] || DISTRACTOR_POOL.zh)
    .map((w) => (state.lang === "zh" ? localizeZhTerm(w) : w))
    .filter((w) => normalizeForCompare(w) !== normalizeForCompare(chosenBlank));

  // Shuffle distractors and pick 3
  const shuffledDist = shuffle([...new Set(langDistractors)]).slice(0, 3);
  const options = shuffle([chosenBlank, ...shuffledDist]);

  return { chosenBlank, options, poolCount: validPool.length };
}

// Auto-advance past punctuation in target string if skipPunct is enabled
function updateLangUI() {
  const labels = { zh: "繁體中文", jp: "日本語", en: "English" };
  element("currentLangBadge").textContent = labels[state.lang] || "繁體中文";
  const termBtn = element("btnToggleTerm");
  if (state.lang === "zh") {
    termBtn.classList.remove("hidden");
  } else {
    termBtn.classList.add("hidden");
  }
}

export function startNewSession(questions?: ScriptLine[]) {
  if (hasPageError()) return;
  cancelPendingAdvance();
  if (state.mode === "script") state.mode = state.sessionMode;
  if (isMemoryDifficulty(state.difficulty)) state.mode = "typing";
  state.sessionMode = state.mode;
  state.queue = isMemoryDifficulty(state.difficulty)
    ? getFilteredQueue()
    : (questions ?? getFilteredQueue());
  state.currentIndex = 0;
  state.typingClock = createTypingClock();
  state.result = null;
  state.sessionError = false;
  activeTimingQuestion = "";
  resumeAfterArchive = false;
  archiveNeedsRender = false;
  Object.assign(state, createScoringState());
  state.clozeAnswered = false;
  resetCompositionState();
  element("typingInput").disabled = false;
  element("clozeInput").disabled = false;
  element("sessionNotice").classList.add("hidden");
  element("sessionNoticeBox").classList.add("hidden");
  element("sessionReload").classList.add("hidden");

  element("stageCompleteModal").classList.add("hidden");
  updateNavigationTabs();
  updateLangUI();
  updateStatsUI();
  renderCurrentStep();
}

export function updateNavigationTabs() {
  const rules = getDifficultyRules(state.difficulty);
  for (const id of ["btnPrevLine", "btnNextLine"]) {
    element(id).classList.toggle("hidden", !rules.lineNavigation);
  }
  element("chapterSelectorBar").classList.toggle(
    "hidden",
    !rules.chapterSelection,
  );
  for (const id of ["chkSkipPunct", "chkShowJp"] as const) {
    const checkbox = element(id) as HTMLInputElement;
    const allowed =
      id === "chkSkipPunct" ? rules.skipPunctuation : rules.subtitles;
    checkbox.disabled = !allowed;
    checkbox.checked =
      allowed &&
      (id === "chkSkipPunct" ? state.skipPunct : state.showSubtitles);
    checkbox.closest("label")!.classList.toggle("hidden", !allowed);
  }
  const modes = [
    { id: "navModeTyping", key: "typing" },
    { id: "navModeCloze", key: "cloze" },
    { id: "navModeExam", key: "exam" },
    { id: "navModeScript", key: "script" },
  ] as const;
  modes.forEach((m) => {
    const btn = element(m.id);
    if (state.mode === m.key) {
      btn.className =
        "px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all bg-amber-500/25 text-amber-200 border border-amber-400/70 shadow";
    } else {
      btn.className =
        "px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-amber-500/40";
    }
    btn.classList.toggle("hidden", !canSelectMode(state.difficulty, m.key));
  });

  const viewGame = element("viewGameStage");
  const viewArchive = element("viewScriptArchive");
  if (state.mode === "script") {
    viewGame.classList.add("hidden");
    viewArchive.classList.remove("hidden");
    renderScriptArchive();
  } else {
    viewArchive.classList.add("hidden");
    viewGame.classList.remove("hidden");
  }
}

export function updateActButtons() {
  document.querySelectorAll<HTMLButtonElement>(".act-btn").forEach((btn) => {
    const act = btn.getAttribute("data-act");
    if (act === state.actFilter) {
      btn.className =
        "act-btn px-2.5 py-1 rounded text-xs font-semibold bg-amber-500/25 text-amber-200 border border-amber-400/60";
    } else {
      btn.className =
        "act-btn px-2.5 py-1 rounded text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-amber-500/40";
    }
  });
}

function updateStatsUI() {
  const stats = currentStats();
  const multiplier = (1 + Math.floor(state.combo / 10) * 0.2).toFixed(1);

  element("statCpm").textContent =
    stats.cpm === null ? "不適用" : String(stats.cpm);
  element("statCpmUnit").classList.toggle("hidden", stats.cpm === null);
  element("statAcc").textContent =
    stats.accuracy === null ? "無資料" : String(stats.accuracy);
  element("statAccUnit").classList.toggle("hidden", stats.accuracy === null);
  element("statCombo").textContent = String(state.combo);
  element("statEchoTier").textContent = `超越之力 x${multiplier}`;
  element("statScore").textContent = state.score.toLocaleString();

  const totalSteps = Math.max(state.queue.length, 1);
  const pct = stats.completionRate;
  element("stageStepCounter").textContent =
    `(${Math.min(state.currentIndex + 1, totalSteps)} / ${totalSteps})`;
  element("ultimaChargeText").textContent =
    `究極神兵共鳴率：${pct}%（${stats.completed} / ${stats.total} 題）`;
  element("stageProgressBar").style.width = `${pct}%`;
}

function renderSubtitlesForLanguage(item: ScriptLine) {
  const subBox = element("subtitlesBox");
  if (!state.showSubtitles || !getDifficultyRules(state.difficulty).subtitles) {
    subBox.classList.add("hidden");
    element("jpSubtitleText").textContent = "";
    element("enSubtitleText").textContent = "";
    return;
  }
  subBox.classList.remove("hidden");

  const tag1 = element("subTag1");
  const text1 = element("jpSubtitleText");
  const tag2 = element("subTag2");
  const text2 = element("enSubtitleText");

  if (state.lang === "zh") {
    tag1.textContent = "JP";
    text1.textContent = item.jp;
    tag2.textContent = "EN";
    text2.textContent = item.en;
  } else if (state.lang === "jp") {
    tag1.textContent = "ZH";
    text1.textContent = localizeZhTerm(item.text);
    tag2.textContent = "EN";
    text2.textContent = item.en;
  } else {
    tag1.textContent = "ZH";
    text1.textContent = localizeZhTerm(item.text);
    tag2.textContent = "JP";
    text2.textContent = item.jp;
  }
}

export function renderCurrentStep() {
  cancelPendingAdvance();
  if (isSessionLocked() || state.mode === "script") return;
  resetCompositionState();
  if (!validQuestionIds().length) {
    showNoQuestions();
    return;
  }
  const valid = new Set(validQuestionIds());
  let skipped = false;
  while (
    state.currentIndex < state.queue.length &&
    !valid.has(questionKey(state.queue[state.currentIndex]))
  ) {
    state.currentIndex++;
    skipped = true;
  }
  if (skipped) {
    element("sessionNotice").textContent =
      "已略過無法作答的題目，不扣分、不計錯。";
    element("sessionNotice").classList.remove("hidden");
    element("sessionNoticeBox").classList.remove("hidden");
  }
  if (state.currentIndex >= state.queue.length) {
    finishStage();
    return;
  }

  const item = state.queue[state.currentIndex];
  const primarySentence = getLinePrimaryText(item);
  const timingKey = `${state.currentIndex}:${questionKey(item)}`;
  if (isCurrentStepCloze() || timingKey !== activeTimingQuestion) pauseClock();
  activeTimingQuestion = timingKey;

  // Speaker & Context Header
  element("speakerBadge").textContent = getLineSpeaker(item);
  const stepTypeLabel = isCurrentStepCloze()
    ? "🧩 隨機台詞填空"
    : isMemoryDifficulty(state.difficulty)
      ? `${getDifficultyRules(state.difficulty).label}・固定詞組填空`
      : "⌨️ 過場台詞打字";
  element("lineContextBadge").textContent =
    `${getLineActTitle(item)} • ${stepTypeLabel}`;
  element("stageBadge").textContent =
    item.act === "act4" ? "究極神兵核心戰" : "天幕魔導城升降機";

  // Cross-language Subtitles
  renderSubtitlesForLanguage(item);

  // Interactive RPG Question (if present on L01 / L02)
  const rpgCard = element("rpgPromptCard");
  const scoreKey = questionKey(item);
  if (
    getDifficultyRules(state.difficulty).rpgChoices &&
    item.rpgQuestion &&
    !state.scoreProgress[scoreKey]?.rpgRewarded
  ) {
    const rq = item.rpgQuestion[state.lang] || item.rpgQuestion.zh;
    rpgCard.classList.remove("hidden");
    element("rpgPromptQuestion").textContent =
      state.lang === "zh" ? localizeZhTerm(rq.prompt) : rq.prompt;
    const choicesWrap = element("rpgChoicesContainer");
    choicesWrap.innerHTML = "";
    rq.choices.forEach((chLabel) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "text-left px-3.5 py-2 rounded-lg bg-slate-900/90 hover:bg-amber-500/20 border border-amber-500/40 text-xs sm:text-sm text-amber-100 font-medium transition flex items-center justify-between";
      const displayLabel =
        state.lang === "zh" ? localizeZhTerm(chLabel) : chLabel;
      btn.innerHTML = `<span>▶ ${displayLabel}</span><span class="text-[11px] text-amber-300/80">+150 pts</span>`;
      btn.addEventListener("click", () => {
        if (
          !getDifficultyRules(state.difficulty).rpgChoices ||
          !canAnswer() ||
          state.queue[state.currentIndex] !== item
        )
          return;
        const next = scoreRpg(state, scoreKey);
        if (next === state) return;
        Object.assign(state, next);
        soundFX.playLineComplete();
        rpgCard.classList.add("hidden");
        updateStatsUI();
      });
      choicesWrap.appendChild(btn);
    });
  } else {
    rpgCard.classList.add("hidden");
    element("rpgPromptQuestion").textContent = "";
    element("rpgChoicesContainer").replaceChildren();
  }

  // Switch between Standard Typing and Cloze Mode
  const panelTyping = element("panelStandardTyping");
  const panelCloze = element("panelClozeMode");

  if (isCurrentStepCloze()) {
    panelTyping.classList.add("hidden");
    panelCloze.classList.remove("hidden");
    renderClozeStep(item, primarySentence);
  } else {
    panelCloze.classList.add("hidden");
    panelTyping.classList.remove("hidden");
    renderStandardTypingStep(item, primarySentence);
  }

  updateStatsUI();
}

// =========================================================================
// 5. STANDARD TYPING MODE LOGIC
// =========================================================================
function renderStandardTypingStep(item: ScriptLine, targetText: string) {
  const assistsEnabled = getDifficultyRules(state.difficulty).typingAssistance;
  element("btnAutoFillWord").classList.toggle("hidden", !assistsEnabled);
  element("btnAutoFillWord").disabled = !assistsEnabled;
  element("typingAssistChips").classList.toggle("hidden", !assistsEnabled);
  const inputEl = element("typingInput");
  inputEl.value = "";
  Object.assign(state, resetTypingInput(state, questionKey(item)));
  renderTargetCharacters("", targetText);
  renderQuickPhraseChips(targetText);
  focusGameInput(inputEl);
}

function renderTargetCharacters(rawInput: string, targetText: string) {
  const displayEl = element("typingTargetDisplay");
  displayEl.innerHTML = "";

  const effectiveInput = computeEffectiveInput(rawInput, targetText);
  const normInput = normalizeForCompare(effectiveInput);
  const normTarget = normalizeForCompare(targetText);

  if (isMemoryDifficulty(state.difficulty)) {
    const item = state.queue[state.currentIndex];
    const rules = (
      getDifficultyRules(state.difficulty).target === "ultimate"
        ? ULTIMATE_MASKS
        : SAVAGE_MASKS
    )[item.id][state.lang];
    const localizedRules = rules.map((rule) => ({
      ...rule,
      text: state.lang === "zh" ? localizeZhTerm(rule.text) : rule.text,
    }));
    displayEl.textContent = fixedMask(targetText, localizedRules);
    return {
      allMatched: normInput === normTarget && normTarget.length > 0,
      effectiveInput,
      normInput,
      normTarget,
    };
  }

  let allMatched =
    normInput.length >= normTarget.length && normTarget.length > 0;

  for (let i = 0; i < targetText.length; i++) {
    const span = document.createElement("span");
    const ch = targetText[i];
    span.textContent = ch;

    if (i < normInput.length) {
      if (normInput[i] === normTarget[i]) {
        span.className = "char-correct";
      } else {
        span.className = "char-wrong";
        allMatched = false;
      }
    } else if (i === normInput.length) {
      span.className = "char-current";
      allMatched = false;
    } else {
      span.className =
        PUNCT_SET.has(ch) && state.skipPunct
          ? "char-punct-auto"
          : "char-pending";
      allMatched = false;
    }
    displayEl.appendChild(span);
  }

  return { allMatched, effectiveInput, normInput, normTarget };
}

function renderQuickPhraseChips(targetText: string) {
  const container = element("quickPhraseChips");
  container.innerHTML = "";
  if (!getDifficultyRules(state.difficulty).typingAssistance) return;
  let segments = [];
  if (state.lang === "en") {
    // Split English sentence into 3-4 word chunks
    const words = targetText.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i += 3) {
      const chunk =
        words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
      segments.push(chunk);
    }
  } else {
    segments = targetText.split(/[，。！？、……「」——]+/).filter(Boolean);
  }

  segments.forEach((seg) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "px-2.5 py-1 rounded bg-slate-800/90 hover:bg-amber-500/20 text-xs text-slate-200 border border-slate-700 hover:border-amber-400/50 transition";
    btn.textContent = seg.trim();
    btn.addEventListener("click", () => {
      if (
        !getDifficultyRules(state.difficulty).typingAssistance ||
        !canAnswer()
      )
        return;
      const inputEl = element("typingInput");
      inputEl.value += seg;
      handleTypingProgress("assist");
      inputEl.focus();
    });
    container.appendChild(btn);
  });
}

export function handleTypingProgress(source: InputSource = "manual") {
  if (!canAnswer() || isCurrentStepCloze()) return;
  if (advanceTimer !== undefined) return;
  if (state.isComposing) return;
  if (
    source === "assist" &&
    !getDifficultyRules(state.difficulty).typingAssistance
  )
    return;
  const item = state.queue[state.currentIndex];
  if (!item) return;

  const targetText = getLinePrimaryText(item);
  const inputEl = element("typingInput");
  const rawVal = inputEl.value;
  const previous = state.scoreProgress[questionKey(item)];
  const rawSources = reconcileInputSources(
    previous?.previousInput ?? "",
    previous?.inputSources ?? [],
    normalizeForCompare(rawVal),
    source,
  );
  const effective = computeEffectiveInputWithSources(
    rawVal,
    targetText,
    rawSources,
  );

  if (source === "manual" && rawVal.length > 0)
    state.typingClock = startTypingClock(state.typingClock, Date.now());

  const { allMatched, effectiveInput, normInput, normTarget } =
    renderTargetCharacters(rawVal, targetText);

  if (
    state.skipPunct &&
    effectiveInput.length > rawVal.length &&
    normTarget.startsWith(normInput)
  ) {
    inputEl.value = effectiveInput;
  }

  const previousErrors = state.errorCount;
  const previousCorrect = state.correctChars;
  Object.assign(
    state,
    scoreTyping(state, {
      questionId: questionKey(item),
      input: normInput,
      target: normTarget,
      source,
      inputSources: effective.sources,
    }),
  );
  if (state.errorCount > previousErrors) {
    soundFX.playError();
  } else if (state.correctChars > previousCorrect) {
    soundFX.playKeyClick(state.combo >= 15);
  }

  updateStatsUI();

  if (allMatched) {
    pauseClock();
    soundFX.playLineComplete();
    advanceTimer = setTimeout(() => {
      state.currentIndex++;
      renderCurrentStep();
    }, 180);
  }
}

// =========================================================================
// 6. MULTI-VARIANT RANDOMIZED CLOZE MODE LOGIC
// =========================================================================
export function renderClozeStep(item: ScriptLine, primarySentence: string) {
  if (!getDifficultyRules(state.difficulty).cloze) return;
  if (!canAnswer()) return;
  resetCompositionState();
  cancelPendingAdvance();
  pauseClock();
  state.clozeAnswered = false;
  const { chosenBlank, options, poolCount } = pickRandomClozeQuestion(item);

  const displayEl = element("clozeSentenceDisplay");
  const feedbackEl = element("clozeFeedbackBanner");
  const clozeInput = element("clozeInput");
  const diffTag = element("clozeDifficultyTag");

  diffTag.textContent = `本句共有 ${poolCount} 種隨機挖空變化（點擊「🎲 隨機換挖空詞」可立即切換）`;
  feedbackEl.classList.add("hidden");
  clozeInput.value = "";
  clozeInput.disabled = false;

  // Replace chosenBlank with interactive slot
  const parts = primarySentence.split(chosenBlank);
  if (parts.length >= 2) {
    displayEl.innerHTML = `${parts[0]}<span id="clozeSlotVisual" class="inline-block mx-1 px-3 py-0.5 rounded bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-black tracking-widest">【 ＿＿＿ 】</span>${parts.slice(1).join(chosenBlank)}`;
  } else {
    displayEl.innerHTML = `${primarySentence} <span id="clozeSlotVisual" class="inline-block mx-1 px-3 py-0.5 rounded bg-amber-500/20 border-2 border-amber-400 text-amber-300 font-black">【 ＿＿＿ 】</span>`;
  }

  const gridEl = element("clozeOptionsGrid");
  gridEl.innerHTML = "";
  options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "px-3.5 py-2.5 rounded-lg bg-slate-900/95 hover:bg-amber-500/20 border border-slate-700 hover:border-amber-400 text-sm sm:text-base font-bold text-amber-100 transition flex items-center justify-between";
    btn.innerHTML = `<span class="text-xs text-slate-400 font-mono">${idx + 1}.</span><span>${opt}</span><span></span>`;
    btn.addEventListener("click", () => {
      clozeInput.value = opt;
      verifyClozeAnswer(opt);
    });
    gridEl.appendChild(btn);
  });

  focusGameInput(clozeInput);
}

export function verifyClozeAnswer(userAnswerRaw: string) {
  if (state.isComposing) return;
  if (!canAnswer() || !isCurrentStepCloze()) return;
  if (state.clozeAnswered) return;
  const item = state.queue[state.currentIndex];
  if (!item) return;

  const expected = state.activeClozeBlank;
  const userClean = (userAnswerRaw || element("clozeInput").value).trim();
  if (!userClean) return;

  const feedbackEl = element("clozeFeedbackBanner");
  const slotEl = element("clozeSlotVisual");

  if (normalizeForCompare(userClean) === normalizeForCompare(expected)) {
    state.clozeAnswered = true;
    Object.assign(
      state,
      scoreCloze(state, {
        questionId: questionKey(item),
        correct: true,
        answerLength: expected.length,
      }),
    );

    if (slotEl) {
      slotEl.textContent = `【 ${expected} 】`;
      slotEl.className =
        "inline-block mx-1 px-3 py-0.5 rounded bg-emerald-500/25 border-2 border-emerald-400 text-emerald-300 font-black";
    }
    feedbackEl.textContent = `✔ 回答正確！「${expected}」—— 蓋老師對你的聽課態度十分滿意！`;
    feedbackEl.className =
      "text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-md bg-emerald-950/90 text-emerald-300 border border-emerald-600/60";
    feedbackEl.classList.remove("hidden");

    soundFX.playLineComplete();
    updateStatsUI();

    advanceTimer = setTimeout(() => {
      state.currentIndex++;
      renderCurrentStep();
    }, 650);
  } else {
    Object.assign(
      state,
      scoreCloze(state, {
        questionId: questionKey(item),
        correct: false,
        answerLength: 0,
      }),
    );
    soundFX.playError();
    updateStatsUI();

    const card = element("cutsceneDialogueCard");
    card.classList.remove("shake-anim");
    void card.offsetWidth;
    card.classList.add("shake-anim");

    feedbackEl.textContent = `✘ 「${userClean}」並非正確台詞！請再確認一次，或點擊提示／下方選項。`;
    feedbackEl.className =
      "text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-md bg-red-950/90 text-red-300 border border-red-600/60";
    feedbackEl.classList.remove("hidden");
  }
}

// =========================================================================
// 7. STAGE COMPLETION & ARCHIVE VIEW
// =========================================================================
export function finishStage() {
  if (isSessionLocked()) return;
  resetCompositionState();
  cancelPendingAdvance();
  pauseClock();
  const stats = currentStats();
  if (!stats.total) {
    showNoQuestions();
    return;
  }
  state.result = Object.freeze({
    ...stats,
    score: state.score,
    maxCombo: state.maxCombo,
    difficulty: state.difficulty,
    hasUsedAssistance: state.hasUsedAssistance,
  });
  element("typingInput").disabled = true;
  element("clozeInput").disabled = true;
  element("btnAutoFillWord").disabled = true;
  updateStatsUI();
  soundFX.playDutyComplete();
  const modal = element("stageCompleteModal");
  modal.classList.remove("hidden");

  element("finalScoreVal").textContent = state.score.toLocaleString();
  element("finalCpmVal").textContent =
    stats.cpm === null ? "不適用" : `${stats.cpm} 字/分`;
  element("finalAccVal").textContent =
    stats.accuracy === null ? "無資料" : `${stats.accuracy}%`;
  element("finalCompletionVal").textContent =
    `${stats.completed} / ${stats.total} 題（${stats.completionRate}%）`;
  element("finalMaxComboVal").textContent = String(state.maxCombo);
  const difficulty = getDifficultyRules(state.difficulty).label;
  element("finalAssistanceStatus").textContent =
    `${difficulty}模式・${state.hasUsedAssistance ? "已使用輔助" : "未使用輔助"}`;

  let rankTitle = "S+ 級：天命之統治者・蓋老師親傳首席";
  let rankQuote = "「實在太精彩了，冒險者。你對天幕魔導城演講已經倒背如流！」";
  if (stats.rank === null) {
    rankTitle = "無資料";
    rankQuote = "本局尚無可統計的作答資料，請重新開始練習。";
  } else if (stats.rank === "B") {
    rankTitle = "B 級：魔導城留堂補課生";
    rankQuote = "「這樣，真是遺憾……看來明天的主線隨機你還得再聽我講一次！」";
  } else if (stats.rank === "A") {
    rankTitle = "A 級：第XIV軍團榮譽幕僚";
    rankQuote = "「哼……竟然會有如此實力。距離領悟真正的力量只差一步了！」";
  }

  element("resultRankTitle").textContent = rankTitle;
  element("resultRankQuote").textContent = localizeZhTerm(rankQuote);
  modal.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

export function renderScriptArchive() {
  const container = element("scriptArchiveContainer");
  container.innerHTML = "";
  if (!getDifficultyRules(state.difficulty).archive) return;
  PRAETORIUM_SCRIPT.forEach((item, index) => {
    const row = document.createElement("div");
    row.className =
      "p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5";
    const poolWords = (item.clozePool[state.lang] || item.clozePool.zh)
      .map((w) => (state.lang === "zh" ? localizeZhTerm(w) : w))
      .join(" / ");
    row.innerHTML = `
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700/50">#${index + 1} ${getLineSpeaker(item)}</span>
              <span class="text-[11px] text-slate-400">${getLineActTitle(item)}</span>
              <span class="text-[11px] text-sky-300">隨機填空詞庫：【${poolWords}】</span>
            </div>
            <p class="text-sm sm:text-base font-serif-tc font-bold text-slate-100">${localizeZhTerm(item.text)}</p>
            <p class="text-xs text-amber-200/80">${item.jp}</p>
            <p class="text-xs text-slate-400 italic">${item.en}</p>
          </div>
          <div class="flex items-center gap-1.5 shrink-0">
            <button type="button" data-jump-mode="typing" data-jump-idx="${index}" class="px-2.5 py-1.5 rounded text-xs font-semibold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/50">
              ⌨️ 練習此句打字
            </button>
            <button type="button" data-jump-mode="cloze" data-jump-idx="${index}" class="px-2.5 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600">
              🧩 隨機填空
            </button>
          </div>
        `;
    container.appendChild(row);
  });

  container
    .querySelectorAll<HTMLButtonElement>("button[data-jump-mode]")
    .forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!getDifficultyRules(state.difficulty).archive) return;
        const targetMode = btn.getAttribute("data-jump-mode");
        const idx = parseInt(btn.getAttribute("data-jump-idx")!, 10);
        state.mode = targetMode as Mode;
        state.actFilter = "all";
        updateNavigationTabs();
        updateActButtons();
        startNewSession([PRAETORIUM_SCRIPT[idx]]);
      });
    });
}
