import { afterEach, describe, expect, it } from "vitest";
import {
  normalizePunctuation,
  normalizeForCompare,
  computeEffectiveInputWithSources,
} from "../src/game/text";
import { state } from "../src/game/state";

const originalLanguage = state.lang;
afterEach(() => {
  state.lang = originalLanguage;
});

describe("Feature: 全形半形標點容錯", () => {
  it.each([
    ["，。！？：；（）［］｛｝＂＇－＿", ",.!?:;()[]{}\"'-_"],
    ["、｡､｢｣･", ",.,「」・"],
  ])("Given 標點 %s, Then 與 %s 等價且保留字元長度", (source, expected) => {
    expect(normalizePunctuation(source)).toBe(expected);
    expect(normalizePunctuation(source).length).toBe(source.length);
    expect(normalizePunctuation(expected)).toBe(expected);
  });
  it("Given 全形英數與不同標點, Then 不擴大為文字或任意符號容錯", () => {
    expect(normalizePunctuation("Ａ１　…—？")).toBe("Ａ１　…—?");
    expect(normalizeForCompare("你好！")).not.toBe(
      normalizeForCompare("你好？"),
    );
    expect(normalizeForCompare("你好。")).not.toBe(normalizeForCompare("你好"));
  });
  it("Given 英文及中文譯名, Then 保留既有大小寫與譯名容錯", () => {
    state.lang = "en";
    expect(normalizeForCompare("Fight！")).toBe(normalizeForCompare("fight!"));
    expect(normalizeForCompare("艾奧傑亞的以太。堅持裡")).toBe(
      normalizeForCompare("艾歐澤亞的乙太.堅持裏"),
    );
  });
  it("Given 自動略過標點啟用, Then 已手打的半形標點仍保留手動來源", () => {
    const difficulty = state.difficulty;
    const skipPunct = state.skipPunct;
    try {
      state.difficulty = "experience";
      state.skipPunct = true;
      expect(computeEffectiveInputWithSources("你,好!", "你，好！")).toEqual({
        text: "你,好!",
        sources: ["manual", "manual", "manual", "manual"],
      });
    } finally {
      state.difficulty = difficulty;
      state.skipPunct = skipPunct;
    }
  });
});
