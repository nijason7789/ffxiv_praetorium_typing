import {
  startNewSession,
  updateNavigationTabs,
  updateActButtons,
  renderCurrentStep,
  renderScriptArchive,
  finishStage,
  handleTypingProgress,
  renderClozeStep,
  verifyClozeAnswer,
  selectMode,
} from "../game/app";
import { state } from "../game/state";
import { getDifficultyRules } from "../game/difficulty";
import { getLinePrimaryText } from "../game/text";
import { PRAETORIUM_SCRIPT } from "../data/praetorium";
import { soundFX } from "../services/audio";
import { initializeBgm, setBgmVolume, toggleBgm } from "../services/bgm";
import { element } from "./dom";
import type { Act } from "../game/types";
import { initializeSetup } from "./setup";
import { bindIme } from "./ime";
import { copyWithFeedback } from "./copy-feedback";
import { assertRequiredElements } from "./required-elements";
import { installPageErrorBoundary, runPageAction } from "./page-error";
let initialized = false;

export function initializeApp() {
  installPageErrorBoundary();
  runPageAction(() => {
    if (initialized) return;
    assertRequiredElements();
    initialized = true;
    initializeBgm();
    initializeSetup();

    element("btnToggleBgm").addEventListener("click", () => {
      toggleBgm();
    });

    element("bgmVolume").addEventListener("input", () => {
      setBgmVolume(Number(element("bgmVolume").value) / 100);
    });

    // Mode navigation buttons
    element("navModeTyping").addEventListener("click", () => {
      selectMode("typing");
    });
    element("navModeCloze").addEventListener("click", () => {
      selectMode("cloze");
    });
    element("navModeExam").addEventListener("click", () => {
      selectMode("exam");
    });
    element("navModeScript").addEventListener("click", () => {
      selectMode("script");
    });

    // Act filter buttons
    document.querySelectorAll<HTMLButtonElement>(".act-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!getDifficultyRules(state.difficulty).chapterSelection) return;
        state.actFilter = btn.getAttribute("data-act") as Act | "all";
        updateActButtons();
        if (state.mode === "script") {
          state.mode = "typing";
          updateNavigationTabs();
        }
        startNewSession();
      });
    });

    // Terminology toggle (艾歐澤亞 / 艾奧傑亞)
    element("btnToggleTerm").addEventListener("click", () => {
      state.useAltTerm = !state.useAltTerm;
      element("termLabel").textContent = state.useAltTerm
        ? "艾奧傑亞"
        : "艾歐澤亞";
      if (state.mode === "script") {
        renderScriptArchive();
      } else {
        renderCurrentStep();
      }
    });

    // Sound toggle
    element("btnToggleSound").addEventListener("click", (e) => {
      soundFX.enabled = !soundFX.enabled;
      (e.currentTarget as HTMLButtonElement).textContent = soundFX.enabled
        ? "🔊 音效"
        : "🔇 靜音";
    });

    // Checkboxes
    element("chkSkipPunct").addEventListener("change", (e) => {
      if (!getDifficultyRules(state.difficulty).skipPunctuation) return;
      state.skipPunct = (e.target as HTMLInputElement).checked;
      renderCurrentStep();
    });
    element("chkShowJp").addEventListener("change", (e) => {
      if (!getDifficultyRules(state.difficulty).subtitles) return;
      state.showSubtitles = (e.target as HTMLInputElement).checked;
      renderCurrentStep();
    });

    // Prev / Next / Restart buttons
    element("btnPrevLine").addEventListener("click", () => {
      if (!getDifficultyRules(state.difficulty).lineNavigation) return;
      if (state.result || state.sessionError || state.mode === "script") return;
      if (state.currentIndex > 0) {
        state.currentIndex--;
        renderCurrentStep();
      }
    });
    element("btnNextLine").addEventListener("click", () => {
      if (!getDifficultyRules(state.difficulty).lineNavigation) return;
      if (state.result || state.sessionError || state.mode === "script") return;
      if (state.currentIndex < state.queue.length - 1) {
        state.currentIndex++;
        renderCurrentStep();
      } else {
        finishStage();
      }
    });
    element("btnRestartStage").addEventListener("click", () =>
      startNewSession([...state.queue]),
    );
    element("btnPlayAgain").addEventListener("click", () =>
      startNewSession([...state.queue]),
    );
    element("sessionReload").addEventListener("click", () =>
      window.location.reload(),
    );

    // Standard Typing Input & IME Composition events
    const typingInput = element("typingInput");
    const imeBadge = element("imeStatusBadge");

    const canUseInput = (panel: string) =>
      !state.result &&
      !state.sessionError &&
      state.mode !== "script" &&
      !element(panel).classList.contains("hidden");
    const onCompositionChange = (composing: boolean) => {
      state.isComposing = composing;
      imeBadge.classList.toggle("hidden", !composing);
    };
    bindIme(typingInput, {
      isActive: () => canUseInput("panelStandardTyping"),
      onCompositionChange,
      onCommit: () => handleTypingProgress(),
      onInput: () => handleTypingProgress(),
    });

    // Auto-fill next characters helper button
    element("btnAutoFillWord").addEventListener("click", () => {
      if (
        !getDifficultyRules(state.difficulty).typingAssistance ||
        state.result ||
        state.sessionError ||
        state.mode === "script"
      )
        return;
      const item = state.queue[state.currentIndex];
      if (!item) return;
      const targetText = getLinePrimaryText(item);
      const currentLen = typingInput.value.length;
      const stepSize = state.lang === "en" ? 10 : 4;
      const nextSlice = targetText.slice(
        0,
        Math.min(targetText.length, currentLen + stepSize),
      );
      typingInput.value = nextSlice;
      handleTypingProgress("assist");
      typingInput.focus();
    });

    // Cloze Mode Input & Buttons
    const clozeInput = element("clozeInput");
    bindIme(clozeInput, {
      isActive: () => canUseInput("panelClozeMode"),
      onCompositionChange,
      onEnter: () => verifyClozeAnswer(clozeInput.value),
    });
    element("btnSubmitCloze").addEventListener("click", () => {
      verifyClozeAnswer(clozeInput.value);
    });
    element("btnRerollCloze").addEventListener("click", () => {
      if (!getDifficultyRules(state.difficulty).cloze) return;
      const item = state.queue[state.currentIndex];
      if (!item) return;
      renderClozeStep(item, getLinePrimaryText(item));
    });
    element("btnClozeHint").addEventListener("click", () => {
      if (!getDifficultyRules(state.difficulty).cloze) return;
      if (!state.activeClozeBlank) return;
      const hintLen = state.lang === "en" ? 2 : 1;
      clozeInput.value = state.activeClozeBlank.slice(0, hintLen);
      clozeInput.focus();
    });

    // Copy Report & Macros
    element("btnCopyReport").addEventListener("click", () => {
      const rank = element("resultRankTitle").textContent;
      const score = element("finalScoreVal").textContent;
      const cpm = element("finalCpmVal").textContent;
      const acc = element("finalAccVal").textContent;
      const langName = {
        zh: "繁體中文版",
        jp: "日本語版",
        en: "English Version",
      }[state.lang];
      const assistance = element("finalAssistanceStatus").textContent;
      const completion = element("finalCompletionVal").textContent;
      const text = `【FFXIV 最終決戰 天幕魔導城・蓋老師隨堂考 (${langName})】\n${assistance}\n評級：${rank}\n完成率：${completion}\n功績總分：${score} | 字速：${cpm} | 精準度：${acc}`;
      void copyWithFeedback(
        text,
        "✔ 已複製成績單！可貼上至隊伍頻道或社群分享。",
      );
    });

    element("btnCopyFullSpeech").addEventListener("click", () => {
      if (!getDifficultyRules(state.difficulty).archive) return;
      const lines = PRAETORIUM_SCRIPT.map((i) => getLinePrimaryText(i)).join(
        "\n",
      );
      void copyWithFeedback(
        lines,
        "✔ 已複製當前語言的蓋烏斯＆拉哈布雷亞演講全文！",
      );
    });

    element("btnCopyFFMacro").addEventListener("click", () => {
      if (!getDifficultyRules(state.difficulty).archive) return;
      const macroLines = PRAETORIUM_SCRIPT.slice(0, 14)
        .map((i) => `/p ${getLinePrimaryText(i)} <wait.3>`)
        .join("\n");
      void copyWithFeedback(
        macroLines,
        "✔ 已複製 FFXIV 隊伍頻道巨集 (/p 附帶 <wait.3>)！",
      );
    });

    // Initialize initial view behind the language selection modal
    startNewSession();
  });
}
