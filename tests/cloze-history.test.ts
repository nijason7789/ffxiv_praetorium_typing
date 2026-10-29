// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PRAETORIUM_SCRIPT } from "../src/data/praetorium";

let next: (typeof import("../src/services/cloze-history"))["nextClozeBlank"];
const words = ["冒險者", "什麼", "戰鬥"];
const key = "ffxiv-praetorium:cloze:v1:L01:zh";

beforeEach(async () => {
  vi.resetModules();
  localStorage.clear();
  vi.spyOn(Math, "random").mockReturnValue(0);
  next = (await import("../src/services/cloze-history")).nextClozeBlank;
});

afterEach(() => vi.restoreAllMocks());

it("exhausts every candidate once per round and avoids repeats at the boundary", () => {
  const firstRound = words.map(() => next("L01", "zh", words));
  const secondRound = words.map(() => next("L01", "zh", words));
  expect(new Set(firstRound)).toEqual(new Set(words));
  expect(new Set(secondRound)).toEqual(new Set(words));
  expect(secondRound[0]).not.toBe(firstRound.at(-1));
  expect(words).toEqual(["冒險者", "什麼", "戰鬥"]);
});

it("resumes the unfinished round after a page reload", async () => {
  const seen = [next("L01", "zh", words)];
  for (let i = 0; i < 2; i++) {
    vi.resetModules();
    const reloaded = await import("../src/services/cloze-history");
    seen.push(reloaded.nextClozeBlank("L01", "zh", words));
  }
  expect(new Set(seen)).toEqual(new Set(words));
});

it("uses the latest stored progress from another tab", () => {
  next("L01", "zh", words);
  localStorage.setItem(
    key,
    JSON.stringify({ pool: words, remaining: ["戰鬥"], last: "什麼" }),
  );
  expect(next("L01", "zh", words)).toBe("戰鬥");
});

it("keeps language and sentence progress independent", () => {
  const first = next("L01", "zh", words);
  expect(next("L01", "zh", words)).not.toBe(first);
  expect(next("L01", "en", words)).toBe(first);
  expect(next("L02", "zh", words)).toBe(first);
});

it("rebuilds the round when candidate words change", () => {
  next("L01", "zh", words);
  const revised = ["戰鬥", "新詞"];
  expect(new Set(revised.map(() => next("L01", "zh", revised)))).toEqual(
    new Set(revised),
  );
});

it.each([
  "not json",
  "null",
  "42",
  JSON.stringify({ pool: words, remaining: ["unknown"], last: null }),
  JSON.stringify({ pool: words, remaining: ["什麼", "什麼"], last: null }),
])("recovers safely from invalid saved data: %s", (stored) => {
  localStorage.setItem(key, stored);
  expect(words).toContain(next("L01", "zh", words));
});

it("continues rotating in memory if browser storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const seen = words.map(() => next("L01", "zh", words));
  expect(new Set(seen)).toEqual(new Set(words));
});

it("handles a single candidate without inventing a different answer", () => {
  expect(next("single", "zh", ["戰鬥", "戰鬥"])).toBe("戰鬥");
  expect(next("single", "zh", ["戰鬥", "戰鬥"])).toBe("戰鬥");
});

it("has multiple valid blanks for every shipped sentence and language", () => {
  for (const item of PRAETORIUM_SCRIPT) {
    for (const lang of ["zh", "jp", "en"] as const) {
      const sentence = lang === "zh" ? item.text : item[lang];
      const valid = item.clozePool[lang].filter((word) =>
        sentence.includes(word),
      );
      expect(valid.length, `${item.id}/${lang}`).toBeGreaterThan(1);
    }
  }
});
