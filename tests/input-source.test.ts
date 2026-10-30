import { describe, expect, it } from "vitest";
import { createScoringState, scoreTyping } from "../src/game/scoring";
import { reconcileInputSources } from "../src/game/input-source";

describe("Feature: 輸入來源 [Q19, Q26]", () => {
  it("Given 體驗輔助, When 補入正確文字, Then 給分與 Combo 但不計手動字數", () => {
    const result = scoreTyping(createScoringState(), {
      questionId: "one",
      target: "ABCD",
      input: "AB",
      source: "assist",
    });
    expect(result.score).toBe(50);
    expect(result.combo).toBe(2);
    expect(result.correctChars).toBe(0);
    expect(result.totalTypedChars).toBe(0);
    expect(result.hasUsedAssistance).toBe(true);
  });

  it("When 手動與輔助交替, Then 只計手動部分且保留已使用輔助標記", () => {
    let result = scoreTyping(createScoringState(), {
      questionId: "one",
      target: "ABCDE",
      input: "A",
    });
    result = scoreTyping(result, {
      questionId: "one",
      target: "ABCDE",
      input: "ABC",
      source: "assist",
    });
    result = scoreTyping(result, {
      questionId: "one",
      target: "ABCDE",
      input: "ABCD",
    });
    expect(result.score).toBe(100);
    expect(result.correctChars).toBe(2);
    expect(result.totalTypedChars).toBe(2);
    expect(result.hasUsedAssistance).toBe(true);
  });

  it("When 輔助插入錯誤詞組, Then 不增加手動錯誤數", () => {
    const result = scoreTyping(createScoringState(), {
      questionId: "one",
      target: "ABCDE",
      input: "AXX",
      source: "assist",
    });
    expect(result.errorCount).toBe(0);
    expect(result.correctChars).toBe(0);
  });

  it("Given 自動標點, When 完成句子, Then 只給手動字元分及完成獎勵", () => {
    const result = scoreTyping(createScoringState(), {
      questionId: "one",
      target: "A,B.",
      input: "A,B.",
      inputSources: ["manual", "automatic", "manual", "automatic"],
    });
    expect(result.score).toBe(150);
    expect(result.combo).toBe(2);
    expect(result.correctChars).toBe(2);
    expect(result.hasUsedAssistance).toBe(false);
  });

  it("When 手動輸入標點, Then 與一般手動字元相同計分", () => {
    const result = scoreTyping(createScoringState(), {
      questionId: "one",
      target: "A,",
      input: "A,",
    });
    expect(result.score).toBe(150);
    expect(result.combo).toBe(2);
    expect(result.correctChars).toBe(2);
  });

  it("Given 錯字後有輔助文字, When 修正前方錯字, Then 舊輔助文字不變成手動統計", () => {
    let result = scoreTyping(createScoringState(), {
      questionId: "one",
      target: "ABCD",
      input: "X",
    });
    result = scoreTyping(result, {
      questionId: "one",
      target: "ABCD",
      input: "XBC",
      source: "assist",
    });
    result = scoreTyping(result, {
      questionId: "one",
      target: "ABCD",
      input: "ABC",
    });
    expect(result.correctChars).toBe(1);
    expect(result.errorCount).toBe(1);
    expect(result.score).toBe(75);
  });

  it("When 重開新局, Then 清除輔助使用標記", () => {
    const result = createScoringState();
    expect(result.hasUsedAssistance).toBe(false);
  });

  it("When 刪除輔助字元, Then 保留未變動前後文字的來源", () => {
    expect(
      reconcileInputSources(
        "ABCD",
        ["manual", "assist", "assist", "automatic"],
        "AD",
        "manual",
      ),
    ).toEqual(["manual", "automatic"]);
  });

  it("When 在文字中間插入手動字元, Then 原有輔助後綴仍屬於輔助", () => {
    expect(
      reconcileInputSources(
        "ACD",
        ["manual", "assist", "automatic"],
        "ABCD",
        "manual",
      ),
    ).toEqual(["manual", "manual", "assist", "automatic"]);
  });

  it("Given 自動補入的標點未取得字元獎勵, When 之後手動重打, Then 可領該位置首次字元分", () => {
    let result = scoreTyping(createScoringState(), {
      questionId: "one",
      target: "A,B",
      input: "A,",
      inputSources: ["manual", "automatic"],
    });
    result = scoreTyping(result, {
      questionId: "one",
      target: "A,B",
      input: "A",
    });
    result = scoreTyping(result, {
      questionId: "one",
      target: "A,B",
      input: "A,",
    });
    expect(result.score).toBe(50);
    expect(result.correctChars).toBe(2);
  });
});
