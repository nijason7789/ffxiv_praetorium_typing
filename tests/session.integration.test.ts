// @vitest-environment happy-dom
import { mountPageFixture } from "./helpers/page";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GameState, ScriptLine } from "../src/game/types";

vi.mock("../src/services/bgm", () => ({
  initializeBgm: vi.fn(),
  setBgmVolume: vi.fn(),
  startBgmOnLanguageSelection: vi.fn(),
  toggleBgm: vi.fn(),
}));
let state: GameState;
let game: typeof import("../src/game/app");
function line(id: string, text: string): ScriptLine {
  return {
    id,
    text,
    jp: text,
    en: text,
    act: "act1",
    actTitle: { zh: "第一幕", jp: "Act 1", en: "Act 1" },
    speaker: { zh: "蓋烏斯", jp: "Gaius", en: "Gaius" },
    clozePool: { zh: [text], jp: [text], en: [text] },
  };
}
function input(text: string) {
  const node = document.querySelector<HTMLTextAreaElement>("#typingInput")!;
  node.value = text;
  node.dispatchEvent(new Event("input"));
}
function click(id: string) {
  document.querySelector<HTMLButtonElement>("#" + id)!.click();
}
function text(id: string) {
  return document.querySelector("#" + id)?.textContent;
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(0);
  mountPageFixture();
  (await import("../src/services/audio")).soundFX.enabled = false;
  state = (await import("../src/game/state")).state;
  game = await import("../src/game/app");
  const { initializeApp } = await import("../src/ui/events");
  initializeApp();
  state.lang = "en";
  state.skipPunct = false;
  state.queue = [line("one", "AB"), line("two", "CD")];
  game.renderCurrentStep();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Feature: 統計、計時與結算 [DEC-04, DEC-07, DEC-09]", () => {
  it("[STAT-05] Given 無有效填空詞的題目, When 答完其餘有效題, Then 排除異常分母並顯示 100%", () => {
    state.mode = "cloze";
    const invalid = line("invalid", "WRONG");
    invalid.clozePool.en = ["not-in-sentence"];
    game.startNewSession([invalid, line("valid", "AB")]);
    expect(state.currentIndex).toBe(1);
    expect(text("sessionNotice")).toContain("略過");
    expect(state.errorCount).toBe(0);
    game.verifyClozeAnswer("AB");
    vi.advanceTimersByTime(650);
    expect(text("finalCompletionVal")).toBe("1 / 1 題（100%）");
    expect(
      document.querySelector<HTMLElement>("#stageProgressBar")!.style.width,
    ).toBe("100%");
  });
  it("[DEC-10] Given 空題庫, When 開始, Then 顯示錯誤與重新整理而不結算", () => {
    game.startNewSession([]);
    game.finishStage();
    expect(state.result).toBe(null);
    expect(text("sessionNotice")).toContain("沒有可用題目");
    expect(
      document.querySelector("#sessionReload")!.classList.contains("hidden"),
    ).toBe(false);
    expect(
      document
        .querySelector("#stageCompleteModal")!
        .classList.contains("hidden"),
    ).toBe(true);
  });
  it("[DEC-10] Given 全部填空題異常, When 開始, Then 不給評級或精準度滿分", () => {
    state.mode = "cloze";
    const invalid = line("bad", "AB");
    invalid.clozePool.en = [];
    game.startNewSession([invalid]);
    expect(state.result).toBe(null);
    expect(state.sessionError).toBe(true);
    expect(text("statAcc")).toBe("無資料");
  });
  it("[Q11] Given 完成後尚未換題, When 打開全文再返回, Then 恰好顯示下一題", () => {
    input("AB");
    click("navModeScript");
    vi.advanceTimersByTime(10_000);
    click("navModeTyping");
    expect(state.currentIndex).toBe(1);
    expect(text("typingTargetDisplay")).toBe("CD");
    expect(state.score).toBe(150);
  });
  it("[TOOLS-03, RESULT-05] When 重玩單句練習, Then 仍只有所選句且統計從零開始", () => {
    click("navModeScript");
    document
      .querySelector<HTMLButtonElement>("#scriptArchiveContainer button")!
      .click();
    const target = state.queue[0].en;
    input(target);
    vi.advanceTimersByTime(180);
    expect(text("finalCompletionVal")).toBe("1 / 1 題（100%）");
    click("btnPlayAgain");
    expect(state.queue).toHaveLength(1);
    expect(state.queue[0].en).toBe(target);
    expect(state.score).toBe(0);
    expect(state.result).toBe(null);
    expect(state.typingClock.elapsedMs).toBe(0);
  });
  it("[STAT-03] Given 只有輔助作答, When 完成題目, Then 有完成率但精準度與評級無資料", () => {
    document
      .querySelector<HTMLButtonElement>("#quickPhraseChips button")!
      .click();
    game.finishStage();
    expect(text("finalCompletionVal")).toBe("1 / 2 題（50%）");
    expect(text("finalAccVal")).toBe("無資料");
    expect(text("resultRankTitle")).toBe("無資料");
  });
  it("[Q19, Q25] Given 等待及純輔助操作, When 尚未手打, Then 打字計時不啟動", () => {
    vi.advanceTimersByTime(30_000);
    click("btnAutoFillWord");
    expect(state.typingClock.startedAt).toBe(null);
    expect(state.typingClock.elapsedMs).toBe(0);
  });
  it("[STAT-01] Given 零作答, When 結算, Then 不給滿分精準度或 S+ 評級", () => {
    game.finishStage();
    expect(text("finalAccVal")).toBe("無資料");
    expect(text("resultRankTitle")).toBe("無資料");
    expect(text("finalCompletionVal")).toBe("0 / 2 題（0%）");
  });
  it("[STAT-05] When 跳到下一題, Then 完成率仍為零", () => {
    click("btnNextLine");
    expect(
      document.querySelector<HTMLElement>("#stageProgressBar")!.style.width,
    ).toBe("0%");
    expect(text("ultimaChargeText")).toContain("0%");
  });
  it("[RESULT-04] When 答對一半題目再結算, Then 依作答精準度評級並另列完成率", () => {
    input("AB");
    vi.advanceTimersByTime(180);
    game.finishStage();
    expect(text("finalAccVal")).toBe("100%");
    expect(text("resultRankTitle")).toContain("S+");
    expect(text("finalCompletionVal")).toBe("1 / 2 題（50%）");
  });
  it("[STAT-02] Given 從時間零開始, When 花 30 秒輸入兩字, Then CPM 為 4 且不計完成後等待", () => {
    input("A");
    vi.advanceTimersByTime(30_000);
    input("AB");
    vi.advanceTimersByTime(60_000);
    game.finishStage();
    expect(text("finalCpmVal")).toBe("4 字/分");
  });
  it("[Q25] Given 純填空, When 作答並結算, Then CPM 不適用但精準度正常", () => {
    state.mode = "cloze";
    game.startNewSession();
    state.queue = [line("one", "AB")];
    game.renderCurrentStep();
    game.verifyClozeAnswer("AB");
    vi.advanceTimersByTime(650);
    expect(text("finalCpmVal")).toBe("不適用");
    expect(text("finalAccVal")).toBe("100%");
  });
  it("[Q25] Given 混合模式, When 填空停留 90 秒, Then 不降低打字 CPM", () => {
    state.mode = "exam";
    game.startNewSession();
    state.queue = [line("one", "AB"), line("two", "CD")];
    game.renderCurrentStep();
    input("A");
    vi.advanceTimersByTime(30_000);
    input("AB");
    vi.advanceTimersByTime(180);
    vi.advanceTimersByTime(90_000);
    game.verifyClozeAnswer("CD");
    vi.advanceTimersByTime(650);
    expect(text("finalCpmVal")).toBe("4 字/分");
  });
  it("[Q11] When 閱讀全文後返回原模式, Then 保留場次與輸入並排除閱讀時間", () => {
    input("A");
    vi.advanceTimersByTime(15_000);
    click("navModeScript");
    vi.advanceTimersByTime(90_000);
    click("navModeTyping");
    expect(state.score).toBe(25);
    expect(
      document.querySelector<HTMLTextAreaElement>("#typingInput")!.value,
    ).toBe("A");
    vi.advanceTimersByTime(15_000);
    input("AB");
    game.finishStage();
    expect(text("finalCpmVal")).toBe("4 字/分");
  });
  it("[Q12] When 結算後繼續輸入或再次結算, Then 分數統計與結果不變", () => {
    input("A");
    game.finishStage();
    const result = document.querySelector("#stageCompleteModal")!.textContent;
    input("AB");
    game.verifyClozeAnswer("wrong");
    vi.advanceTimersByTime(60_000);
    game.finishStage();
    expect(state.score).toBe(25);
    expect(document.querySelector("#stageCompleteModal")!.textContent).toBe(
      result,
    );
  });
  it("[Q12] Given 答對後等待換題, When 立即結算, Then 舊計時器不再推進", () => {
    input("AB");
    game.finishStage();
    vi.advanceTimersByTime(1000);
    expect(state.currentIndex).toBe(0);
  });
  it("[Q10, Q12] Given RPG 按鈕引用, When 結算後觸發, Then 不增加獎勵", () => {
    state.queue[0].rpgQuestion = {
      zh: { prompt: "why", choices: ["friends"] },
      jp: { prompt: "why", choices: ["friends"] },
      en: { prompt: "why", choices: ["friends"] },
    };
    game.renderCurrentStep();
    const button = document.querySelector<HTMLButtonElement>(
      "#rpgChoicesContainer button",
    )!;
    game.finishStage();
    button.click();
    expect(state.score).toBe(0);
  });
  it("[TOOLS-03] When 從全文選定單句, Then 建立獨立單題且清除舊分數與時間", () => {
    input("A");
    vi.advanceTimersByTime(30_000);
    click("navModeScript");
    document
      .querySelector<HTMLButtonElement>("#scriptArchiveContainer button")!
      .click();
    expect(state.queue).toHaveLength(1);
    expect(state.score).toBe(0);
    expect(state.totalTypedChars).toBe(0);
    expect(state.currentIndex).toBe(0);
  });
});
