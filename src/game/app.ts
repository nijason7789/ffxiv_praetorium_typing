import { PRAETORIUM_SCRIPT, DISTRACTOR_POOL } from "../data/praetorium";
import { soundFX } from "../services/audio";
import { state } from "./state";
import {
  PUNCT_SET,
  localizeZhTerm,
  normalizeForCompare,
  getLinePrimaryText,
  getLineSpeaker,
  getLineActTitle,
  computeEffectiveInput,
} from "./text";
import { element } from "../ui/dom";
import type { ScriptLine, Language, Mode, Act } from "./types";
function getFilteredQueue() {
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

// Pick a random blank word from the item's clozePool for the current language
function pickRandomClozeQuestion(item: ScriptLine, forceDifferent = false) {
  const pool =
    (item.clozePool && item.clozePool[state.lang]) || item.clozePool.zh;
  const localizedPool = pool.map((w) =>
    state.lang === "zh" ? localizeZhTerm(w) : w,
  );
  const prevKey = `${item.id}_${state.lang}`;
  const prevBlank = state.lastBlankByLine[prevKey];

  let candidates = localizedPool;
  if (localizedPool.length > 1 && prevBlank) {
    const filtered = localizedPool.filter((w) => w !== prevBlank);
    if (filtered.length > 0) candidates = filtered;
  }

  const chosenBlank = candidates[Math.floor(Math.random() * candidates.length)];
  state.lastBlankByLine[prevKey] = chosenBlank;
  state.activeClozeBlank = chosenBlank;

  // Build 3 randomized distractors from same-language distractor pool + other pool words
  const langDistractors = (DISTRACTOR_POOL[state.lang] || DISTRACTOR_POOL.zh)
    .map((w) => (state.lang === "zh" ? localizeZhTerm(w) : w))
    .filter((w) => normalizeForCompare(w) !== normalizeForCompare(chosenBlank));

  // Shuffle distractors and pick 3
  const shuffledDist = [...langDistractors]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const options = [chosenBlank, ...shuffledDist].sort(
    () => Math.random() - 0.5,
  );

  return { chosenBlank, options, poolCount: localizedPool.length };
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

export function startNewSession() {
  state.queue = getFilteredQueue();
  state.currentIndex = 0;
  state.startTime = null;
  state.totalTypedChars = 0;
  state.correctChars = 0;
  state.errorCount = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.score = 0;
  state.lastMatchedLen = 0;
  state.clozeAnswered = false;
  state.rpgAnsweredForLine = {};

  element("stageCompleteModal").classList.add("hidden");
  updateLangUI();
  updateStatsUI();
  renderCurrentStep();
}

export function updateNavigationTabs() {
  const modes = [
    { id: "navModeTyping", key: "typing" },
    { id: "navModeCloze", key: "cloze" },
    { id: "navModeExam", key: "exam" },
    { id: "navModeScript", key: "script" },
  ];
  modes.forEach((m) => {
    const btn = element(m.id);
    if (state.mode === m.key) {
      btn.className =
        "px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all bg-amber-500/25 text-amber-200 border border-amber-400/70 shadow";
    } else {
      btn.className =
        "px-3 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all bg-slate-800/80 text-slate-300 border border-slate-700 hover:border-amber-500/40";
    }
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
  let cpm = 0;
  if (state.startTime && state.correctChars > 0) {
    const elapsedMinutes = Math.max(
      (Date.now() - state.startTime) / 60000,
      0.05,
    );
    cpm = Math.round(state.correctChars / elapsedMinutes);
  }
  const totalAttempts = state.correctChars + state.errorCount;
  const acc =
    totalAttempts > 0
      ? Math.max(0, Math.round((state.correctChars / totalAttempts) * 100))
      : 100;
  const multiplier = (1 + Math.floor(state.combo / 10) * 0.2).toFixed(1);

  element("statCpm").textContent = String(cpm);
  element("statAcc").textContent = String(acc);
  element("statCombo").textContent = String(state.combo);
  element("statEchoTier").textContent = `超越之力 x${multiplier}`;
  element("statScore").textContent = state.score.toLocaleString();

  const totalSteps = Math.max(state.queue.length, 1);
  const pct = Math.min(
    100,
    Math.round((state.currentIndex / totalSteps) * 100),
  );
  const displayPct = Math.max(8, pct);
  element("stageStepCounter").textContent =
    `(${Math.min(state.currentIndex + 1, totalSteps)} / ${totalSteps})`;
  element("ultimaChargeText").textContent = `究極神兵共鳴率：${pct}%`;
  element("stageProgressBar").style.width = `${displayPct}%`;
}

function renderSubtitlesForLanguage(item: ScriptLine) {
  const subBox = element("subtitlesBox");
  if (!state.showSubtitles) {
    subBox.classList.add("hidden");
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
  if (!state.queue.length) return;
  if (state.currentIndex >= state.queue.length) {
    finishStage();
    return;
  }

  const item = state.queue[state.currentIndex];
  const primarySentence = getLinePrimaryText(item);

  // Speaker & Context Header
  element("speakerBadge").textContent = getLineSpeaker(item);
  const stepTypeLabel = isCurrentStepCloze()
    ? "🧩 隨機台詞填空"
    : "⌨️ 過場台詞打字";
  element("lineContextBadge").textContent =
    `${getLineActTitle(item)} • ${stepTypeLabel}`;
  element("stageBadge").textContent =
    item.act === "act4" ? "究極神兵核心戰" : "天幕魔導城升降機";

  // Cross-language Subtitles
  renderSubtitlesForLanguage(item);

  // Interactive RPG Question (if present on L01 / L02)
  const rpgCard = element("rpgPromptCard");
  if (item.rpgQuestion && !state.rpgAnsweredForLine[item.id]) {
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
        state.rpgAnsweredForLine[item.id] = true;
        state.score += 150;
        state.combo += 2;
        soundFX.playLineComplete();
        rpgCard.classList.add("hidden");
        updateStatsUI();
      });
      choicesWrap.appendChild(btn);
    });
  } else {
    rpgCard.classList.add("hidden");
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
  const inputEl = element("typingInput");
  inputEl.value = "";
  state.lastMatchedLen = 0;
  renderTargetCharacters("", targetText);
  renderQuickPhraseChips(targetText);
  setTimeout(() => inputEl.focus(), 30);
}

function renderTargetCharacters(rawInput: string, targetText: string) {
  const displayEl = element("typingTargetDisplay");
  displayEl.innerHTML = "";

  const effectiveInput = computeEffectiveInput(rawInput, targetText);
  const normInput = normalizeForCompare(effectiveInput);
  const normTarget = normalizeForCompare(targetText);

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
      const inputEl = element("typingInput");
      if (!state.startTime) state.startTime = Date.now();
      inputEl.value += seg;
      handleTypingProgress();
      inputEl.focus();
    });
    container.appendChild(btn);
  });
}

