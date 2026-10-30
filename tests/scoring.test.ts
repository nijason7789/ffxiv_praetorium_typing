import { describe, expect, it } from "vitest";
import {
  createScoringState,
  scoreTyping,
  scoreCloze,
  scoreRpg,
  resetTypingInput,
} from "../src/game/scoring";

const questionId = "en:L01";
const target = "ABCDEFGHIJ";

describe("Feature: 逐字倍率 [SCORE-01～04]", () => {
  it.each([
    { combo: 8, expected: 115, finalCombo: 12 },
    { combo: 18, expected: 135, finalCombo: 22 },
  ])(
    "Given $combo Combo, When 4 個新字元, Then 加 $expected 分且批次與逐字同分",
    ({ combo, expected, finalCombo }) => {
      const initial = { ...createScoringState(), combo, maxCombo: combo };
      const batch = scoreTyping(initial, { questionId, target, input: "ABCD" });
      let sequential = initial;
      for (const input of ["A", "AB", "ABC", "ABCD"]) {
        sequential = scoreTyping(sequential, { questionId, target, input });
      }
      expect(batch.score).toBe(expected);
      expect(sequential.score).toBe(expected);
      expect(batch.combo).toBe(finalCombo);
      expect(batch.maxCombo).toBe(finalCombo);
      expect(batch.correctChars).toBe(4);
    },
  );

  it("When 首次完整答對, Then 包含一次完成獎勵；重複輸入不再給獎勵", () => {
    const first = scoreTyping(createScoringState(), {
      questionId,
      target: "ABC",
      input: "ABC",
    });
    const repeated = scoreTyping(first, {
      questionId,
      target: "ABC",
      input: "ABC",
    });
    expect(first.score).toBe(175);
    expect(repeated.score).toBe(175);
    expect(repeated.combo).toBe(3);
    expect(repeated.correctChars).toBe(3);
  });

  it("[TYPE-15] When 完整正確句子後多字, Then 不為尾端多字計分或計錯", () => {
    const result = scoreTyping(createScoringState(), {
      questionId,
      target: "ABC",
      input: "ABCXYZ",
    });
    expect(result.score).toBe(175);
    expect(result.correctChars).toBe(3);
    expect(result.errorCount).toBe(0);
  });

  it("When 未提供目標或只輸入部分句子, Then 不發完成獎勵", () => {
    expect(
      scoreTyping(createScoringState(), { questionId, target: "", input: "" })
        .score,
    ).toBe(0);
    expect(
      scoreTyping(createScoringState(), {
        questionId,
        target: "ABC",
        input: "AB",
      }).score,
    ).toBe(50);
  });

  it("When 回傳新成績, Then 不修改之前的成績與獎勵紀錄", () => {
    const initial = createScoringState();
    const first = scoreTyping(initial, { questionId, target, input: "AB" });
    const snapshot = structuredClone(first);
    scoreTyping(first, { questionId, target, input: "ABCD" });
    expect(initial.score).toBe(0);
    expect(first).toEqual(snapshot);
  });
});

describe("Feature: 錯誤字元紀錄 [TYPE-14, SCORE-06]", () => {
  it("When 同批輸入正確前綴與錯字, Then 仍記錄每個新錯字並歸零 Combo", () => {
    const result = scoreTyping(
      { ...createScoringState(), combo: 8, maxCombo: 8 },
      { questionId, target, input: "ABXY" },
    );
    expect(result.errorCount).toBe(2);
    expect(result.combo).toBe(0);
    expect(result.maxCombo).toBe(10);
    expect(result.score).toBe(55);
  });

  it("When 修正錯字, Then 保留錯誤紀錄，只獎勵尚未計入的正確字元", () => {
    const wrong = scoreTyping(createScoringState(), {
      questionId,
      target: "ABCD",
      input: "AXCD",
    });
    const fixed = scoreTyping(wrong, {
      questionId,
      target: "ABCD",
      input: "ABCD",
    });
    expect(wrong.errorCount).toBe(1);
    expect(fixed.errorCount).toBe(1);
    expect(fixed.correctChars).toBe(4);
    expect(fixed.score).toBe(200);
  });

  it("When 重複處理相同 input 或刪除錯字, Then 不重新計入舊錯誤", () => {
    let score = scoreTyping(createScoringState(), {
      questionId,
      target,
      input: "ABXY",
    });
    score = scoreTyping(score, { questionId, target, input: "ABXY" });
    score = scoreTyping(score, { questionId, target, input: "ABY" });
    expect(score.errorCount).toBe(2);
  });

  it("When 錯字換成另一個錯字或刪除後再輸入, Then 記錄新的錯誤嘗試", () => {
    let score = scoreTyping(createScoringState(), {
      questionId,
      target,
      input: "AX",
    });
    score = scoreTyping(score, { questionId, target, input: "AY" });
    score = scoreTyping(score, { questionId, target, input: "A" });
    score = scoreTyping(score, { questionId, target, input: "AX" });
    expect(score.errorCount).toBe(3);
    expect(score.correctChars).toBe(1);
  });

  it("When 在文字中間插入字元, Then 位移的舊字元不當成新輸入重複計錯", () => {
    let score = scoreTyping(createScoringState(), {
      questionId,
      target: "ABCDE",
      input: "AXYZ",
    });
    score = scoreTyping(score, { questionId, target: "ABCDE", input: "ABXYZ" });
    expect(score.errorCount).toBe(3);
    expect(score.correctChars).toBe(2);
  });
});

