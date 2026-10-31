// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountPageFixture } from "./helpers/page";

vi.mock("../src/services/bgm", () => ({
  initializeBgm: vi.fn(),
  setBgmVolume: vi.fn(),
  startBgmOnLanguageSelection: vi.fn(),
  toggleBgm: vi.fn(),
}));
const key = "ffxiv-praetorium:beta-notice";
const node = (id: string) => document.getElementById(id)!;
const click = (id: string) => node(id).click();
const visible = (id: string) => !node(id).classList.contains("hidden");
async function boot() {
  mountPageFixture();
  (await import("../src/services/audio")).soundFX.enabled = false;
  (await import("../src/ui/events")).initializeApp();
}
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  localStorage.clear();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Feature: 測試版公告", () => {
  it("Given 已讀公告, When 結算, Then 仍顯示測試版回饋區及安全另開分頁的表單連結", async () => {
    const { BETA_NOTICE } = await import("../src/data/beta-notice");
    localStorage.setItem(key, BETA_NOTICE.version);
    await boot();
    click("btnSelectLangZh");
    click("btnSelectExperience");
    expect(visible("betaSetupNotice")).toBe(false);
    expect(visible("stageCompleteModal")).toBe(false);
    const { state } = await import("../src/game/state");
    (await import("../src/game/app")).finishStage();
    expect(visible("stageCompleteModal")).toBe(true);
    expect(node("betaResultNotice").closest("#stageCompleteModal")).not.toBe(
      null,
    );
    expect(node("betaResultTitle").textContent).toBe(BETA_NOTICE.resultTitle);
    expect(node("betaResultNotice").textContent).toContain(
      BETA_NOTICE.resultMessage,
    );
    const link = node("betaFeedbackLink") as HTMLAnchorElement;
    expect(link.href).toBe(
      "https://docs.google.com/forms/d/e/1FAIpQLScc_E2nZ5xS5rxui9XXSVvAzULRbTLNUYnDZ3XwrKB9FtlxcA/viewform?pli=1",
    );
    expect(link.target).toBe("_blank");
    expect(link.relList.contains("noopener")).toBe(true);
    expect(link.relList.contains("noreferrer")).toBe(true);
    const result = state.result;
    click("btnPlayAgain");
    expect(visible("stageCompleteModal")).toBe(false);
    expect(result).not.toBe(null);
    expect(state.result).toBe(null);
  });
  it("Given 首次進入, Then 語言頁顯示公告、不搶焦點且不阻止直接開局", async () => {
    await boot();
    const { BETA_NOTICE } = await import("../src/data/beta-notice");
    expect(visible("betaSetupNotice")).toBe(true);
    expect(node("betaSetupNotice").textContent).toContain(BETA_NOTICE.message);
    expect(document.activeElement).toBe(node("btnSelectLangZh"));
    expect(node("btnBetaSetupNotice").getAttribute("aria-expanded")).toBe(
      "true",
    );
    click("btnSelectLangZh");
    click("btnSelectExperience");
    expect(visible("langSelectModal")).toBe(false);
    expect(visible("betaGameNotice")).toBe(false);
    expect(node("btnBetaGameNotice").textContent).toBe(BETA_NOTICE.badge);
    expect((node("typingInput") as HTMLInputElement).disabled).toBe(false);
  });
  it("When 關閉公告並重新載入, Then 同一版本不再自動顯示，標籤仍可重開", async () => {
    await boot();
    const { BETA_NOTICE } = await import("../src/data/beta-notice");
    click("btnDismissBetaSetup");
    expect(localStorage.getItem(key)).toBe(BETA_NOTICE.version);
    expect(document.activeElement).toBe(node("btnBetaSetupNotice"));
    vi.resetModules();
    await boot();
    expect(visible("betaSetupNotice")).toBe(false);
    click("btnBetaSetupNotice");
    expect(visible("betaSetupNotice")).toBe(true);
    click("btnBetaSetupNotice");
    expect(visible("betaSetupNotice")).toBe(false);
  });
  it("Given 儲存的公告版本已過期, Then 新公告重新顯示", async () => {
    localStorage.setItem(key, "older-version");
    await boot();
    expect(visible("betaSetupNotice")).toBe(true);
  });
  it("Given 儲存功能無法讀寫, Then 公告可關閉並正常遊玩", async () => {
    vi.spyOn(localStorage, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    await boot();
    expect(visible("betaSetupNotice")).toBe(true);
    click("btnDismissBetaSetup");
    expect(visible("betaSetupNotice")).toBe(false);
    click("btnSelectLangZh");
    click("btnSelectChallenge");
    expect(visible("difficultySelectModal")).toBe(false);
  });
  it("When 遊戲中開關說明, Then 原答案、題目、計時與計分保持原狀", async () => {
    await boot();
    click("btnSelectLangZh");
    click("btnSelectChallenge");
    const input = node("typingInput") as HTMLInputElement;
    input.value = "冒險";
    input.dispatchEvent(new Event("input"));
    const { state } = await import("../src/game/state");
    const before = JSON.stringify(state);
    click("btnBetaGameNotice");
    expect(visible("betaGameNotice")).toBe(true);
    click("btnDismissBetaGame");
    expect(visible("betaGameNotice")).toBe(false);
    expect(document.activeElement).toBe(node("btnBetaGameNotice"));
    expect(input.value).toBe("冒險");
    expect(JSON.stringify(state)).toBe(before);
  });
  it("Given 公告已關閉, Then Tab 陷阱不會聚焦隱藏的關閉按鈕", async () => {
    await boot();
    click("btnDismissBetaSetup");
    node("btnSelectLangEn").focus();
    node("btnSelectLangEn").dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(node("btnBetaSetupNotice"));
    node("btnBetaSetupNotice").dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    expect(document.activeElement).toBe(node("btnSelectLangEn"));
  });
  it("When 重複初始化, Then 公告操作不重複綁定", async () => {
    await boot();
    (await import("../src/ui/beta-notice")).initializeBetaNotice();
    click("btnDismissBetaSetup");
    click("btnBetaSetupNotice");
    expect(visible("betaSetupNotice")).toBe(true);
  });
});
