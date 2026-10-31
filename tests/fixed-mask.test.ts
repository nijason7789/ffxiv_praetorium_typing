import { describe, expect, it } from "vitest";
import { fixedMask } from "../src/game/fixed-mask";
import { SAVAGE_MASKS } from "../src/data/savage-masks";
import { ULTIMATE_MASKS } from "../src/data/ultimate-masks";
import { PRAETORIUM_SCRIPT } from "../src/data/praetorium";

describe("Feature: 固定難度遮罩", () => {
  it("Given 天幕魔導城題庫, Then 只保留 L01 至 L17 並在第三幕結束", () => {
    expect(PRAETORIUM_SCRIPT.map((line) => line.id)).toEqual(
      Array.from(
        { length: 17 },
        (_, index) => `L${String(index + 1).padStart(2, "0")}`,
      ),
    );
    expect([...new Set(PRAETORIUM_SCRIPT.map((line) => line.act))]).toEqual([
      "act1",
      "act2",
      "act3",
    ]);
    expect(PRAETORIUM_SCRIPT.at(-1)?.act).toBe("act3");
  });
  it("Given 完整台詞題庫, Then 三語零式與絕的設定涵蓋所有題目且無額外題號", () => {
    const ids = PRAETORIUM_SCRIPT.map((line) => line.id).sort();
    expect(Object.keys(SAVAGE_MASKS).sort()).toEqual(ids);
    expect(Object.keys(ULTIMATE_MASKS).sort()).toEqual(ids);
  });
  it("Given 多個指定詞, Then 每次產生相同遮罩並保留長度", () => {
    const rules = [
      { text: "什麼", occurrence: 0 },
      { text: "戰鬥", occurrence: 0 },
    ];
    const text = "冒險者，你是為了什麼而戰鬥的？";
    expect(fixedMask(text, rules)).toBe("冒險者，你是為了＿＿而＿＿的？");
    expect(fixedMask(text, rules)).toBe(fixedMask(text, rules));
    expect(rules[0].text).toBe("什麼");
  });
  it("Given 相同詞出現兩次, Then 只遮指定的第二次", () => {
    expect(
      fixedMask("恐懼，驅散恐懼。", [{ text: "恐懼", occurrence: 1 }]),
    ).toBe("恐懼，驅散＿＿。");
  });
  it.each(
    [
      [],
      [{ text: "", occurrence: 0 }],
      [{ text: "A", occurrence: -1 }],
      [{ text: "A", occurrence: 0.5 }],
      [{ text: "X", occurrence: 0 }],
      [{ text: "A", occurrence: 1 }],
      [
        { text: "AB", occurrence: 0 },
        { text: "B", occurrence: 0 },
      ],
    ].map((rules) => ({ rules })),
  )("Given 無效規則 $rules, Then 明確失敗而非顯示完整答案", ({ rules }) => {
    expect(() => fixedMask("AB", rules)).toThrow();
  });
  const cases = Object.entries(SAVAGE_MASKS).flatMap(([id, languages]) =>
    (["zh", "jp", "en"] as const).map((language) => ({
      id,
      language,
      rules: languages[language],
    })),
  );
  it.each(cases)(
    "Given $id/$language 草稿, Then 規則有效且不改變台詞或長度",
    ({ id, language, rules }) => {
      const line = PRAETORIUM_SCRIPT.find((item) => item.id === id)!;
      const text = language === "zh" ? line.text : line[language];
      const masked = fixedMask(text, rules);
      expect(masked.length).toBe(text.length);
      expect(masked).toContain("＿");
      expect(masked).not.toBe(text);
    },
  );
  it.each(cases)(
    "Given $id/$language, Then 絕包含零式遮罩並增加固定空格，每個分句保留文字",
    ({ id, language, rules }) => {
      const line = PRAETORIUM_SCRIPT.find((item) => item.id === id)!;
      const text = language === "zh" ? line.text : line[language];
      const savage = fixedMask(text, rules);
      const ultimate = fixedMask(text, ULTIMATE_MASKS[id][language]);
      expect(ultimate.length).toBe(text.length);
      expect(ultimate.split("＿").length).toBeGreaterThan(
        savage.split("＿").length,
      );
      for (let index = 0; index < text.length; index++) {
        if (savage[index] === "＿") expect(ultimate[index]).toBe("＿");
        if (/\p{P}/u.test(savage[index]))
          expect(ultimate[index]).toBe(savage[index]);
      }
      for (const clause of ultimate.split(/[，、。！？,.!?—]/u)) {
        if (clause.includes("＿")) expect(clause).toMatch(/[\p{L}\p{N}]/u);
      }
      expect(fixedMask(text, ULTIMATE_MASKS[id][language])).toBe(ultimate);
    },
  );
});
