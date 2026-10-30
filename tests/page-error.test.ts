// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let page: typeof import("../src/ui/page-error");
beforeEach(async () => {
  vi.resetModules();
  document.body.innerHTML = "<main inert><p>遊戲</p></main>";
  document.body.classList.add("overflow-hidden");
  page = await import("../src/ui/page-error");
});
afterEach(() => {
  vi.restoreAllMocks();
});
function boundary() {
  const handlers: Record<string, EventListener> = {};
  vi.spyOn(window, "addEventListener").mockImplementation((type, listener) => {
    if (typeof listener === "function")
      handlers[type] = listener as EventListener;
  });
  page.installPageErrorBoundary();
  return handlers;
}
describe("Feature: 獨立錯誤畫面與界線 [UI-04, DEC-10]", () => {
  it("Given 原畫面不存在, When 顯示錯誤, Then 可用鍵盤操作重新整理入口", () => {
    document.body.innerHTML = "";
    const reload = vi.fn();
    page.showPageError(reload);
    const button = document.querySelector<HTMLButtonElement>("#btnReloadPage")!;
    expect(document.activeElement).toBe(button);
    expect(button.inert).toBe(false);
    expect(document.body.classList.contains("overflow-hidden")).toBe(false);
    button.click();
    expect(reload).toHaveBeenCalledOnce();
  });
  it("Given 清理函式也失敗, Then 其他清理與錯誤畫面仍可執行", () => {
    const cleanup = vi.fn();
    page.onPageError(() => {
      throw new Error("cleanup failure");
    });
    page.onPageError(cleanup);
    expect(() => page.showPageError()).not.toThrow();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(document.querySelector("#pageErrorView")).not.toBe(null);
  });
  it("When 啟動邊界遇到缺件錯誤, Then 顯示提示且阻止重新初始化", () => {
    page.runPageAction(() => {
      throw new page.MissingRequiredElementError("typingInput");
    });
    const initialize = vi.fn();
    page.runPageAction(initialize);
    expect(initialize).not.toHaveBeenCalled();
    expect(page.hasPageError()).toBe(true);
  });
  it("When 遇到其他程式錯誤, Then 不偽裝成缺件錯誤", () => {
    const error = new TypeError("unexpected bug");
    expect(() =>
      page.runPageAction(() => {
        throw error;
      }),
    ).toThrow(error);
    expect(page.hasPageError()).toBe(false);
  });
  it("When 事件中的缺件錯誤抵達界線, Then 顯示錯誤並阻止未處理錯誤", () => {
    const handlers = boundary();
    const event = new ErrorEvent("error", {
      cancelable: true,
      error: new page.MissingRequiredElementError("finalScoreVal"),
    });
    handlers.error(event);
    expect(event.defaultPrevented).toBe(true);
    expect(page.hasPageError()).toBe(true);
  });
  it("When 非同步缺件錯誤抵達界線, Then 同樣顯示錯誤", () => {
    const handlers = boundary();
    const event = new Event("unhandledrejection", { cancelable: true });
    Object.defineProperty(event, "reason", {
      value: new page.MissingRequiredElementError("copyToastMsg"),
    });
    handlers.unhandledrejection(event);
    expect(event.defaultPrevented).toBe(true);
    expect(page.hasPageError()).toBe(true);
  });
  it("When 非缺件錯誤抵達界線, Then 保留瀏覽器的正常錯誤診斷", () => {
    const handlers = boundary();
    const event = new ErrorEvent("error", {
      cancelable: true,
      error: new Error("other"),
    });
    handlers.error(event);
    expect(event.defaultPrevented).toBe(false);
    expect(page.hasPageError()).toBe(false);
  });
});
