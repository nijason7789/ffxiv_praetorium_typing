// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
let mount: (typeof import("../src/ui/memory-prototype"))["mountMemoryPrototype"];
const node = (id: string) => document.getElementById(id)!;
const input = () => node("memoryInput") as HTMLInputElement;
const click = (id: string) => (node(id) as HTMLButtonElement).click();
function type(value: string) {
  input().value = value;
  input().dispatchEvent(new Event("input"));
}
beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="app"></div>';
  mount = (await import("../src/ui/memory-prototype")).mountMemoryPrototype;
  mount();
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});
describe("Feature: 零式／絕單句原型", () => {
  it.each(["savage", "ultimate"])(
    "[INPUT-16] Given %s, Then 貼上與拖放被阻擋，重開清除提示，手打仍可完成",
    (difficulty) => {
      const select = node("memoryDifficulty") as HTMLSelectElement;
      select.value = difficulty;
      select.dispatchEvent(new Event("change"));
      click("memoryStart");
      for (const kind of ["paste", "drop"]) {
        expect(
          input().dispatchEvent(new Event(kind, { cancelable: true })),
        ).toBe(false);
        expect(input().value).toBe("");
        expect(node("memoryStats").textContent).toContain("分數 0");
      }
      expect(node("inputRestrictionNotice").classList.contains("hidden")).toBe(
        false,
      );
      click("memoryRestart");
      expect(node("inputRestrictionNotice").classList.contains("hidden")).toBe(
        true,
      );
      type("冒險者，你是為了什麼而戰鬥的？");
      expect(node("memoryResult").textContent).toContain("本句完成");
      input().dispatchEvent(new Event("paste", { cancelable: true }));
      expect(node("inputRestrictionNotice").classList.contains("hidden")).toBe(
        true,
      );
    },
  );
  it("When 開局, Then 保留題目識別並鎖定語言與開局題目，沒有輔助導覽", () => {
    click("memoryStart");
    expect((node("memoryQuestion") as HTMLSelectElement).disabled).toBe(true);
    expect(node("memoryContext").textContent).toContain("第 1 / 1 題");
    for (const id of [
      "btnAutoFillWord",
      "btnClozeHint",
      "btnNextLine",
      "btnPrevLine",
      "navModeScript",
      "rpgChoicesContainer",
    ])
      expect(document.getElementById(id)).toBe(null);
  });
  it("When 僅輸入挖空詞, Then 不完成；完整原句才完成且保留遮罩", () => {
    click("memoryStart");
    const mask = node("memoryTarget").textContent;
    type("什麼戰鬥");
    expect(node("memoryResult").textContent).toBe("");
    type("冒險者，你是為了什麼而戰鬥的？");
    expect(node("memoryResult").textContent).toContain("本句完成");
    expect(input().disabled).toBe(true);
    expect(node("memoryTarget").textContent).toBe(mask);
  });
  it("Given 中文組字中, Then 不判錯且確認後才計分", () => {
    click("memoryStart");
    input().dispatchEvent(new CompositionEvent("compositionstart"));
    type("冒險者，你是為了什麼而戰鬥的？");
    expect(node("memoryStats").textContent).toContain("分數 0");
    expect(node("memoryResult").textContent).toBe("");
    input().dispatchEvent(new CompositionEvent("compositionend"));
    expect(node("memoryResult").textContent).toContain("本句完成");
  });
  it("When 重新開始, Then 同一固定遮罩不變，分數與組字狀態重設", () => {
    click("memoryStart");
    const mask = node("memoryTarget").textContent;
    type("冒險者");
    input().dispatchEvent(new CompositionEvent("compositionstart"));
    click("memoryRestart");
    expect(input().value).toBe("");
    expect(node("memoryStats").textContent).toContain("分數 0");
    expect(node("memoryIme").classList.contains("hidden")).toBe(true);
    expect(node("memoryTarget").textContent).toBe(mask);
  });
  it("When 改成絕, Then 保留文字線索並要求完整標點作答", () => {
    const difficulty = node("memoryDifficulty") as HTMLSelectElement;
    difficulty.value = "ultimate";
    difficulty.dispatchEvent(new Event("change"));
    expect(node("memoryTarget").textContent).toBe(
      "冒險者，＿＿＿＿＿＿而＿＿的？",
    );
    click("memoryStart");
    type("冒險者你是為了什麼而戰鬥的");
    expect(node("memoryResult").textContent).toBe("");
    type("冒險者，你是為了什麼而戰鬥的？");
    expect(node("memoryResult").textContent).toContain("完成 1 / 1 題");
    const mask = node("memoryTarget").textContent;
    click("memoryRestart");
    expect(node("memoryTarget").textContent).toBe(mask);
  });
});
