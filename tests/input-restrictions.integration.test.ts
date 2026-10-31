// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountPageFixture } from "./helpers/page";

vi.mock("../src/services/bgm", () => ({
  initializeBgm: vi.fn(),
  setBgmVolume: vi.fn(),
  startBgmOnLanguageSelection: vi.fn(),
  toggleBgm: vi.fn(),
}));
const node = (id: string) => document.getElementById(id)!;
const input = () => node("typingInput") as HTMLTextAreaElement;
const click = (id: string) => node(id).click();
const hiddenNotice = () =>
  !document.querySelector("#inputRestrictionNotice:not(.hidden)");
function choose(choice: "Experience" | "Challenge" | "Savage" | "Ultimate") {
  click("btnOpenDifficultyModal");
  click("btnSelect" + choice);
}
function transfer(
  target: HTMLTextAreaElement | HTMLInputElement,
  kind: "paste" | "drop",
  text: string,
) {
  // happy-dom does not implement native insertion: emulate it only when uncancelled.
  const primary = new Event(kind, { bubbles: true, cancelable: true });
  const before = new InputEvent("beforeinput", {
    bubbles: true,
    cancelable: true,
    inputType: kind === "paste" ? "insertFromPaste" : "insertFromDrop",
    data: text,
  });
  const allowed = target.dispatchEvent(primary) && target.dispatchEvent(before);
  if (allowed) {
    target.setRangeText(
      text,
      target.selectionStart ?? 0,
      target.selectionEnd ?? 0,
      "end",
    );
    target.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: before.inputType,
        data: text,
      }),
    );
  }
  return { primary, allowed };
}
function type(text: string) {
  input().value = text;
  input().dispatchEvent(new Event("input", { bubbles: true }));
}
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  mountPageFixture();
  (await import("../src/services/audio")).soundFX.enabled = false;
  (await import("../src/ui/events")).initializeApp();
  click("btnSelectLangZh");
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("Feature: 作答欄貼上與拖放權限", () => {
  it.each(["Challenge", "Savage", "Ultimate"] as const)(
    "[INPUT-02,05] Given %s, Then 貼上與拖放不改變答案或場次",
    async (choice) => {
      choose(choice);
      const { state } = await import("../src/game/state");
      const { getLinePrimaryText } = await import("../src/game/text");
      const before = JSON.stringify(state);
      for (const kind of ["paste", "drop"] as const) {
        expect(
          transfer(input(), kind, getLinePrimaryText(state.queue[0])).allowed,
        ).toBe(false);
        expect(input().value).toBe("");
        expect(JSON.stringify(state)).toBe(before);
      }
      vi.advanceTimersByTime(200);
      expect(state.currentIndex).toBe(0);
      expect(node("inputRestrictionNotice").textContent).toBe(
        "此難度請手動輸入台詞",
      );
      expect(node("inputRestrictionNotice").getAttribute("role")).toBe(
        "status",
      );
    },
  );
  it("[INPUT-01,06] Given 體驗, Then 貼上與拖放保留原生插入及作答", async () => {
    choose("Experience");
    const { state } = await import("../src/game/state");
    transfer(input(), "paste", "冒險");
    expect(input().value).toBe("冒險");
    expect(state.correctChars).toBe(2);
    transfer(input(), "drop", "者");
    expect(input().value).toBe("冒險者，");
    expect(state.correctChars).toBe(3);
    expect(hiddenNotice()).toBe(true);
  });
  it("[INPUT-03] Given 選取部分答案, Then 阻擋貼上保留文字、選取、焦點與運行中的時鐘", async () => {
    choose("Challenge");
    type("冒險者");
    input().focus();
    input().setSelectionRange(1, 3);
    const { state } = await import("../src/game/state");
    const before = JSON.stringify(state);
    const originalText = input().value;
    transfer(input(), "paste", "完整答案");
    expect(input().value).toBe(originalText);
    expect([input().selectionStart, input().selectionEnd]).toEqual([1, 3]);
    expect(document.activeElement).toBe(input());
    expect(JSON.stringify(state)).toBe(before);
    expect(state.typingClock.startedAt).not.toBe(null);
  });
  it.each([
    "insertFromPaste",
    "insertFromPasteAsQuotation",
    "insertFromDrop",
    "deleteByDrag",
  ])(
    "[INPUT-08] Given 只有 beforeinput/%s, Then 仍阻擋且不傷害原文字",
    (inputType) => {
      choose("Ultimate");
      type("冒");
      const event = new InputEvent("beforeinput", {
        cancelable: true,
        inputType,
        data: "答案",
      });
      expect(input().dispatchEvent(event)).toBe(false);
      expect(input().value).toBe("冒");
      expect(hiddenNotice()).toBe(false);
    },
  );
  it("[INPUT-07,15] Given 同次操作多事件, Then 提示不重複，另次貼上從最後一次計時", () => {
    choose("Savage");
    const notice = node("inputRestrictionNotice");
    const setter = vi.spyOn(notice, "textContent", "set");
    input().dispatchEvent(new Event("paste", { cancelable: true }));
    input().dispatchEvent(
      new InputEvent("beforeinput", {
        cancelable: true,
        inputType: "insertFromPaste",
      }),
    );
    expect(setter).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2500);
    input().dispatchEvent(new Event("paste", { cancelable: true }));
    expect(setter).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(500);
    expect(hiddenNotice()).toBe(false);
    type("冒");
    expect(input().value).toBe("冒");
    vi.advanceTimersByTime(2500);
    expect(hiddenNotice()).toBe(true);
  });
  it("[INPUT-09,10] Given 組字中嘗試貼上, Then 組字不中斷，多字確認仍正常計分", async () => {
    choose("Ultimate");
    const { state } = await import("../src/game/state");
    input().dispatchEvent(new CompositionEvent("compositionstart"));
    type("冒險者");
    transfer(input(), "paste", "答案");
    expect(state.isComposing).toBe(true);
    expect(state.score).toBe(0);
    const event = new InputEvent("beforeinput", {
      cancelable: true,
      inputType: "insertCompositionText",
      data: "冒險者",
      isComposing: true,
    });
    expect(input().dispatchEvent(event)).toBe(true);
    input().dispatchEvent(new CompositionEvent("compositionend"));
    expect(input().value).toBe("冒險者");
    expect(state.correctChars).toBe(3);
    expect(state.isComposing).toBe(false);
  });
  it("[INPUT-11,17] Then 正常編輯、複製與剪下事件不被攔截", () => {
    choose("Challenge");
    for (const kind of ["copy", "cut", "keydown"]) {
      expect(input().dispatchEvent(new Event(kind, { cancelable: true }))).toBe(
        true,
      );
    }
    for (const inputType of [
      "insertText",
      "deleteByCut",
      "deleteContentBackward",
      "historyUndo",
      "historyRedo",
      "insertReplacementText",
    ]) {
      expect(
        input().dispatchEvent(
          new InputEvent("beforeinput", { cancelable: true, inputType }),
        ),
      ).toBe(true);
    }
    expect(hiddenNotice()).toBe(true);
  });
  it("[INPUT-12] When 普通與體驗往返, Then 依當下權限，普通填空也禁止貼上", () => {
    choose("Challenge");
    click("navModeCloze");
    const cloze = node("clozeInput") as HTMLInputElement;
    expect(transfer(cloze, "paste", "答案").allowed).toBe(false);
    choose("Experience");
    click("navModeCloze");
    expect(transfer(cloze, "paste", "答案").allowed).toBe(true);
    expect(cloze.value).toBe("答案");
    expect(node("clozeFeedbackBanner").classList.contains("hidden")).toBe(true);
    choose("Challenge");
    expect(transfer(input(), "paste", "答案").allowed).toBe(false);
  });
  it("[INPUT-13,14] When 換題、重開及結算, Then 清除提示且結果鎖定", async () => {
    choose("Savage");
    const { state } = await import("../src/game/state");
    const { getLinePrimaryText } = await import("../src/game/text");
    transfer(input(), "paste", "答案");
    type(getLinePrimaryText(state.queue[0]));
    vi.advanceTimersByTime(180);
    expect(hiddenNotice()).toBe(true);
    transfer(input(), "paste", "答案");
    click("btnRestartStage");
    expect(hiddenNotice()).toBe(true);
    (await import("../src/game/app")).finishStage();
    const before = JSON.stringify(state);
    input().dispatchEvent(new Event("paste", { cancelable: true }));
    expect(JSON.stringify(state)).toBe(before);
    expect(hiddenNotice()).toBe(true);
  });
  it("[INPUT-14] Given 頁面錯誤, Then 舊欄位不能產生提示或修改成績", async () => {
    choose("Challenge");
    const old = input();
    transfer(old, "paste", "答案");
    (await import("../src/ui/page-error")).showPageError();
    expect(hiddenNotice()).toBe(true);
    old.dispatchEvent(new Event("paste", { cancelable: true }));
    expect(hiddenNotice()).toBe(true);
  });
  it("When 重複初始化, Then 提示不重複綁定", async () => {
    (await import("../src/ui/events")).initializeApp();
    choose("Challenge");
    const setter = vi.spyOn(
      node("inputRestrictionNotice"),
      "textContent",
      "set",
    );
    transfer(input(), "paste", "答案");
    expect(setter).toHaveBeenCalledTimes(1);
  });
});
