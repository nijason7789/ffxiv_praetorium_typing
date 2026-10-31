// @vitest-environment happy-dom
import { mountPageFixture } from "./helpers/page";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { state } from "../src/game/state";
import { PRAETORIUM_SCRIPT } from "../src/data/praetorium";
import { soundFX } from "../src/services/audio";
import { element } from "../src/ui/dom";
import { getLinePrimaryText, normalizeForCompare } from "../src/game/text";
import {
  initializeBgm,
  startBgmOnLanguageSelection,
} from "../src/services/bgm";

vi.mock("../src/services/bgm", () => ({
  initializeBgm: vi.fn(),
  setBgmVolume: vi.fn(),
  startBgmOnLanguageSelection: vi.fn(),
  toggleBgm: vi.fn(),
}));

beforeAll(async () => {
  vi.useFakeTimers();
  soundFX.enabled = false;
  mountPageFixture();
  const { initializeApp } = await import("../src/ui/events");
  initializeApp();
  expect(initializeBgm).toHaveBeenCalledOnce();
});

afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("modular game integration", () => {
  it("loads the three language versions from the real page", () => {
    for (const [lang, id] of [
      ["zh", "btnSelectLangZh"],
      ["jp", "btnSelectLangJp"],
      ["en", "btnSelectLangEn"],
    ] as const) {
      element(id).click();
      expect(state.lang).toBe(lang);
      expect(
        element("difficultySelectModal").classList.contains("hidden"),
      ).toBe(false);
      expect(element("difficultyLanguageBadge").textContent).toBe(
        { zh: "繁體中文", jp: "日本語", en: "English" }[lang],
      );
      element("btnSelectExperience").click();
      expect(state.difficulty).toBe("experience");
      expect(state.queue).toHaveLength(PRAETORIUM_SCRIPT.length);
      expect(element("typingTargetDisplay").textContent).toBe(
        lang === "zh" ? state.queue[0].text : state.queue[0][lang],
      );
      expect(element("langSelectModal").classList.contains("hidden")).toBe(
        true,
      );
      expect(
        element("difficultySelectModal").classList.contains("hidden"),
      ).toBe(true);
    }
    expect(startBgmOnLanguageSelection).toHaveBeenCalledTimes(3);
  });

  it("completes a typed line and advances to the next line", () => {
    element("navModeTyping").click();
    element("typingInput").value = state.queue[0].en;
    element("typingInput").dispatchEvent(new Event("input"));
    expect(state.score).toBeGreaterThan(0);
    vi.advanceTimersByTime(180);
    expect(state.currentIndex).toBe(1);
    expect(element("typingInput").value).toBe("");
  });

  it("answers a cloze question and resets through restart", () => {
    element("navModeCloze").click();
    expect(element("clozeOptionsGrid").children).toHaveLength(4);
    element("clozeInput").value = state.activeClozeBlank;
    element("btnSubmitCloze").click();
    expect(state.clozeAnswered).toBe(true);
    vi.advanceTimersByTime(650);
    expect(state.currentIndex).toBe(1);
    element("btnRestartStage").click();
    expect(state.currentIndex).toBe(0);
    expect(state.score).toBe(0);
  });

  it("switches mixed mode, archive and individual practice", () => {
    element("navModeExam").click();
    expect(element("panelStandardTyping").classList.contains("hidden")).toBe(
      false,
    );
    element("btnNextLine").click();
    expect(element("panelClozeMode").classList.contains("hidden")).toBe(false);
    element("navModeScript").click();
    expect(element("scriptArchiveContainer").children).toHaveLength(
      PRAETORIUM_SCRIPT.length,
    );
    element("scriptArchiveContainer")
      .querySelector<HTMLButtonElement>("button")!
      .click();
    expect(state.mode).toBe("typing");
    expect(element("viewGameStage").classList.contains("hidden")).toBe(false);
  });

  it("preserves terminology and English case normalization", () => {
    state.lang = "zh";
    expect(normalizeForCompare("艾奧傑亞的以太")).toBe(
      normalizeForCompare("艾歐澤亞的乙太"),
    );
    state.lang = "en";
    expect(normalizeForCompare("Fight")).toBe("fight");
  });

  it("supports returning from difficulty selection to language selection", () => {
    element("btnOpenLangModal").click();
    element("btnSelectLangJp").click();
    element("btnBackToLanguage").click();
    expect(element("langSelectModal").classList.contains("hidden")).toBe(false);
    expect(element("difficultySelectModal").classList.contains("hidden")).toBe(
      true,
    );
    vi.advanceTimersByTime(50);
    expect(document.activeElement).toBe(element("btnSelectLangZh"));
    element("btnSelectLangEn").click();
    element("btnSelectChallenge").click();
    expect(state.lang).toBe("en");
    expect(state.difficulty).toBe("challenge");
  });

  it("removes typing assists in challenge mode across navigation and restart", () => {
    const checkChallenge = () => {
      expect(state.difficulty).toBe("challenge");
      expect(element("btnAutoFillWord").classList.contains("hidden")).toBe(
        true,
      );
      expect(element("btnAutoFillWord").disabled).toBe(true);
      expect(element("typingAssistChips").classList.contains("hidden")).toBe(
        true,
      );
      expect(element("quickPhraseChips").children).toHaveLength(0);
      element("btnAutoFillWord").click();
      expect(element("typingInput").value).toBe("");
      expect(state.score).toBe(0);
    };
    checkChallenge();
    for (const id of [
      "btnNextLine",
      "btnRestartStage",
      "navModeCloze",
      "navModeTyping",
      "navModeExam",
    ]) {
      element(id).click();
      checkChallenge();
    }
    element("navModeScript").click();
    element("scriptArchiveContainer")
      .querySelector<HTMLButtonElement>("button")!
      .click();
    checkChallenge();
  });

  it("restores working assists when selecting experience", () => {
    element("btnOpenDifficultyModal").click();
    element("btnSelectExperience").click();
    expect(state.difficulty).toBe("experience");
    expect(element("btnAutoFillWord").classList.contains("hidden")).toBe(false);
    expect(element("quickPhraseChips").children.length).toBeGreaterThan(0);
    element("btnAutoFillWord").click();
    expect(element("typingInput").value.length).toBeGreaterThan(0);
    expect(state.score).toBeGreaterThan(0);
    element("btnRestartStage").click();
    element("quickPhraseChips")
      .querySelector<HTMLButtonElement>("button")!
      .click();
    expect(element("typingInput").value.length).toBeGreaterThan(0);
  });

  it("cancels a completed line's pending advance when changing difficulty", () => {
    element("btnRestartStage").click();
    element("typingInput").value = getLinePrimaryText(state.queue[0]);
    element("typingInput").dispatchEvent(new Event("input"));
    element("typingInput").dispatchEvent(new Event("input"));
    element("btnOpenDifficultyModal").click();
    element("btnSelectChallenge").click();
    vi.advanceTimersByTime(1000);
    expect(state.currentIndex).toBe(0);
    expect(state.score).toBe(0);
    expect(element("btnAutoFillWord").disabled).toBe(true);
  });

  it("rerolls to another real blank and clears the previous input", () => {
    element("navModeCloze").click();
    let previous = state.activeClozeBlank;
    for (let i = 0; i < 8; i++) {
      element("clozeInput").value = "舊答案";
      element("btnRerollCloze").click();
      expect(state.activeClozeBlank).not.toBe(previous);
      expect(getLinePrimaryText(state.queue[state.currentIndex])).toContain(
        state.activeClozeBlank,
      );
      expect(element("clozeInput").value).toBe("");
      expect(element("clozeSlotVisual").textContent).toContain("＿＿＿");
      const options = [
        ...element("clozeOptionsGrid").querySelectorAll("button"),
      ];
      expect(options).toHaveLength(4);
      expect(
        options.filter((option) =>
          option.textContent?.includes(state.activeClozeBlank),
        ),
      ).toHaveLength(1);
      previous = state.activeClozeBlank;
    }
  });
});
