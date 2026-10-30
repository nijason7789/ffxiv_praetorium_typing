// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/bgm", () => ({
  initializeBgm: vi.fn(),
  setBgmVolume: vi.fn(),
  startBgmOnLanguageSelection: vi.fn(),
  toggleBgm: vi.fn(),
}));
const click = (id: string) =>
  document.querySelector<HTMLButtonElement>("#" + id)!.click();
const toast = () => document.querySelector<HTMLElement>("#copyToastMsg")!;
const visible = () => !toast().classList.contains("hidden");
const settle = async () => {
  await vi.advanceTimersByTimeAsync(0);
};
let write: ReturnType<typeof vi.spyOn>;
let fallback: ReturnType<typeof vi.fn>;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  document.body.innerHTML = readFileSync("index.html", "utf8")
    .match(/<body[^>]*>([\s\S]*)<\/body>/)![1]
    .replace(/<script[\s\S]*?<\/script>/g, "");
  (await import("../src/services/audio")).soundFX.enabled = false;
  let initialize = () => {};
  const spy = vi
    .spyOn(window, "addEventListener")
    .mockImplementation((type, listener) => {
      if (type === "DOMContentLoaded" && typeof listener === "function")
        initialize = () => listener.call(window, new Event(type));
    });
  await import("../src/ui/events");
  spy.mockRestore();
  initialize();
  click("btnSelectLangZh");
  click("btnSelectExperience");
  write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
  fallback = vi.fn(() => true);
  Object.defineProperty(document, "execCommand", {
    configurable: true,
    value: fallback,
  });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  delete (document as Document & { execCommand?: unknown }).execCommand;
});

describe("Feature: 複製結果與提示 [DEC-08, TOOLS-04～09]", () => {
  it("When API 成功, Then 顯示成功且不走備援", async () => {
    click("btnCopyReport");
    await settle();
    expect(write).toHaveBeenCalledWith(expect.stringContaining("評級"));
    expect(fallback).not.toHaveBeenCalled();
    expect(visible()).toBe(true);
    expect(toast().textContent).toContain("已複製");
  });
  it("When API 拒絕但備援成功, Then 仍顯示成功並移除暫存輸入框", async () => {
    write.mockRejectedValue(new Error("denied"));
    click("btnCopyFullSpeech");
    await settle();
    expect(fallback).toHaveBeenCalledWith("copy");
    expect(toast().textContent).toContain("已複製");
    expect(document.querySelectorAll("textarea")).toHaveLength(0);
  });
  it("When API 缺少, Then 使用備援成功", async () => {
    write.mockRestore();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: undefined,
    });
    click("btnCopyFFMacro");
    await settle();
    expect(fallback).toHaveBeenCalledWith("copy");
    expect(toast().textContent).toContain("已複製");
    delete (navigator as Navigator & { clipboard?: unknown }).clipboard;
  });
  it.each(["false", "throw", "missing"] as const)(
    "When API 拒絕且備援 %s, Then 顯示紅色失敗而非成功",
    async (failure) => {
      write.mockRejectedValue(new Error("denied"));
      if (failure === "false") fallback.mockReturnValue(false);
      else if (failure === "throw")
        fallback.mockImplementation(() => {
          throw new Error("blocked");
        });
      else
        delete (document as Document & { execCommand?: unknown }).execCommand;
      click("btnCopyReport");
      await settle();
      expect(visible()).toBe(true);
      expect(toast().textContent).toContain("複製失敗");
      expect(toast().className).toContain("text-red-");
      expect(toast().textContent).not.toContain("已複製");
      expect(document.querySelectorAll("textarea")).toHaveLength(0);
    },
  );
  it("When API 同步拋錯, Then 仍可透過備援完成", async () => {
    write.mockImplementation(() => {
      throw new Error("sync failure");
    });
    expect(() => click("btnCopyFullSpeech")).not.toThrow();
    await settle();
    expect(fallback).toHaveBeenCalledWith("copy");
    expect(toast().textContent).toContain("已複製");
  });
  it("When 兩次成功相隔兩秒, Then 從最後成功重新顯示三秒", async () => {
    click("btnCopyReport");
    await settle();
    vi.advanceTimersByTime(2000);
    click("btnCopyReport");
    await settle();
    vi.advanceTimersByTime(1000);
    expect(visible()).toBe(true);
    vi.advanceTimersByTime(1999);
    expect(visible()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(visible()).toBe(false);
  });
  it("Given API 延遲完成, Then 提示三秒從成功時開始而非點擊時", async () => {
    let complete = () => {};
    write.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    click("btnCopyReport");
    vi.advanceTimersByTime(5000);
    expect(visible()).toBe(false);
    complete();
    await settle();
    expect(visible()).toBe(true);
    vi.advanceTimersByTime(2999);
    expect(visible()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(visible()).toBe(false);
  });
  it("When 舊請求晚於新請求完成, Then 不覆蓋新操作的提示", async () => {
    let complete = () => {};
    write.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    click("btnCopyFullSpeech");
    click("btnCopyFFMacro");
    await settle();
    expect(toast().textContent).toContain("巨集");
    complete();
    await settle();
    expect(toast().textContent).toContain("巨集");
  });
  it("When 成功後失敗再重試成功, Then 最新提示的文字與顏色正確", async () => {
    click("btnCopyReport");
    await settle();
    write.mockRejectedValueOnce(new Error("denied"));
    fallback.mockReturnValue(false);
    click("btnCopyReport");
    await settle();
    expect(toast().textContent).toContain("複製失敗");
    expect(toast().className).toContain("text-red-");
    click("btnCopyReport");
    await settle();
    expect(toast().textContent).toContain("已複製");
    expect(toast().className).toContain("text-emerald-");
    expect(toast().className).not.toContain("text-red-");
  });
  it("When 備援複製, Then 傳入文字正確並恢復原輸入焦點及選取", async () => {
    write.mockRejectedValue(new Error("denied"));
    const input = document.querySelector<HTMLInputElement>("#typingInput")!;
    input.value = "ABCDE";
    input.focus();
    input.setSelectionRange(1, 3);
    let copiedText = "";
    fallback.mockImplementation(() => {
      copiedText = (document.activeElement as HTMLTextAreaElement).value;
      return true;
    });
    click("btnCopyReport");
    await settle();
    expect(copiedText).toContain("評級");
    expect(document.activeElement).toBe(input);
    expect(input.selectionStart).toBe(1);
    expect(input.selectionEnd).toBe(3);
  });
  it.each(["btnCopyReport", "btnCopyFullSpeech", "btnCopyFFMacro"])(
    "When %s 最終失敗, Then 共用畫面下方的可讀失敗提示",
    async (id) => {
      write.mockRejectedValue(new Error("denied"));
      fallback.mockReturnValue(false);
      click(id);
      await settle();
      expect(toast().textContent).toContain("複製失敗");
      expect(toast().closest("#stageCompleteModal, #viewScriptArchive")).toBe(
        null,
      );
      expect(toast().getAttribute("role")).toBe("status");
    },
  );
});
