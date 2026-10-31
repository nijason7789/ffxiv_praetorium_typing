import type { Localized } from "../game/types";
import type { MaskRule } from "../game/fixed-mask";
import { SAVAGE_MASKS } from "./savage-masks";

const words = (...texts: string[]): MaskRule[] =>
  texts.map((text) => ({ text, occurrence: 0 }));

/** Additional fixed phrases; every ultimate mask also includes the savage rules. */
const EXTRA_MASKS: Record<string, Localized<readonly MaskRule[]>> = {
  L04: {
    zh: words("從上到下", "真的"),
    jp: words("満ちた"),
    en: words("naught", "believe"),
  },
  L06: {
    zh: words("信仰", "戰役"),
    jp: words("仰ぐ", "呼び降ろす"),
    en: words("engaged", "understand", "repeat"),
  },
  L08: {
    zh: words("本質", "依靠"),
    jp: words("気づいて", "頼れば"),
    en: words("different", "bleeding"),
  },
  L09: {
    zh: words("依賴", "睿智"),
    jp: words("知って", "賢人"),
    en: words("cling", "learning", "grovel"),
  },
  L10: {
    zh: words("原因", "所有"),
    jp: words("他ならん"),
    en: words("otherwise"),
  },
  L11: {
    zh: words("存在"),
    jp: words("初めて"),
    en: words("mean"),
  },
  L12: {
    zh: words("自古以來", "磨練"),
    jp: words("自己", "富み"),
    en: words("raise", "grow"),
  },
  L13: {
    zh: words("領導", "敗下陣來"),
    jp: words("導く", "果て"),
    en: words("settles", "dictate"),
  },
  L14: {
    zh: words("領導", "召喚"),
    jp: words("導く", "呼ばれ"),
    en: words("Knowing", "leads"),
  },
  L15: {
    zh: words("遵從", "別無他法"),
    jp: words("愚かな民", "一点"),
    en: words("steer", "truth"),
  },
  L16: {
    zh: words("打倒", "統治"),
    jp: words("倒し", "天下"),
    en: words("face", "proof"),
  },
  L17: {
    zh: words("只有", "獲得"),
    jp: words("我が手"),
    en: words("right", "stop"),
  },
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
