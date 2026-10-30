// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, ScriptLine } from "../src/game/types";

let state: GameState;
let game: typeof import("../src/game/app");

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
  document.body.innerHTML = readFileSync("index.html", "utf8")
    .match(/<body[^>]*>([\s\S]*)<\/body>/)![1]
    .replace(/<script[\s\S]*?<\/script>/g, "");
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
