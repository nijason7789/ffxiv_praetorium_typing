// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/bgm", () => ({
  initializeBgm: vi.fn(),
  setBgmVolume: vi.fn(),
  startBgmOnLanguageSelection: vi.fn(),
  toggleBgm: vi.fn(),
}));
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Feature: 頁面元件組裝", () => {
  it("When 組裝頁面, Then 元件完整、ID 不重複且保留選擇頁所需層級", async () => {
    const { mountPage } = await import("../src/ui/page");
    const { assertRequiredElements } =
      await import("../src/ui/required-elements");
    mountPage();
    expect(() => assertRequiredElements()).not.toThrow();
    const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.querySelector("body > header")).not.toBe(null);
    expect(
      document.querySelector(
        "body > main > #viewGameStage #panelStandardTyping",
      ),
    ).not.toBe(null);
    expect(document.querySelector("body > footer")).not.toBe(null);
    expect(document.querySelector("#app")).toBe(null);
    expect(document.body.innerHTML).not.toContain("<!-- component:");
  });
  it.each(["/", "/ffxiv_praetorium_typing/", "./"])(
    "Given 部署路徑 %s, Then 圖片與 BGM 使用該路徑",
    async (base) => {
      const { mountPage } = await import("../src/ui/page");
      mountPage(base);
      expect(document.querySelector("img")!.getAttribute("src")).toBe(
        base + "images/scene-1.jpg",
      );
      expect(document.querySelector("#bgmAudio")!.getAttribute("src")).toBe(
        base + "audio/BGM_ORCH_570-天幕之下.ogg.mp3",
      );
      expect(document.querySelector("[data-public-src]")).toBe(null);
    },
  );
  it("When 從正式啟動入口載入, Then 先組裝才可選語言、難度與作答", async () => {
    (await import("../src/services/audio")).soundFX.enabled = false;
    const { bootstrap } = await import("../src/ui/bootstrap");
    bootstrap();
    document.querySelector<HTMLButtonElement>("#btnSelectLangEn")!.click();
    document.querySelector<HTMLButtonElement>("#btnSelectChallenge")!.click();
    const input = document.querySelector<HTMLInputElement>("#typingInput")!;
    input.value = "Te";
    input.dispatchEvent(new Event("input"));
    expect(document.querySelector("#statScore")!.textContent).toBe("50");
    expect(document.querySelector("#pageErrorView")).toBe(null);
    expect(document.querySelector<HTMLElement>("body > main")!.inert).toBe(
      false,
    );
  });
  it("When 重複呼叫事件初始化, Then 不清空作答或重複綁定換題", async () => {
    (await import("../src/services/audio")).soundFX.enabled = false;
    const { bootstrap } = await import("../src/ui/bootstrap");
    const { initializeApp } = await import("../src/ui/events");
    bootstrap();
    document.querySelector<HTMLButtonElement>("#btnSelectLangEn")!.click();
    document.querySelector<HTMLButtonElement>("#btnSelectChallenge")!.click();
    const input = document.querySelector<HTMLInputElement>("#typingInput")!;
    input.value = "Te";
    input.dispatchEvent(new Event("input"));
    initializeApp();
    initializeApp();
    expect(input.value).toBe("Te");
    expect(document.querySelector("#statScore")!.textContent).toBe("50");
    document.querySelector<HTMLButtonElement>("#btnNextLine")!.click();
    expect(document.querySelector("#stageStepCounter")!.textContent).toBe(
      "(2 / 17)",
    );
  });
});
