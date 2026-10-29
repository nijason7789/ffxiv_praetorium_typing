// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { state } from "../src/game/state";
import { PRAETORIUM_SCRIPT } from "../src/data/praetorium";
import { soundFX } from "../src/services/audio";
import { element } from "../src/ui/dom";
import { normalizeForCompare } from "../src/game/text";

beforeAll(async () => {
  vi.useFakeTimers();
  soundFX.enabled = false;
  const html = readFileSync("index.html", "utf8");
  document.body.innerHTML = html
    .match(/<body[^>]*>([\s\S]*)<\/body>/)![1]
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/g, '<div id="ytBgmIframe"></div>');
  await import("../src/ui/events");
  window.dispatchEvent(new Event("DOMContentLoaded"));
});

afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("modular game integration", () => {
  it("loads the three language versions from the real page", () => {
    for (const [lang, id] of [
      ["zh", "btnSelectLangZh"],
      ["jp", "btnSelectLangJp"],
      ["en", "btnSelectLangEn"],
    ] as const) {
      element(id).click();
      expect(state.lang).toBe(lang);
      expect(state.queue).toHaveLength(PRAETORIUM_SCRIPT.length);
      expect(element("typingTargetDisplay").textContent).toBe(
        lang === "zh" ? state.queue[0].text : state.queue[0][lang],
      );
      expect(element("langSelectModal").classList.contains("hidden")).toBe(
        true,
      );
    }
  });

  it("completes a typed line and advances to the next line", () => {
    element("navModeTyping").click();
    element("typingInput").value = state.queue[0].en;
    element("typingInput").dispatchEvent(new Event("input"));
    expect(state.score).toBeGreaterThan(0);
    vi.advanceTimersByTime(180);
    expect(state.currentIndex).toBe(1);
    expect(element("typingInput").value).toBe("");
  });

  it("answers a cloze question and resets through restart", () => {
    element("navModeCloze").click();
    expect(element("clozeOptionsGrid").children).toHaveLength(4);
    element("clozeInput").value = state.activeClozeBlank;
    element("btnSubmitCloze").click();
    expect(state.clozeAnswered).toBe(true);
    vi.advanceTimersByTime(650);
    expect(state.currentIndex).toBe(1);
    element("btnRestartStage").click();
    expect(state.currentIndex).toBe(0);
    expect(state.score).toBe(0);
  });

  it("switches mixed mode, archive and individual practice", () => {
    element("navModeExam").click();
    expect(element("panelStandardTyping").classList.contains("hidden")).toBe(
      false,
    );
    element("btnNextLine").click();
    expect(element("panelClozeMode").classList.contains("hidden")).toBe(false);
    element("navModeScript").click();
    expect(element("scriptArchiveContainer").children).toHaveLength(
      PRAETORIUM_SCRIPT.length,
    );
    element("scriptArchiveContainer")
      .querySelector<HTMLButtonElement>("button")!
      .click();
    expect(state.mode).toBe("typing");
    expect(element("viewGameStage").classList.contains("hidden")).toBe(false);
  });

  it("preserves terminology and English case normalization", () => {
    state.lang = "zh";
    expect(normalizeForCompare("艾奧傑亞的以太")).toBe(
      normalizeForCompare("艾歐澤亞的乙太"),
    );
    state.lang = "en";
    expect(normalizeForCompare("Fight")).toBe("fight");
  });
});
