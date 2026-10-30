// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ScriptLine } from "../src/game/types";

let game: typeof import("../src/game/app");
let state: (typeof import("../src/game/state"))["state"];
let media: HTMLAudioElement;
const click = (id: string) =>
  document.querySelector<HTMLButtonElement>("#" + id)!.click();
function line(id: string): ScriptLine {
  return {
    id,
    text: "AB",
    jp: "AB",
    en: "AB",
    act: "act1",
    speaker: { zh: "蓋烏斯", jp: "Gaius", en: "Gaius" },
    actTitle: { zh: "第一幕", jp: "Act 1", en: "Act 1" },
    clozePool: { zh: ["AB"], jp: ["AB"], en: ["AB"] },
  };
}
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  document.body.innerHTML = readFileSync("index.html", "utf8")
    .match(/<body[^>]*>([\s\S]*)<\/body>/)![1]
    .replace(/<script[\s\S]*?<\/script>/g, "");
  media = document.querySelector<HTMLAudioElement>("#bgmAudio")!;
  let paused = true;
  Object.defineProperty(media, "paused", {
    configurable: true,
    get: () => paused,
  });
  vi.spyOn(media, "play").mockImplementation(() => {
    paused = false;
    media.dispatchEvent(new Event("playing"));
    return Promise.resolve();
  });
  vi.spyOn(media, "pause").mockImplementation(() => {
    paused = true;
  });
  state = (await import("../src/game/state")).state;
  game = await import("../src/game/app");
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
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Feature: 音效錯誤不阻止遊戲或 BGM [DEC-11]", () => {
  it.each(["constructor", "resume", "rejection", "nodes"] as const)(
    "Given %s 失敗, Then 選難度、打字、填空與結算仍可完成且 BGM 持續播放",
    async (failure) => {
      const constructor = vi.fn(function () {
        if (failure === "constructor")
          throw new Error("AudioContext unavailable");
        return {
          state: failure === "nodes" ? "running" : "suspended",
          resume: () => {
            if (failure === "resume") throw new Error("resume blocked");
            return Promise.reject(new Error("resume denied"));
          },
          createOscillator: () => {
            throw new Error("oscillator failed");
          },
        };
      });
      vi.stubGlobal("AudioContext", constructor);
      click("btnSelectLangEn");
      click("btnSelectExperience");
      expect(
        document
          .querySelector("#difficultySelectModal")!
          .classList.contains("hidden"),
      ).toBe(true);
      expect(media.paused).toBe(false);
      expect(media.volume).toBe(0.25);
      game.startNewSession([line("one"), line("two")]);
      const input = document.querySelector<HTMLInputElement>("#typingInput")!;
      input.value = "AX";
      input.dispatchEvent(new Event("input"));
      expect(state.errorCount).toBe(1);
      input.value = "AB";
      input.dispatchEvent(new Event("input"));
      vi.advanceTimersByTime(180);
      expect(state.currentIndex).toBe(1);
      expect(state.score).toBe(150);
      click("navModeCloze");
      game.startNewSession([line("one")]);
      document.querySelector<HTMLInputElement>("#clozeInput")!.value = "AB";
      click("btnSubmitCloze");
      vi.advanceTimersByTime(650);
      expect(
        document
          .querySelector("#stageCompleteModal")!
          .classList.contains("hidden"),
      ).toBe(false);
      expect(document.querySelector("#finalScoreVal")!.textContent).toBe("200");
      expect(document.querySelector("#finalAccVal")!.textContent).toBe("100%");
      click("btnToggleSound");
      expect(document.querySelector("#btnToggleSound")!.textContent).toContain(
        "靜音",
      );
      expect(media.paused).toBe(false);
      expect(media.pause).not.toHaveBeenCalled();
      expect(media.play).toHaveBeenCalledTimes(1);
      expect(constructor).toHaveBeenCalled();
      await Promise.resolve();
    },
  );
});
