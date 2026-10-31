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
const click = (id: string) => node(id).click();
const input = () => node("typingInput") as HTMLInputElement;
function type(value: string) {
  input().value = value;
  input().dispatchEvent(new Event("input"));
}
async function game() {
  const { state } = await import("../src/game/state");
  const { getLinePrimaryText } = await import("../src/game/text");
  return {
    state,
    answer: () => getLinePrimaryText(state.queue[state.currentIndex]),
  };
}
function choose(
  difficulty: "Savage" | "Ultimate" | "Challenge" | "Experience",
) {
  click("btnOpenDifficultyModal");
  click("btnSelect" + difficulty);
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

describe("Feature: 正式零式／絕固定場次", () => {
  it.each(["zh", "jp", "en"] as const)(
    "Given %s, Then 兩種難度皆依序通過五句並鎖定結算",
    async (language) => {
      const { state, answer } = await game();
      state.lang = language;
      for (const difficulty of ["Savage", "Ultimate"] as const) {
        choose(difficulty);
        expect(state.queue.map((line) => line.id)).toEqual([
          "L01",
          "L02",
          "L03",
          "L05",
          "L07",
        ]);
        expect(node("stageStepCounter").textContent).toBe("(1 / 5)");
        for (let index = 0; index < 5; index++) {
          const mask = node("typingTargetDisplay").textContent;
          type(answer());
          expect(node("typingTargetDisplay").textContent).toBe(mask);
          vi.advanceTimersByTime(180);
          expect(state.currentIndex).toBe(index + 1);
        }
        expect(state.result).toMatchObject({
          difficulty: difficulty.toLowerCase(),
          total: 5,
          completed: 5,
          completionRate: 100,
          accuracy: 100,
          hasUsedAssistance: false,
        });
        expect(node("finalAssistanceStatus").textContent).toBe(
          `${difficulty === "Savage" ? "零式" : "絕"}模式・未使用輔助`,
        );
        const result = state.result;
        type("完成後輸入");
        expect(state.result).toBe(result);
        expect(input().disabled).toBe(true);
      }
    },
  );

  it.each(["Savage", "Ultimate"] as const)(
    "Given %s, Then 輔助及導覽隱藏，舊按鈕事件不能跳題或洩漏台詞",
    async (difficulty) => {
      choose("Experience");
      const rpg = node("rpgChoicesContainer").querySelector("button")!;
      choose(difficulty);
      const { state } = await game();
      const mask = node("typingTargetDisplay").textContent;
      for (const id of [
        "btnAutoFillWord",
        "typingAssistChips",
        "btnPrevLine",
        "btnNextLine",
        "navModeCloze",
        "navModeExam",
        "navModeScript",
        "chapterSelectorBar",
        "subtitlesBox",
        "rpgPromptCard",
      ]) {
        expect(node(id).classList.contains("hidden")).toBe(true);
      }
      for (const id of [
        "btnAutoFillWord",
        "btnPrevLine",
        "btnNextLine",
        "navModeCloze",
        "navModeExam",
        "navModeScript",
        "btnRerollCloze",
        "btnClozeHint",
      ])
        click(id);
      (
        document.querySelector('[data-act="act4"]') as HTMLButtonElement
      ).click();
      rpg.click();
      expect(state.mode).toBe("typing");
      expect(state.currentIndex).toBe(0);
      expect(state.score).toBe(0);
      expect(input().value).toBe("");
      expect(node("typingTargetDisplay").textContent).toBe(mask);
      expect(node("jpSubtitleText").textContent).toBe("");
      expect(node("quickPhraseChips").childElementCount).toBe(0);
    },
  );

  it("Given 先前啟用略過標點與字幕, Then 高難度仍須完整標點，返回挑戰恢復設定", async () => {
    const { state, answer } = await game();
    state.skipPunct = true;
    state.showSubtitles = true;
    choose("Ultimate");
    expect((node("chkSkipPunct") as HTMLInputElement).checked).toBe(false);
    type(answer().replace(/[，？]/g, ""));
    vi.advanceTimersByTime(300);
    expect(state.currentIndex).toBe(0);
    choose("Challenge");
    expect((node("chkSkipPunct") as HTMLInputElement).checked).toBe(true);
    expect(node("subtitlesBox").classList.contains("hidden")).toBe(false);
    click("navModeCloze");
    expect(node("clozeOptionsGrid").children.length).toBeGreaterThan(0);
    expect(
      node("btnClozeHint")
        .closest("#panelClozeMode")
        ?.classList.contains("hidden"),
    ).toBe(false);
  });

  it("Given 組字尚未確認, Then 不計分，確認後才排程自動換題", async () => {
    choose("Savage");
    const { state, answer } = await game();
    input().dispatchEvent(new CompositionEvent("compositionstart"));
    type(answer());
    vi.advanceTimersByTime(200);
    expect(state.score).toBe(0);
    expect(state.currentIndex).toBe(0);
    input().dispatchEvent(new CompositionEvent("compositionend"));
    vi.advanceTimersByTime(180);
    expect(state.currentIndex).toBe(1);
    expect(state.isComposing).toBe(false);
  });

  it("Given 已答對等待換題, Then 切換難度或重開取消舊計時器且遮罩固定", async () => {
    choose("Savage");
    const { state, answer } = await game();
    type(answer());
    choose("Ultimate");
    const mask = node("typingTargetDisplay").textContent;
    vi.advanceTimersByTime(300);
    expect(state.currentIndex).toBe(0);
    type(answer());
    click("btnRestartStage");
    vi.advanceTimersByTime(300);
    expect(state.currentIndex).toBe(0);
    expect(state.score).toBe(0);
    expect(state.result).toBe(null);
    expect(node("typingTargetDisplay").textContent).toBe(mask);
  });

  it("Given 中文替代譯名, Then L02 遮罩及完整台詞判定使用一致譯名", async () => {
    const { state, answer } = await game();
    state.useAltTerm = true;
    choose("Ultimate");
    type(answer());
    vi.advanceTimersByTime(180);
    expect(state.queue[state.currentIndex].id).toBe("L02");
    expect(node("typingTargetDisplay").textContent).toContain("＿");
    type(answer());
    vi.advanceTimersByTime(180);
    expect(state.currentIndex).toBe(2);
  });
});