export function handleTypingProgress() {
  if (state.isComposing) return;
  const item = state.queue[state.currentIndex];
  if (!item) return;

  const targetText = getLinePrimaryText(item);
  const inputEl = element("typingInput");
  const rawVal = inputEl.value;

  if (!state.startTime && rawVal.length > 0) {
    state.startTime = Date.now();
  }

  const { allMatched, effectiveInput, normInput, normTarget } =
    renderTargetCharacters(rawVal, targetText);

  if (
    state.skipPunct &&
    effectiveInput.length > rawVal.length &&
    normTarget.startsWith(normInput)
  ) {
    inputEl.value = effectiveInput;
  }

  let currentMatchedPrefix = 0;
  for (let i = 0; i < Math.min(normInput.length, normTarget.length); i++) {
    if (normInput[i] === normTarget[i]) {
      currentMatchedPrefix++;
    } else {
      break;
    }
  }

  if (currentMatchedPrefix > state.lastMatchedLen) {
    const delta = currentMatchedPrefix - state.lastMatchedLen;
    state.correctChars += delta;
    state.totalTypedChars += delta;
    state.combo += delta;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    const mult = 1 + Math.floor(state.combo / 10) * 0.2;
    state.score += Math.round(delta * 25 * mult);
    state.lastMatchedLen = currentMatchedPrefix;
    soundFX.playKeyClick(state.combo >= 15);
  } else if (
    normInput.length > currentMatchedPrefix &&
    normInput.length > state.lastMatchedLen
  ) {
    state.errorCount += 1;
    state.combo = 0;
    soundFX.playError();
  }

  updateStatsUI();

  if (allMatched) {
    soundFX.playLineComplete();
    state.score += 100;
    setTimeout(() => {
      state.currentIndex++;
      renderCurrentStep();
    }, 180);
  }
}

