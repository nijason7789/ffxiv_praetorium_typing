// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let sound: (typeof import("../src/services/audio"))["soundFX"];
const methods = [
  "playKeyClick",
  "playError",
  "playLineComplete",
  "playDutyComplete",
] as const;
function context(state: AudioContextState = "running") {
  const oscillators: ReturnType<typeof oscillator>[] = [];
  const gains: ReturnType<typeof gain>[] = [];
  function oscillator() {
    return {
      type: "sine",
      frequency: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    };
  }
  function gain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  return {
    state,
    currentTime: 5,
    destination: {},
    resume: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn(() => {
      const node = oscillator();
      oscillators.push(node);
      return node;
    }),
    createGain: vi.fn(() => {
      const node = gain();
      gains.push(node);
      return node;
    }),
    oscillators,
    gains,
  };
}
function install(ctx = context()) {
  const ctor = vi.fn(function () {
    return ctx;
  });
  vi.stubGlobal("AudioContext", ctor);
  return { ctx, ctor };
}
beforeEach(async () => {
  vi.resetModules();
  sound = (await import("../src/services/audio")).soundFX;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Feature: 音效失敗可略過 [DEC-11, SFX]", () => {
  it("Given 靜音, When 所有音效, Then 不初始化音訊", () => {
    const { ctor } = install();
    sound.enabled = false;
    methods.forEach((method) => sound[method]());
    expect(ctor).not.toHaveBeenCalled();
  });
  it("Given 不支援 AudioContext, Then 所有音效安全略過", () => {
    vi.stubGlobal("AudioContext", undefined);
    vi.stubGlobal("webkitAudioContext", undefined);
    methods.forEach((method) => expect(() => sound[method]()).not.toThrow());
  });
  it.each(methods)(
    "Given constructor 拋錯, When %s, Then 不向遊戲拋錯",
    (method) => {
      vi.stubGlobal(
        "AudioContext",
        vi.fn(function () {
          throw new Error("unavailable");
        }),
      );
      expect(() => sound[method]()).not.toThrow();
    },
  );
  it("Given resume 同步拋錯, Then 不向遊戲拋錯且不排程音符", () => {
    const { ctx } = install(context("suspended"));
    ctx.resume.mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => sound.playLineComplete()).not.toThrow();
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });
  it("Given resume Promise 拒絕, Then 接住拒絕並略過音效", async () => {
    const { ctx } = install(context("suspended"));
    const rejected = Promise.reject(new Error("denied"));
    // Keep the test runner safe even when checking the old implementation.
    void rejected.catch(() => {});
    const catchAttached = vi.spyOn(rejected, "then");
    ctx.resume.mockReturnValue(rejected);
    sound.playError();
    await Promise.resolve();
    expect(
      catchAttached.mock.calls.some((call) => typeof call[1] === "function"),
    ).toBe(true);
    expect(ctx.createOscillator).not.toHaveBeenCalled();
  });
  it("Given 恢復尚未完成, When 多次音效, Then 只提出一次恢復且不累積音符", async () => {
    const { ctx } = install(context("suspended"));
    let resume = () => {};
    ctx.resume.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resume = resolve;
        }),
    );
    methods.forEach((method) => sound[method]());
    expect(ctx.resume).toHaveBeenCalledTimes(1);
    expect(ctx.createOscillator).not.toHaveBeenCalled();
    ctx.state = "running";
    resume();
    await Promise.resolve();
    sound.playKeyClick();
    expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
  });
  it("Given 已關閉的 context, When 新音效, Then 建立可用 context", () => {
    const { ctx, ctor } = install();
    sound.playKeyClick();
    ctx.state = "closed";
    const next = context();
    ctor.mockImplementationOnce(function () {
      return next;
    });
    sound.playError();
    expect(next.createOscillator).toHaveBeenCalledTimes(1);
  });
  it.each(["createOscillator", "createGain"] as const)(
    "Given %s 失敗, Then 音效不向遊戲拋錯",
    (method) => {
      const { ctx } = install();
      ctx[method].mockImplementation(() => {
        throw new Error("node unavailable");
      });
      methods.forEach((play) => expect(() => sound[play]()).not.toThrow());
    },
  );
  it.each(["start", "stop", "connect"] as const)(
    "Given 節點 %s 失敗, Then 安全清理而不中斷",
    (method) => {
      const { ctx } = install();
      const makeNode = ctx.createOscillator.getMockImplementation()!;
      ctx.createOscillator.mockImplementation(() => {
        const node = makeNode();
        node[method].mockImplementation(() => {
          throw new Error("node failed");
        });
        return node;
      });
      expect(() => sound.playKeyClick()).not.toThrow();
      expect(ctx.oscillators[0].disconnect).toHaveBeenCalled();
    },
  );
  it("Given 正常音訊, When 所有音效, Then 共用 context 並保留既有音符與音量", () => {
    const { ctx, ctor } = install();
    methods.forEach((method) => sound[method]());
    expect(ctor).toHaveBeenCalledTimes(1);
    expect(ctx.oscillators).toHaveLength(11);
    expect(ctx.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(
      520,
      5,
    );
    expect(ctx.gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.06, 5);
    expect(ctx.oscillators[0].stop).toHaveBeenCalledWith(5.05);
  });
  it("When 音符播完, Then 中斷節點連線釋放資源", () => {
    const { ctx } = install();
    sound.playKeyClick(true);
    expect(ctx.oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(
      660,
      5,
    );
    ctx.oscillators[0].onended?.();
    expect(ctx.oscillators[0].disconnect).toHaveBeenCalled();
    expect(ctx.gains[0].disconnect).toHaveBeenCalled();
  });
});
