// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountPageFixture } from "./helpers/page";
import { PRAETORIUM_SCRIPT } from "../src/data/praetorium";

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
  it("Given 繁中預設譯名, When 切換譯名再切回, Then 艾奧傑亞與艾歐澤亞的顯示反向切換且不改寫題庫", async () => {
    choose("Experience");
    const { state } = await game();
    expect(state.useAltTerm).toBe(false);
    expect(node("termLabel").textContent).toBe("艾奧傑亞");
    expect(node("rpgChoicesContainer").textContent).toContain("為了艾奧傑亞");
    click("btnNextLine");
    const original = state.queue[1].text;
    expect(original).toContain("艾奧傑亞");
    expect(node("typingTargetDisplay").textContent).toContain("艾奧傑亞");
    click("btnToggleTerm");
    expect(state.useAltTerm).toBe(true);
    expect(node("termLabel").textContent).toBe("艾歐澤亞");
    expect(node("typingTargetDisplay").textContent).toContain("艾歐澤亞");
    expect(node("rpgPromptQuestion").textContent).toContain("艾歐澤亞");
    expect(state.queue[1].text).toBe(original);
    click("btnToggleTerm");
    expect(state.useAltTerm).toBe(false);
    expect(node("termLabel").textContent).toBe("艾奧傑亞");
    expect(node("typingTargetDisplay").textContent).toContain("艾奧傑亞");
    type(original.replaceAll("艾奧傑亞", "艾歐澤亞"));
    expect(state.errorCount).toBe(0);
    vi.advanceTimersByTime(180);
    expect(state.currentIndex).toBe(2);
  });
  it.each(
    (["Experience", "Challenge"] as const).flatMap((choice) =>
      (["Typing", "Cloze", "Exam"] as const).map((mode) => ({ choice, mode })),
    ),
  )(
    "Given $choice/$mode, Then 第三幕末句作答後直接結算，全文也只保留十七句",
    async ({ choice, mode }) => {
      choose(choice);
      expect(document.querySelector('[data-act="act4"]')).toBe(null);
      click("navModeScript");
      expect(node("scriptArchiveContainer").children.length).toBe(17);
      expect(document.querySelector('[data-jump-idx="17"]')).toBe(null);
      click("navMode" + mode);
      const { state, answer } = await game();
      expect(state.queue).toHaveLength(17);
      for (let index = 0; index < 16; index++) click("btnNextLine");
      expect(state.queue[state.currentIndex].id).toBe("L17");
      if (mode === "Cloze") {
        (node("clozeInput") as HTMLInputElement).value = state.activeClozeBlank;
        click("btnSubmitCloze");
      } else type(answer());
      vi.advanceTimersByTime(650);
      expect(state.currentIndex).toBe(17);
      expect(state.result).toMatchObject({ total: 17, completed: 1 });
      expect(node("stageCompleteModal").classList.contains("hidden")).toBe(
        false,
      );
    },
  );
  it.each([
    { choice: "Experience", label: "體驗", assists: true, standard: true },
    { choice: "Challenge", label: "普通", assists: false, standard: true },
    { choice: "Savage", label: "零式", assists: false, standard: false },
    { choice: "Ultimate", label: "絕", assists: false, standard: false },
  ] as const)(
    "Given $label, Then 畫面權限與操作限制一致，切換後恢復對應功能",
    async ({ choice, label, assists, standard }) => {
      choose("Ultimate");
      choose(choice);
      const { state } = await game();
      expect(node("currentDifficultyBadge").textContent).toBe(label);
      expect(node("btnAutoFillWord").classList.contains("hidden")).toBe(
        !assists,
      );
      expect(node("typingAssistChips").classList.contains("hidden")).toBe(
        !assists,
      );
      for (const id of [
        "navModeCloze",
        "navModeExam",
        "navModeScript",
        "btnPrevLine",
        "btnNextLine",
        "chapterSelectorBar",
        "rpgPromptCard",
        "subtitlesBox",
      ]) {
        expect(node(id).classList.contains("hidden")).toBe(!standard);
      }
      click("btnAutoFillWord");
      expect(input().value.length > 0).toBe(assists);
      click("navModeCloze");
      expect(state.mode).toBe(standard ? "cloze" : "typing");
      if (standard) {
        expect(node("clozeOptionsGrid").childElementCount).toBeGreaterThan(0);
        click("btnClozeHint");
        expect(
          (node("clozeInput") as HTMLInputElement).value.length,
        ).toBeGreaterThan(0);
      }
    },
  );
  it.each(["Savage", "Ultimate"] as const)(
    "Given %s, When 使用半形逗號問號作答, Then 不計錯且維持完整計分與換題",
    async (difficulty) => {
      choose(difficulty);
      const { state, answer } = await game();
      const target = answer();
      type(target.replaceAll("，", ",").replaceAll("？", "?"));
      expect(state.errorCount).toBe(0);
      expect(state.correctChars).toBe(target.length);
      expect(state.combo).toBe(target.length);
      expect(state.hasUsedAssistance).toBe(false);
      vi.advanceTimersByTime(180);
      expect(state.currentIndex).toBe(1);
    },
  );
  it.each(["zh", "jp", "en"] as const)(
    "Given %s, Then 兩種難度皆依序通過完整三章題庫並鎖定結算",
    async (language) => {
      const { state, answer } = await game();
      state.lang = language;
      for (const difficulty of ["Savage", "Ultimate"] as const) {
        choose(difficulty);
        expect(state.queue.map((line) => line.id)).toEqual(
          PRAETORIUM_SCRIPT.map((line) => line.id),
        );
        expect(new Set(state.queue.map((line) => line.act)).size).toBe(3);
        const total = PRAETORIUM_SCRIPT.length;
        expect(node("stageStepCounter").textContent).toBe(`(1 / ${total})`);
        for (let index = 0; index < total; index++) {
          const mask = node("typingTargetDisplay").textContent;
          type(answer());
          expect(node("typingTargetDisplay").textContent).toBe(mask);
          vi.advanceTimersByTime(180);
          expect(state.currentIndex).toBe(index + 1);
        }
        expect(state.result).toMatchObject({
          difficulty: difficulty.toLowerCase(),
          total,
          completed: total,
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
        document.querySelector('[data-act="act3"]') as HTMLButtonElement
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

  it("Given 先前啟用略過標點與字幕, Then 高難度仍須完整標點，返回普通恢復設定", async () => {
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

  it("Given 中文替代譯名, Then 完整題庫的遮罩及作答判定使用一致譯名", async () => {
    const { state, answer } = await game();
    state.useAltTerm = true;
    for (const difficulty of ["Savage", "Ultimate"] as const) {
      choose(difficulty);
      for (const line of PRAETORIUM_SCRIPT) {
        expect(state.queue[state.currentIndex].id).toBe(line.id);
        expect(node("typingTargetDisplay").textContent).toContain("＿");
        expect(node("typingTargetDisplay").textContent).not.toContain(
          "艾奧傑亞",
        );
        type(answer());
        vi.advanceTimersByTime(180);
      }
      expect(state.result?.completed).toBe(PRAETORIUM_SCRIPT.length);
    }
  });
});
