// @vitest-environment happy-dom
import { mountPageFixture } from "./helpers/page";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, ScriptLine } from "../src/game/types";

let state: GameState;
let game: typeof import("../src/game/app");

vi.mock("../src/services/bgm", () => ({
  initializeBgm: vi.fn(),
  setBgmVolume: vi.fn(),
  startBgmOnLanguageSelection: vi.fn(),
  toggleBgm: vi.fn(),
}));

async function bindEvents() {
  const { initializeApp } = await import("../src/ui/events");
  initializeApp();
  state.queue = [
    question("first", "ABCDEFGHIJKL"),
    question("second", "SECOND"),
  ];
  game.renderCurrentStep();
}

function question(id: string, text: string): ScriptLine {
  return {
    id,
    text,
    jp: text,
    en: text,
    act: "act1",
    actTitle: { zh: "第一幕", jp: "Act 1", en: "Act 1" },
    speaker: { zh: "蓋烏斯", jp: "Gaius", en: "Gaius" },
    clozePool: { zh: ["AB", "CD"], jp: ["AB", "CD"], en: ["AB", "CD"] },
  };
}

function type(text: string) {
  document.querySelector<HTMLInputElement>("#typingInput")!.value = text;
  game.handleTypingProgress();
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-31T00:00:00Z"));
  mountPageFixture();
  document.querySelector("#langSelectModal")!.classList.add("hidden");
  const audio = await import("../src/services/audio");
  audio.soundFX.enabled = false;
  state = (await import("../src/game/state")).state;
  game = await import("../src/game/app");
  state.lang = "en";
  state.skipPunct = false;
  game.startNewSession();
  state.queue = [question("first", "ABCDEFGHIJ"), question("second", "SECOND")];
  game.renderCurrentStep();
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Feature: 計分規則接回遊戲 [DEC-03, SCORE]", () => {
  it.each(["zh", "jp"] as const)(
    "[Q26] Given %s 版, When 略過標點與空白完成, Then 只計手打字元",
    (lang) => {
      state.lang = lang;
      state.queue[0] = question("localized", "甲， 乙。");
      state.skipPunct = true;
      game.renderCurrentStep();
      type("甲乙");
      expect(state.score).toBe(150);
      expect(state.combo).toBe(2);
      expect(state.correctChars).toBe(2);
      expect(state.hasUsedAssistance).toBe(false);
    },
  );
  it("[ASSIST-04, Q19] When 點補字再手動完成, Then 只有後兩字納入字速與精準度", async () => {
    await bindEvents();
    document.querySelector<HTMLButtonElement>("#btnAutoFillWord")!.click();
    expect(state.hasUsedAssistance).toBe(true);
    expect(state.correctChars).toBe(0);
    expect(document.querySelector("#statCpm")!.textContent).toBe("0");
    type("ABCDEFGHIJKL");
    expect(state.correctChars).toBe(2);
    expect(state.totalTypedChars).toBe(2);
    expect(state.score).toBe(415);
    expect(document.querySelector("#statCpm")!.textContent).toBe("40");
  });

  it("[ASSIST-02] Given 挑戰模式, When 觸發補字操作, Then 不填入文字或標示輔助", async () => {
    await bindEvents();
    state.difficulty = "challenge";
    game.renderCurrentStep();
    document
      .querySelector<HTMLButtonElement>("#btnAutoFillWord")!
      .dispatchEvent(new Event("click"));
    expect(
      document.querySelector<HTMLTextAreaElement>("#typingInput")!.value,
    ).toBe("");
    expect(state.hasUsedAssistance).toBe(false);
    game.finishStage();
    expect(document.querySelector("#finalAssistanceStatus")!.textContent).toBe(
      "挑戰模式・未使用輔助",
    );
  });

  it("[Q07] When 使用輔助後重開, Then 新局結算標示未使用輔助", () => {
    document
      .querySelector<HTMLButtonElement>("#quickPhraseChips button")!
      .click();
    game.startNewSession();
    game.finishStage();
    expect(state.hasUsedAssistance).toBe(false);
    expect(
      document.querySelector("#finalAssistanceStatus")!.textContent,
    ).toContain("未使用輔助");
  });

  it("[Q19] Given 手動錯字, When 使用輔助修正與完成, Then 原錯誤保留且不灌高精準度", () => {
    type("AX");
    const input = document.querySelector<HTMLTextAreaElement>("#typingInput")!;
    input.value = "ABCDEFGHIJ";
    game.handleTypingProgress("assist");
    expect(state.correctChars).toBe(1);
    expect(state.errorCount).toBe(1);
    expect(document.querySelector("#statAcc")!.textContent).toBe("50");
    game.finishStage();
    expect(document.querySelector("#finalAccVal")!.textContent).toBe("50%");
  });

  it("[Q07] When 複製成績, Then 包含難度與實際輔助使用標示", async () => {
    await bindEvents();
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    document.querySelector<HTMLButtonElement>("#btnAutoFillWord")!.click();
    game.finishStage();
    document.querySelector<HTMLButtonElement>("#btnCopyReport")!.click();
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining("體驗模式・已使用輔助"),
    );
  });

  it("[Q19, Q26] When 點擊快速詞組, Then 給遊戲分但不增加手動統計", () => {
    document
      .querySelector<HTMLButtonElement>("#quickPhraseChips button")!
      .click();
    expect(state.score).toBe(355);
    expect(state.combo).toBe(10);
    expect(state.correctChars).toBe(0);
    expect(state.totalTypedChars).toBe(0);
    expect(state.hasUsedAssistance).toBe(true);
  });

  it("[Q19, Q26] When 自動略過句中與句尾標點, Then 不給標點字元分", () => {
    state.queue[0] = question("punct", "A,B.");
    state.skipPunct = true;
    game.renderCurrentStep();
    type("AB");
    expect(state.score).toBe(150);
    expect(state.combo).toBe(2);
    expect(state.correctChars).toBe(2);
    expect(state.totalTypedChars).toBe(2);
  });

  it("[Q19] Given 已補入自動標點, When 繼續手打, Then 舊標點仍不計手動字數", () => {
    state.queue[0] = question("punct", "A,B.C");
    state.skipPunct = true;
    game.renderCurrentStep();
    type("A");
    type("A,B");
    type("A,B.C");
    expect(state.score).toBe(175);
    expect(state.combo).toBe(3);
    expect(state.correctChars).toBe(3);
  });

  it("[Q07] When 體驗模式未使用輔助而結算, Then 標示未使用輔助", () => {
    game.finishStage();
    expect(
      document.querySelector("#finalAssistanceStatus")?.textContent,
    ).toContain("未使用輔助");
  });

  it("[Q07] When 使用快速詞組後結算, Then 標示體驗與已使用輔助", () => {
    document
      .querySelector<HTMLButtonElement>("#quickPhraseChips button")!
      .click();
    game.finishStage();
    expect(
      document.querySelector("#finalAssistanceStatus")?.textContent,
    ).toContain("體驗");
    expect(
      document.querySelector("#finalAssistanceStatus")?.textContent,
    ).toContain("已使用輔助");
  });

  it("[SCORE-02] Given 8 Combo, When 一次確認 4 字, Then 字元分增加 115", () => {
    state.combo = 8;
    type("ABCD");
    expect(state.score).toBe(115);
    expect(state.combo).toBe(12);
  });

  it("[SCORE-02] Given 8 Combo, When 分四次輸入相同文字, Then 也增加 115", () => {
    state.combo = 8;
    for (const input of ["A", "AB", "ABC", "ABCD"]) type(input);
    expect(state.score).toBe(115);
    expect(state.combo).toBe(12);
  });

  it("[SCORE-06] When 一次輸入含正確前綴與兩個錯字, Then 兩字均記錯", () => {
    type("ABXY");
    expect(state.errorCount).toBe(2);
    expect(state.combo).toBe(0);
    expect(state.correctChars).toBe(2);
    expect(state.score).toBe(50);
  });

  it("[TYPE-14] When 相同輸入被重複處理或刪掉錯字, Then 不重複記舊錯誤", () => {
    type("ABXY");
    type("ABXY");
    type("ABY");
    expect(state.errorCount).toBe(2);
    type("AB");
    type("ABXY");
    expect(state.errorCount).toBe(4);
  });

  it("[SCORE-04] When 同句完成在換題前重複處理, Then 完成獎勵只取得一次", () => {
    type("ABCDEFGHIJ");
    const score = state.score;
    type("ABCDEFGHIJ");
    expect(state.score).toBe(score);
    vi.advanceTimersByTime(180);
    expect(state.currentIndex).toBe(1);
  });

  it("[Q09] When 同局返回已答對句子重答, Then 分數字數與 Combo 不再增加", () => {
    type("ABCDEFGHIJ");
    const earned = {
      score: state.score,
      correctChars: state.correctChars,
      combo: state.combo,
    };
    vi.advanceTimersByTime(180);
    state.currentIndex = 0;
    game.renderCurrentStep();
    type("ABCDEFGHIJ");
    expect({
      score: state.score,
      correctChars: state.correctChars,
      combo: state.combo,
    }).toEqual(earned);
  });

  it("[Q09] When 清空再重打已計分前綴, Then 不再次增加字元分與 Combo", () => {
    type("ABCD");
    type("");
    type("ABCD");
    expect(state.score).toBe(100);
    expect(state.combo).toBe(4);
    expect(state.correctChars).toBe(4);
  });

  it("[Q09] When 重開新一局, Then 相同題目可重新獲得獎勵", () => {
    type("ABCD");
    game.startNewSession();
    state.queue = [question("first", "ABCDEFGHIJ")];
    game.renderCurrentStep();
    type("ABCD");
    expect(state.score).toBe(100);
    expect(state.combo).toBe(4);
    expect(state.correctChars).toBe(4);
  });

  it("[SCORE-05, Q09] When 已答對填空後換詞再答, Then 同一句不重複領獎", () => {
    state.mode = "cloze";
    game.renderCurrentStep();
    game.verifyClozeAnswer(state.activeClozeBlank);
    const earned = {
      score: state.score,
      combo: state.combo,
      correctChars: state.correctChars,
    };
    game.renderClozeStep(state.queue[0], state.queue[0].en);
    game.verifyClozeAnswer(state.activeClozeBlank);
    expect({
      score: state.score,
      combo: state.combo,
      correctChars: state.correctChars,
    }).toEqual(earned);
  });

  it("[SCORE-08, SCORE-09] When 同一 RPG 選項被重複觸發, Then 獎勵只領一次並更新最高 Combo", () => {
    state.queue[0].rpgQuestion = {
      zh: { prompt: "為何而戰？", choices: ["同伴"] },
      jp: { prompt: "Why?", choices: ["Friends"] },
      en: { prompt: "Why?", choices: ["Friends"] },
    };
    game.renderCurrentStep();
    const choice = document.querySelector<HTMLButtonElement>(
      "#rpgChoicesContainer button",
    )!;
    choice.click();
    choice.click();
    expect(state.score).toBe(150);
    expect(state.combo).toBe(2);
    expect(state.maxCombo).toBe(2);
  });
});