// =========================================================================
// 6. MULTI-VARIANT RANDOMIZED CLOZE MODE LOGIC
// =========================================================================
export function renderClozeStep(item: ScriptLine, primarySentence: string) {
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

  setTimeout(() => clozeInput.focus(), 30);
}

export function verifyClozeAnswer(userAnswerRaw: string) {
  if (state.clozeAnswered) return;
  const item = state.queue[state.currentIndex];
  if (!item) return;

  if (!state.startTime) state.startTime = Date.now();

  const expected = state.activeClozeBlank;
  const userClean = (userAnswerRaw || element("clozeInput").value).trim();
  if (!userClean) return;

  const feedbackEl = element("clozeFeedbackBanner");
  const slotEl = element("clozeSlotVisual");

  if (normalizeForCompare(userClean) === normalizeForCompare(expected)) {
    state.clozeAnswered = true;
    state.correctChars += expected.length;
    state.combo += 3;
    if (state.combo > state.maxCombo) state.maxCombo = state.combo;
    const mult = 1 + Math.floor(state.combo / 10) * 0.2;
    state.score += Math.round(200 * mult);

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

    setTimeout(() => {
      state.currentIndex++;
      renderCurrentStep();
    }, 650);
  } else {
    state.errorCount += 1;
    state.combo = 0;
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
  soundFX.playDutyComplete();
  const modal = element("stageCompleteModal");
  modal.classList.remove("hidden");

  let cpm = 0;
  if (state.startTime && state.correctChars > 0) {
    const elapsedMinutes = Math.max(
      (Date.now() - state.startTime) / 60000,
      0.05,
    );
    cpm = Math.round(state.correctChars / elapsedMinutes);
  }
  const totalAttempts = state.correctChars + state.errorCount;
  const acc =
    totalAttempts > 0
      ? Math.max(0, Math.round((state.correctChars / totalAttempts) * 100))
      : 100;

  element("finalScoreVal").textContent = state.score.toLocaleString();
  element("finalCpmVal").textContent = `${cpm} 字/分`;
  element("finalAccVal").textContent = `${acc}%`;
  element("finalMaxComboVal").textContent = String(state.maxCombo);

  let rankTitle = "S+ 級：天命之統治者・蓋老師親傳首席";
  let rankQuote = "「實在太精彩了，冒險者。你對天幕魔導城演講已經倒背如流！」";
  if (acc < 80) {
    rankTitle = "B 級：魔導城留堂補課生";
    rankQuote = "「這樣，真是遺憾……看來明天的主線隨機你還得再聽我講一次！」";
  } else if (acc < 93) {
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
        const targetMode = btn.getAttribute("data-jump-mode");
        const idx = parseInt(btn.getAttribute("data-jump-idx")!, 10);
        state.mode = targetMode as Mode;
        state.actFilter = "all";
        state.queue = [...PRAETORIUM_SCRIPT];
        state.currentIndex = idx;
        updateNavigationTabs();
        updateActButtons();
        renderCurrentStep();
      });
    });
}

export function copyTextSafe(text: string, callback: () => void) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(callback)
      .catch(() => fallbackCopy(text, callback));
  } else {
    fallbackCopy(text, callback);
  }
}

function fallbackCopy(text: string, callback: () => void) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
  } catch (e) {}
  document.body.removeChild(ta);
  if (callback) callback();
}