describe("Feature: 同局獎勵只領一次 [Q09, SCORE-05, SCORE-09]", () => {
  it("When 清空已答對前綴後重打, Then 不重複增加字元分、字數與 Combo", () => {
    const first = scoreTyping(createScoringState(), {
      questionId,
      target,
      input: "ABCD",
    });
    const cleared = scoreTyping(first, { questionId, target, input: "" });
    const repeated = scoreTyping(cleared, {
      questionId,
      target,
      input: "ABCD",
    });
    expect(repeated.score).toBe(100);
    expect(repeated.correctChars).toBe(4);
    expect(repeated.combo).toBe(4);
  });

  it("When 返回已完成題目重新輸入, Then 不重複取得字元與整句獎勵", () => {
    const first = scoreTyping(createScoringState(), {
      questionId,
      target: "ABC",
      input: "ABC",
    });
    const reopened = resetTypingInput(first, questionId);
    const repeated = scoreTyping(reopened, {
      questionId,
      target: "ABC",
      input: "ABC",
    });
    expect(repeated.score).toBe(175);
    expect(repeated.correctChars).toBe(3);
    expect(repeated.combo).toBe(3);
  });

  it("When 不同題目含相同文字, Then 兩題各自可取得獎勵", () => {
    const first = scoreTyping(createScoringState(), {
      questionId,
      target: "ABC",
      input: "ABC",
    });
    const second = scoreTyping(first, {
      questionId: "en:L02",
      target: "ABC",
      input: "ABC",
    });
    expect(second.score).toBe(350);
    expect(second.correctChars).toBe(6);
  });

  it("When 重設新一局, Then 相同題目可重新獲得獎勵", () => {
    const first = scoreTyping(createScoringState(), {
      questionId,
      target: "ABC",
      input: "ABC",
    });
    const restarted = scoreTyping(createScoringState(), {
      questionId,
      target: "ABC",
      input: "ABC",
    });
    expect(restarted.score).toBe(first.score);
  });

  it("When 填空正確且原 Combo 為 8, Then 增加 240 分與 3 Combo", () => {
    const result = scoreCloze(
      { ...createScoringState(), combo: 8 },
      { questionId, correct: true, answerLength: 5 },
    );
    expect(result.score).toBe(240);
    expect(result.combo).toBe(11);
    expect(result.maxCombo).toBe(11);
    expect(result.correctChars).toBe(5);
  });

  it("When 同句已答對後換挖空詞再答, Then 不重複發放填空獎勵", () => {
    const first = scoreCloze(createScoringState(), {
      questionId,
      correct: true,
      answerLength: 2,
    });
    const repeated = scoreCloze(first, {
      questionId,
      correct: true,
      answerLength: 5,
    });
    expect(repeated.score).toBe(200);
    expect(repeated.correctChars).toBe(2);
    expect(repeated.combo).toBe(3);
  });

  it("When 已完整答對的句子改用另一題型重答, Then 不再給該句獎勵", () => {
    const typed = scoreTyping(createScoringState(), {
      questionId,
      target: "ABC",
      input: "ABC",
    });
    expect(
      scoreCloze(typed, { questionId, correct: true, answerLength: 2 }).score,
    ).toBe(175);
    const clozed = scoreCloze(createScoringState(), {
      questionId,
      correct: true,
      answerLength: 2,
    });
    expect(
      scoreTyping(clozed, { questionId, target: "ABC", input: "ABC" }).score,
    ).toBe(200);
  });

  it("When 填空錯誤後答對, Then 保留錯誤、歸零後重新累積 Combo", () => {
    const wrong = scoreCloze(
      { ...createScoringState(), combo: 8 },
      { questionId, correct: false, answerLength: 0 },
    );
    const fixed = scoreCloze(wrong, {
      questionId,
      correct: true,
      answerLength: 2,
    });
    expect(fixed.errorCount).toBe(1);
    expect(fixed.score).toBe(200);
    expect(fixed.combo).toBe(3);
  });

  it("When 重複觸發同句 RPG 選項, Then 只加 150 分與 2 Combo 並更新最高 Combo", () => {
    const first = scoreRpg(createScoringState(), questionId);
    const repeated = scoreRpg(first, questionId);
    expect(repeated.score).toBe(150);
    expect(repeated.combo).toBe(2);
    expect(repeated.maxCombo).toBe(2);
  });

  it("When 字元與 RPG 分別首次取得獎勵, Then 不互相取消兩種獎勵", () => {
    const typed = scoreTyping(createScoringState(), {
      questionId,
      target: "ABC",
      input: "ABC",
    });
    const result = scoreRpg(typed, questionId);
    expect(result.score).toBe(325);
    expect(result.combo).toBe(5);
  });
});
