// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { element } from "../src/ui/dom";

let bgm: typeof import("../src/services/bgm");
let audio: HTMLAudioElement;
let paused: boolean;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  const html = readFileSync("index.html", "utf8");
  document.body.innerHTML = html
    .match(/<body[^>]*>([\s\S]*)<\/body>/)![1]
    .replace(/<script[\s\S]*?<\/script>/g, "");
  audio = element("bgmAudio");
  paused = true;
  Object.defineProperty(audio, "paused", {
    configurable: true,
    get: () => paused,
  });
  vi.spyOn(audio, "play").mockImplementation(() => {
    paused = false;
    return Promise.resolve();
  });
  vi.spyOn(audio, "pause").mockImplementation(() => {
    paused = true;
    audio.dispatchEvent(new Event("pause"));
  });
  vi.spyOn(audio, "load").mockImplementation(() => {});
  bgm = await import("../src/services/bgm");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllTimers();
  vi.useRealTimers();
});

it("prepares the supplied local track with looping and 25% volume without autoplay", () => {
  bgm.initializeBgm();
  expect(audio.getAttribute("src")).toBe(
    "/audio/BGM_ORCH_570-天幕之下.ogg.mp3",
  );
  expect(audio.loop).toBe(true);
  expect(audio.volume).toBe(0.25);
  expect(audio.play).not.toHaveBeenCalled();
});

it("requests playback synchronously on selection and confirms it using media events", async () => {
  bgm.startBgmOnLanguageSelection();
  expect(audio.play).toHaveBeenCalledOnce();
  await Promise.resolve();
  expect(element("btnToggleBgm").textContent).toContain("載入中");
  audio.dispatchEvent(new Event("playing"));
  expect(element("btnToggleBgm").getAttribute("aria-pressed")).toBe("true");
  bgm.startBgmOnLanguageSelection();
  expect(audio.play).toHaveBeenCalledOnce();
  vi.advanceTimersByTime(16000);
  expect(element("bgmEngineStatus").textContent).toContain("循環播放中");
});

it("preserves pause on language changes and resumes at the same position", () => {
  bgm.startBgmOnLanguageSelection();
  audio.dispatchEvent(new Event("playing"));
  audio.currentTime = 12;
  bgm.toggleBgm();
  expect(audio.pause).toHaveBeenCalledOnce();
  bgm.startBgmOnLanguageSelection();
  expect(audio.play).toHaveBeenCalledOnce();
  bgm.toggleBgm();
  expect(audio.play).toHaveBeenCalledTimes(2);
  expect(audio.currentTime).toBe(12);
  expect(audio.load).not.toHaveBeenCalled();
});

it("offers retry when browser policy rejects playback", async () => {
  vi.mocked(audio.play).mockRejectedValueOnce(
    new DOMException("blocked", "NotAllowedError"),
  );
  bgm.startBgmOnLanguageSelection();
  await Promise.resolve();
  expect(element("bgmEngineStatus").textContent).toContain("阻擋");
  expect(element("btnToggleBgm").getAttribute("aria-pressed")).toBe("false");
  bgm.toggleBgm();
  expect(audio.play).toHaveBeenCalledTimes(2);
});

it("ignores a cancelled play rejection after a newer request", async () => {
  let rejectFirst!: (reason: unknown) => void;
  vi.mocked(audio.play).mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        rejectFirst = reject;
      }),
  );
  bgm.startBgmOnLanguageSelection();
  bgm.toggleBgm();
  bgm.toggleBgm();
  audio.dispatchEvent(new Event("playing"));
  rejectFirst(new DOMException("cancelled", "AbortError"));
  await Promise.resolve();
  expect(element("bgmEngineStatus").textContent).toContain("循環播放中");
});

it("cancels a pending start and pauses a late playing event", () => {
  bgm.startBgmOnLanguageSelection();
  bgm.toggleBgm();
  audio.dispatchEvent(new Event("playing"));
  vi.advanceTimersByTime(16000);
  expect(paused).toBe(true);
  expect(element("bgmEngineStatus").textContent).toContain("已暫停");
});

it("reports media errors and reloads the source only for recovery", () => {
  bgm.startBgmOnLanguageSelection();
  Object.defineProperty(audio, "error", {
    configurable: true,
    value: { code: 4 },
  });
  audio.dispatchEvent(new Event("error"));
  expect(element("bgmEngineStatus").textContent).toContain("載入失敗");
  bgm.toggleBgm();
  expect(audio.load).toHaveBeenCalledOnce();
});

it("times out a stuck load without claiming playback has started", () => {
  bgm.startBgmOnLanguageSelection();
  vi.advanceTimersByTime(15000);
  expect(paused).toBe(true);
  expect(element("bgmEngineStatus").textContent).toContain("尚未開始播放");
  bgm.toggleBgm();
  expect(audio.play).toHaveBeenCalledTimes(2);
});

it("changes volume without restarting or changing playback position", () => {
  bgm.initializeBgm();
  audio.currentTime = 20;
  bgm.setBgmVolume(0.25);
  expect(audio.volume).toBe(0.25);
  expect(element("bgmVolumeValue").textContent).toBe("25%");
  bgm.setBgmVolume(0);
  expect(audio.volume).toBe(0);
  expect(audio.currentTime).toBe(20);
  expect(audio.play).not.toHaveBeenCalled();
});
