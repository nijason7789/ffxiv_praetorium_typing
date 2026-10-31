import { describe, expect, it } from "vitest";
import { fixedMask } from "../src/game/fixed-mask";
import { SAVAGE_MASKS } from "../src/data/savage-masks";
import { PRAETORIUM_SCRIPT } from "../src/data/praetorium";

describe("Feature: 固定難度遮罩", () => {
  it("Given 多個指定詞, Then 每次產生相同遮罩並保留長度", () => {
    const rules = [
      { text: "什麼", occurrence: 0 },
      { text: "戰鬥", occurrence: 0 },
    ];
    const text = "冒險者，你是為了什麼而戰鬥的？";
    expect(fixedMask(text, "savage", rules)).toBe(
      "冒險者，你是為了＿＿而＿＿的？",
    );
    expect(fixedMask(text, "savage", rules)).toBe(
      fixedMask(text, "savage", rules),
    );
    expect(rules[0].text).toBe("什麼");
  });
  it("Given 相同詞出現兩次, Then 只遮指定的第二次", () => {
    expect(
      fixedMask("恐懼，驅散恐懼。", "savage", [
        { text: "恐懼", occurrence: 1 },
      ]),
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
    expect(() => fixedMask("AB", "savage", rules)).toThrow();
  });
  it("Given 絕, Then 只保留標點，連英文空白也遮住", () => {
    expect(fixedMask("A b，1!—'C-D'。", "ultimate")).toBe(
      "＿＿＿，＿!—'＿-＿'。",
    );
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
      const masked = fixedMask(text, "savage", rules);
      expect(masked.length).toBe(text.length);
      expect(masked).toContain("＿");
      expect(masked).not.toBe(text);
    },
  );
});
