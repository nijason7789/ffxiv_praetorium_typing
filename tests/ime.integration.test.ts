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
const input = () => document.querySelector<HTMLInputElement>("#clozeInput")!;
const click = (id: string) =>
  document.querySelector<HTMLButtonElement>("#" + id)!.click();
const compose = (type: "compositionstart" | "compositionend") =>
  input().dispatchEvent(
    new CompositionEvent(type, { bubbles: true, data: "同伴" }),
  );
function key(type = "keydown", init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent(type, {
    key: "Enter",
    bubbles: true,
    cancelable: true,
    ...init,
  });
  input().dispatchEvent(event);
  return event;
}
function line(id: string): ScriptLine {
  return {
    id,
    act: "act1",
    text: "同伴",
    jp: "仲間",
    en: "Friends",
    actTitle: { zh: "第一幕", jp: "Act 1", en: "Act 1" },
    speaker: { zh: "蓋烏斯", jp: "Gaius", en: "Gaius" },
    clozePool: { zh: ["同伴"], jp: ["仲間"], en: ["Friends"] },
  };
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
  state.lang = "zh";
  state.mode = "cloze";
  game.startNewSession([line("one"), line("two")]);
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Feature: 填空 IME 與送出 [DEC-05, CLOZE-05]", () => {
  it("[TYPE-10] Given 一般打字組字中, When input, Then 等確認後才計分且不重複計分", () => {
    state.mode = "typing";
    game.startNewSession([line("one"), line("two")]);
    const typing = document.querySelector<HTMLTextAreaElement>("#typingInput")!;
    typing.dispatchEvent(new CompositionEvent("compositionstart"));
    typing.value = "同伴";
    typing.dispatchEvent(new InputEvent("input", { isComposing: true }));
    expect(state.score).toBe(0);
    expect(state.errorCount).toBe(0);
    typing.dispatchEvent(new CompositionEvent("compositionend"));
    typing.dispatchEvent(new InputEvent("input"));
    expect(state.score).toBe(150);
    expect(state.correctChars).toBe(2);
    vi.advanceTimersByTime(180);
    expect(state.currentIndex).toBe(1);
  });
  it("[TYPE-10] Given 沒收到 start 但 input.isComposing 為真, Then 打字也不提前判定", () => {
    state.mode = "typing";
    game.startNewSession([line("one")]);
    const typing = document.querySelector<HTMLTextAreaElement>("#typingInput")!;
    typing.value = "同伴";
    typing.dispatchEvent(new InputEvent("input", { isComposing: true }));
    expect(state.score).toBe(0);
    typing.dispatchEvent(new InputEvent("input", { isComposing: false }));
    expect(state.score).toBe(150);
  });
  it("[TYPE-10] Given 原打字題組字中, When 切到填空再收到舊 end, Then 不判定新題", () => {
    state.mode = "typing";
    game.startNewSession([line("one")]);
    const typing = document.querySelector<HTMLTextAreaElement>("#typingInput")!;
    typing.dispatchEvent(new CompositionEvent("compositionstart"));
    typing.value = "尚未確認";
    click("navModeCloze");
    typing.dispatchEvent(new CompositionEvent("compositionend"));
    expect(state.isComposing).toBe(false);
    expect(state.score).toBe(0);
    expect(state.errorCount).toBe(0);
  });
  it.each(["zh", "jp"] as const)(
    "Given %s 組字, When 按 Enter 選字, Then 不送出或計錯",
    (lang) => {
      state.lang = lang;
      game.renderCurrentStep();
      compose("compositionstart");
      input().value = "尚未選定";
      key();
      expect(state.isComposing).toBe(true);
      expect(state.errorCount).toBe(0);
      expect(state.score).toBe(0);
      expect(state.clozeAnswered).toBe(false);
    },
  );
  it("When Enter 確認後才收到 compositionend, Then 下一次 Enter 可正常送出", () => {
    compose("compositionstart");
    input().value = "同伴";
    key();
    compose("compositionend");
    key("keyup");
    expect(state.score).toBe(0);
    key();
    expect(state.clozeAnswered).toBe(true);
    expect(state.score).toBe(200);
  });
  it("When compositionend 先於確認 Enter, Then 同一輪 Enter 不送出", () => {
    compose("compositionstart");
    input().value = "同伴";
    compose("compositionend");
    key();
    expect(state.clozeAnswered).toBe(false);
    expect(state.score).toBe(0);
    key("keyup");
    key();
    expect(state.score).toBe(200);
  });
  it("Given 原生 isComposing 訊號, When Enter, Then 即使未收到 start 也不送出", () => {
    input().value = "同伴";
    key("keydown", { isComposing: true });
    expect(state.score).toBe(0);
  });
  it("Given IME keyCode 229, When Enter, Then 不送出", () => {
    input().value = "同伴";
    key("keydown", { keyCode: 229 });
    expect(state.score).toBe(0);
  });
  it("Given 確認 Enter 仍按住, When 重複 keydown, Then 不送出或重複判錯", () => {
    compose("compositionstart");
    input().value = "錯誤";
    key();
    compose("compositionend");
    vi.advanceTimersByTime(100);
    key("keydown", { repeat: true });
    expect(state.errorCount).toBe(0);
    key("keyup");
    key();
    expect(state.errorCount).toBe(1);
  });
  it("When 滑鼠完成選字且下一輪才按 Enter, Then 不多吞一次送出", () => {
    compose("compositionstart");
    input().value = "同伴";
    compose("compositionend");
    vi.advanceTimersByTime(0);
    key();
    expect(state.score).toBe(200);
  });
  it("Given 尚在組字, When 透過按鈕或直接驗證答案, Then 不判定未確認內容", () => {
    compose("compositionstart");
    input().value = "錯誤";
    click("btnSubmitCloze");
    game.verifyClozeAnswer("同伴");
    expect(state.errorCount).toBe(0);
    expect(state.score).toBe(0);
  });
  it.each(["btnNextLine", "btnRerollCloze", "btnRestartStage"])(
    "Given 組字中, When %s, Then 清除組字狀態且忽略舊 end",
    (id) => {
      compose("compositionstart");
      click(id);
      expect(state.isComposing).toBe(false);
      compose("compositionend");
      input().value = state.activeClozeBlank;
      key();
      expect(state.clozeAnswered).toBe(true);
    },
  );
  it("Given 組字中離開全文再返回, Then 不殘留組字鎖定", () => {
    compose("compositionstart");
    click("navModeScript");
    click("navModeCloze");
    expect(state.isComposing).toBe(false);
    input().value = "同伴";
    key();
    expect(state.score).toBe(200);
  });
  it.each(["", "   ", "　\t\n"])(
    "Given 空白答案 %j, When 送出, Then 統計與時鐘沒有副作用",
    (value) => {
      const before = {
        score: state.score,
        combo: state.combo,
        errors: state.errorCount,
        correct: state.correctChars,
        clock: { ...state.typingClock },
      };
      input().value = value;
      key();
      click("btnSubmitCloze");
      expect({
        score: state.score,
        combo: state.combo,
        errors: state.errorCount,
        correct: state.correctChars,
        clock: state.typingClock,
      }).toEqual(before);
      expect(state.clozeAnswered).toBe(false);
    },
  );
  it("Given 一般英文輸入, When Enter, Then 立即送出", () => {
    state.lang = "en";
    game.renderCurrentStep();
    input().value = "Friends";
    expect(key().defaultPrevented).toBe(true);
    expect(state.score).toBe(200);
  });
});
