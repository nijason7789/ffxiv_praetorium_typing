// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/bgm", () => ({
  initializeBgm: vi.fn(),
  setBgmVolume: vi.fn(),
  startBgmOnLanguageSelection: vi.fn(),
  toggleBgm: vi.fn(),
}));
let initialize: () => void;
let game: typeof import("../src/game/app");
let dom: typeof import("../src/ui/dom");
let state: (typeof import("../src/game/state"))["state"];
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  document.body.innerHTML = readFileSync("index.html", "utf8")
    .match(/<body[^>]*>([\s\S]*)<\/body>/)![1]
    .replace(/<script[\s\S]*?<\/script>/g, "");
  (await import("../src/services/audio")).soundFX.enabled = false;
  game = await import("../src/game/app");
  dom = await import("../src/ui/dom");
  state = (await import("../src/game/state")).state;
  initialize = () => {};
  const spy = vi
    .spyOn(window, "addEventListener")
    .mockImplementation((type, listener) => {
      if (type === "DOMContentLoaded" && typeof listener === "function")
        initialize = () => listener.call(window, new Event(type));
    });
  await import("../src/ui/events");
  spy.mockRestore();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
function expectErrorView() {
  const view = document.querySelector<HTMLElement>("#pageErrorView");
  expect(view?.textContent).toContain("頁面載入異常");
  expect(view?.textContent).toContain("重新整理");
  expect(view?.getAttribute("role")).toBe("alert");
  expect(document.activeElement?.id).toBe("btnReloadPage");
  expect(state.sessionError).toBe(true);
  expect(state.result).toBe(null);
}
describe("Feature: 必要畫面元件缺失 [DEC-10, UI-04]", () => {
  it.each([
    "typingInput",
    "btnSelectLangZh",
    "finalScoreVal",
    "clozeInput",
    "copyToastMsg",
  ])(
    "Given 缺少 %s, When 初始化, Then 顯示可操作錯誤畫面而不開始遊戲",
    (id) => {
      document.getElementById(id)!.remove();
      expect(() => initialize()).not.toThrow();
      expectErrorView();
      expect(state.score).toBe(0);
    },
  );
  it("Given 完整頁面, When 初始化, Then 正常選擇語言而不顯示錯誤", () => {
    initialize();
    expect(document.querySelector("#pageErrorView")).toBe(null);
    expect(state.sessionError).toBe(false);
    document.querySelector<HTMLButtonElement>("#btnSelectLangEn")!.click();
    expect(
      document
        .querySelector("#difficultySelectModal")!
        .classList.contains("hidden"),
    ).toBe(false);
  });
  it("Given 遊戲中元件消失, When 渲染, Then 保留明確錯誤 ID 並停止場次", () => {
    initialize();
    document.querySelector("#typingTargetDisplay")!.remove();
    expect(() => game.renderCurrentStep()).toThrow(
      "Missing required element: typingTargetDisplay",
    );
    expectErrorView();
  });
  it("Given 已排程換題, When 發現缺失, Then 取消換題且不允許重開越過錯誤", () => {
    initialize();
    dom.element("typingInput").value = state.queue[0].text;
    game.handleTypingProgress();
    document.querySelector("#finalScoreVal")!.remove();
    expect(() => dom.element("finalScoreVal")).toThrow();
    const score = state.score;
    vi.advanceTimersByTime(1000);
    expect(state.currentIndex).toBe(0);
    game.startNewSession();
    expect(state.score).toBe(score);
    expectErrorView();
  });
  it("Given 已顯示結算, When 發現元件缺失, Then 不保留評級或結算結果", () => {
    initialize();
    game.finishStage();
    document.querySelector("#typingInput")!.remove();
    expect(() => dom.element("typingInput")).toThrow();
    expectErrorView();
    expect(
      document
        .querySelector<HTMLElement>("#stageCompleteModal")!
        .closest("main")!.style.display,
    ).toBe("none");
  });
  it("When 多次發現缺失, Then 只建立一個錯誤畫面", () => {
    initialize();
    document.querySelector("#typingTargetDisplay")!.remove();
    expect(() => dom.element("typingTargetDisplay")).toThrow();
    expect(() => dom.element("typingTargetDisplay")).toThrow();
    expect(document.querySelectorAll("#pageErrorView")).toHaveLength(1);
    expectErrorView();
  });
});
