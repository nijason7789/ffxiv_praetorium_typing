import { describe, expect, it } from "vitest";
import {
  createScoringState,
  scoreTyping,
  scoreCloze,
} from "../src/game/scoring";
import {
  calculateStats,
  createTypingClock,
  startTypingClock,
  pauseTypingClock,
  typingElapsedMs,
} from "../src/game/statistics";

describe("Feature: 打字計時 [STAT-02, Q11, Q25]", () => {
  it("Given 時間零開始, When 重複開始再暫停, Then 不重設起點", () => {
    let clock = startTypingClock(createTypingClock(), 0);
    clock = startTypingClock(clock, 15_000);
    clock = pauseTypingClock(clock, 30_000);
    expect(typingElapsedMs(clock, 120_000)).toBe(30_000);
  });
  it("When 暫停閱讀後接續, Then 只累計兩段打字時間", () => {
    let clock = startTypingClock(createTypingClock(), 0);
    clock = pauseTypingClock(clock, 15_000);
    clock = startTypingClock(clock, 105_000);
    clock = pauseTypingClock(clock, 120_000);
    expect(clock.elapsedMs).toBe(30_000);
  });
  it("When 時鐘倒退, Then 不出現負數耗時", () => {
    const clock = startTypingClock(createTypingClock(), 1000);
    expect(typingElapsedMs(clock, 0)).toBe(0);
  });
});

describe("Feature: 統計與評級 [STAT, RESULT]", () => {
  it("Given 250 題已完成 249 題, Then 四捨五入也不能提前顯示 100%", () => {
    const scoring = createScoringState();
    const ids = Array.from({ length: 250 }, (_, index) => String(index));
    for (const id of ids.slice(0, -1)) {
      Object.assign(
        scoring,
        scoreTyping(scoring, { questionId: id, target: "A", input: "A" }),
      );
    }
    expect(
      calculateStats(scoring, createTypingClock(), ids, false, 0),
    ).toMatchObject({ completed: 249, total: 250, completionRate: 99 });
  });
  it("Given 零作答, Then 精準度與評級無資料", () => {
    expect(
      calculateStats(
        createScoringState(),
        createTypingClock(),
        ["one"],
        false,
        0,
      ),
    ).toMatchObject({
      cpm: 0,
      accuracy: null,
      rank: null,
      completed: 0,
      total: 1,
      completionRate: 0,
    });
  });
  it.each([
    [79, "B"],
    [80, "A"],
    [92, "A"],
    [93, "S+"],
    [100, "S+"],
  ] as const)("Given 精準度 %i, Then 評級為 %s", (correct, rank) => {
    const scoring = {
      ...createScoringState(),
      correctChars: correct,
      errorCount: 100 - correct,
    };
    expect(
      calculateStats(scoring, createTypingClock(), [], false, 0).rank,
    ).toBe(rank);
  });
  it("When 原始精準度四捨五入為 93, Then 沿用 S+ 門檻", () => {
    const scoring = {
      ...createScoringState(),
      correctChars: 37,
      errorCount: 3,
    };
    expect(
      calculateStats(scoring, createTypingClock(), [], false, 0),
    ).toMatchObject({ accuracy: 93, rank: "S+" });
  });
  it("Given 兩字用時 30 秒, Then CPM 為 4", () => {
    const scoring = scoreTyping(createScoringState(), {
      questionId: "one",
      target: "AB",
      input: "AB",
    });
    expect(
      calculateStats(
        scoring,
        { elapsedMs: 30_000, startedAt: null },
        ["one"],
        false,
        999_999,
      ).cpm,
    ).toBe(4);
  });
  it("Given 極短時間兩字, Then 使用至少三秒的分母", () => {
    const scoring = { ...createScoringState(), totalTypedChars: 2 };
    expect(calculateStats(scoring, createTypingClock(), [], false, 0).cpm).toBe(
      40,
    );
  });
  it("Given 純填空, Then CPM 不適用且不影響精準度", () => {
    const scoring = scoreCloze(createScoringState(), {
      questionId: "one",
      correct: true,
      answerLength: 2,
    });
    expect(
      calculateStats(scoring, createTypingClock(), ["one"], true, 0),
    ).toMatchObject({ cpm: null, accuracy: 100 });
  });
  it("Given 有效題含重複 ID 與未答題, Then 完成率只計有效唯一題", () => {
    const scoring = scoreTyping(createScoringState(), {
      questionId: "one",
      target: "AB",
      input: "AB",
    });
    expect(
      calculateStats(
        scoring,
        createTypingClock(),
        ["one", "one", "two"],
        false,
        0,
      ),
    ).toMatchObject({ completed: 1, total: 2, completionRate: 50, rank: "S+" });
  });
  it("Given 全部題目異常, Then 分母為零且完成率為零", () => {
    expect(
      calculateStats(createScoringState(), createTypingClock(), [], false, 0),
    ).toMatchObject({ total: 0, completed: 0, completionRate: 0 });
  });
});
