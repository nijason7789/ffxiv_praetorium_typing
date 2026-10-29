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
  copyTextSafe,
} from "../game/app";
import { state } from "../game/state";
import { getLinePrimaryText } from "../game/text";
import { PRAETORIUM_SCRIPT } from "../data/praetorium";
import { soundFX } from "../services/audio";
import { initializeBgm, setBgmVolume, toggleBgm } from "../services/bgm";
import { element } from "./dom";
import type { Act } from "../game/types";
import { initializeSetup } from "./setup";
window.addEventListener("DOMContentLoaded", () => {
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
    state.mode = "typing";
    updateNavigationTabs();
    startNewSession();
  });
  element("navModeCloze").addEventListener("click", () => {
    state.mode = "cloze";
    updateNavigationTabs();
    startNewSession();
  });
  element("navModeExam").addEventListener("click", () => {
    state.mode = "exam";
    updateNavigationTabs();
    startNewSession();
  });
  element("navModeScript").addEventListener("click", () => {
    state.mode = "script";
    updateNavigationTabs();
  });

  // Act filter buttons
  document.querySelectorAll<HTMLButtonElement>(".act-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
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
    state.skipPunct = (e.target as HTMLInputElement).checked;
    renderCurrentStep();
  });
  element("chkShowJp").addEventListener("change", (e) => {
    state.showSubtitles = (e.target as HTMLInputElement).checked;
    renderCurrentStep();
  });

  // Prev / Next / Restart buttons
  element("btnPrevLine").addEventListener("click", () => {
    if (state.currentIndex > 0) {
      state.currentIndex--;
      renderCurrentStep();
    }
  });
  element("btnNextLine").addEventListener("click", () => {
    if (state.currentIndex < state.queue.length - 1) {
      state.currentIndex++;
      renderCurrentStep();
    } else {
      finishStage();
    }
  });
  element("btnRestartStage").addEventListener("click", startNewSession);
  element("btnPlayAgain").addEventListener("click", startNewSession);

  // Standard Typing Input & IME Composition events
  const typingInput = element("typingInput");
  const imeBadge = element("imeStatusBadge");

  typingInput.addEventListener("compositionstart", () => {
    state.isComposing = true;
    imeBadge.classList.remove("hidden");
  });
  typingInput.addEventListener("compositionend", () => {
    state.isComposing = false;
    imeBadge.classList.add("hidden");
    handleTypingProgress();
  });
  typingInput.addEventListener("input", () => {
    if (!state.isComposing) {
      handleTypingProgress();
    }
  });

  // Auto-fill next characters helper button
  element("btnAutoFillWord").addEventListener("click", () => {
    if (state.difficulty !== "experience") return;
    const item = state.queue[state.currentIndex];
    if (!item) return;
    const targetText = getLinePrimaryText(item);
    if (!state.startTime) state.startTime = Date.now();
    const currentLen = typingInput.value.length;
    const stepSize = state.lang === "en" ? 10 : 4;
    const nextSlice = targetText.slice(
      0,
      Math.min(targetText.length, currentLen + stepSize),
    );
    typingInput.value = nextSlice;
    handleTypingProgress();
    typingInput.focus();
  });

  // Cloze Mode Input & Buttons
  const clozeInput = element("clozeInput");
  clozeInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !state.isComposing) {
      e.preventDefault();
      verifyClozeAnswer(clozeInput.value);
    }
  });
  element("btnSubmitCloze").addEventListener("click", () => {
    verifyClozeAnswer(clozeInput.value);
  });
  element("btnRerollCloze").addEventListener("click", () => {
    const item = state.queue[state.currentIndex];
    if (!item) return;
    renderClozeStep(item, getLinePrimaryText(item));
  });
  element("btnClozeHint").addEventListener("click", () => {
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
    const text = `【FFXIV 最終決戰 天幕魔導城・蓋老師隨堂考 (${langName})】\n評級：${rank}\n功績總分：${score} | 字速：${cpm} | 精準度：${acc}`;
    copyTextSafe(text, () => {
      const toast = element("copyToastMsg");
      toast.classList.remove("hidden");
      setTimeout(() => toast.classList.add("hidden"), 3000);
    });
  });

  element("btnCopyFullSpeech").addEventListener("click", () => {
    const lines = PRAETORIUM_SCRIPT.map((i) => getLinePrimaryText(i)).join(
      "\n",
    );
    copyTextSafe(lines, () => {
      const status = element("macroCopyStatus");
      status.textContent = "✔ 已複製當前語言的蓋烏斯＆拉哈布雷亞演講全文！";
      status.classList.remove("hidden");
    });
  });

  element("btnCopyFFMacro").addEventListener("click", () => {
    const macroLines = PRAETORIUM_SCRIPT.slice(0, 14)
      .map((i) => `/p ${getLinePrimaryText(i)} <wait.3>`)
      .join("\n");
    copyTextSafe(macroLines, () => {
      const status = element("macroCopyStatus");
      status.textContent = "✔ 已複製 FFXIV 隊伍頻道巨集 (/p 附帶 <wait.3>)！";
      status.classList.remove("hidden");
    });
  });

  // Initialize initial view behind the language selection modal
  startNewSession();
});
