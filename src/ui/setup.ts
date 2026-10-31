import { state } from "../game/state";
import type { Difficulty, Language } from "../game/types";
import { startNewSession, updateNavigationTabs } from "../game/app";
import { startBgmOnLanguageSelection } from "../services/bgm";
import { soundFX } from "../services/audio";
import { element } from "./dom";
import { difficultyLabels } from "../game/difficulty";

const languageLabels = { zh: "繁體中文", jp: "日本語", en: "English" };
type SetupStep = "language" | "difficulty" | "game";

export function initializeSetup() {
  function showStep(step: SetupStep) {
    element("langSelectModal").classList.toggle("hidden", step !== "language");
    element("difficultySelectModal").classList.toggle(
      "hidden",
      step !== "difficulty",
    );
    document
      .querySelectorAll<HTMLElement>(
        "body > header, body > main, body > footer",
      )
      .forEach((node) => {
        node.inert = step !== "game";
      });
    document.body.classList.toggle("overflow-hidden", step !== "game");
    if (step === "difficulty") {
      element("difficultyLanguageBadge").textContent =
        languageLabels[state.lang];
      element("btnSelectExperience").focus();
    } else if (step === "language") {
      element("btnSelectLangZh").focus();
    } else {
      element("typingInput").focus();
    }
  }

  function chooseLanguage(language: Language) {
    // Keep play() inside the language click so browser user activation is retained.
    startBgmOnLanguageSelection();
    state.lang = language;
    showStep("difficulty");
  }

  function chooseDifficulty(difficulty: Difficulty) {
    state.difficulty = difficulty;
    state.mode = "typing";
    element("currentDifficultyBadge").textContent =
      difficultyLabels[difficulty];
    updateNavigationTabs();
    startNewSession();
    showStep("game");
    soundFX.playLineComplete();
  }

  element("btnSelectLangZh").addEventListener("click", () =>
    chooseLanguage("zh"),
  );
  element("btnSelectLangJp").addEventListener("click", () =>
    chooseLanguage("jp"),
  );
  element("btnSelectLangEn").addEventListener("click", () =>
    chooseLanguage("en"),
  );
  element("btnSelectExperience").addEventListener("click", () =>
    chooseDifficulty("experience"),
  );
  element("btnSelectChallenge").addEventListener("click", () =>
    chooseDifficulty("challenge"),
  );
  element("btnSelectSavage").addEventListener("click", () =>
    chooseDifficulty("savage"),
  );
  element("btnSelectUltimate").addEventListener("click", () =>
    chooseDifficulty("ultimate"),
  );
  element("btnBackToLanguage").addEventListener("click", () =>
    showStep("language"),
  );
  element("btnOpenLangModal").addEventListener("click", () =>
    showStep("language"),
  );
  element("btnOpenDifficultyModal").addEventListener("click", () =>
    showStep("difficulty"),
  );

  // Keep keyboard navigation inside the visible selection page.
  for (const id of ["langSelectModal", "difficultySelectModal"]) {
    element(id).addEventListener("keydown", (event) => {
      if (event.key !== "Tab") return;
      const buttons = element(id).querySelectorAll<HTMLButtonElement>("button");
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  showStep("language");
}
