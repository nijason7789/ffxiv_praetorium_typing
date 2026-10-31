import type { Localized } from "../game/types";
import type { MaskRule } from "../game/fixed-mask";
import { SAVAGE_MASKS } from "./savage-masks";

/** Additional fixed phrases; every ultimate mask also includes the savage rules. */
const EXTRA_MASKS: Record<string, Localized<readonly MaskRule[]>> = {
  L01: {
    zh: [{ text: "你是為了", occurrence: 0 }],
    jp: [{ text: "うぬ", occurrence: 0 }],
    en: [{ text: "do you", occurrence: 0 }],
  },
  L02: {
    zh: [
      { text: "倒想問", occurrence: 0 },
      { text: "存在", occurrence: 0 },
    ],
    jp: [
      { text: "この", occurrence: 0 },
      { text: "ある", occurrence: 0 },
    ],
    en: [
      { text: "very", occurrence: 0 },
      { text: "do you", occurrence: 0 },
    ],
  },
  L03: {
    zh: [0, 1, 2].map((occurrence) => ({ text: "出來的", occurrence })),
    jp: [
      { text: "塗り固め", occurrence: 0 },
      { text: "によって", occurrence: 0 },
      { text: "ために", occurrence: 0 },
    ],
    en: [
      { text: "is", occurrence: 0 },
      { text: "are", occurrence: 0 },
      { text: "is", occurrence: 1 },
      { text: "of", occurrence: 0 },
      { text: "of", occurrence: 1 },
    ],
  },
  L05: {
    zh: [
      { text: "出現", occurrence: 0 },
      { text: "驅散", occurrence: 0 },
      { text: "不認為", occurrence: 0 },
    ],
    jp: [
      { text: "出現", occurrence: 0 },
      { text: "拭う", occurrence: 0 },
      { text: "思わぬ", occurrence: 0 },
    ],
    en: [
      { text: "summon", occurrence: 0 },
      { text: "rarely", occurrence: 0 },
      { text: "respond", occurrence: 0 },
    ],
  },
  L07: {
    zh: [
      { text: "吸走", occurrence: 0 },
      { text: "如何", occurrence: 0 },
    ],
    jp: [
      { text: "呼ぶ", occurrence: 0 },
      { text: "喰わせ", occurrence: 0 },
    ],
    en: [
      { text: "lavish", occurrence: 0 },
      { text: "gorge", occurrence: 0 },
    ],
  },
};

export const ULTIMATE_MASKS: Record<
  string,
  Localized<readonly MaskRule[]>
> = Object.fromEntries(
  Object.entries(EXTRA_MASKS).map(([id, extra]) => [
    id,
    {
      zh: [...SAVAGE_MASKS[id].zh, ...extra.zh],
      jp: [...SAVAGE_MASKS[id].jp, ...extra.jp],
      en: [...SAVAGE_MASKS[id].en, ...extra.en],
    },
  ]),
);
