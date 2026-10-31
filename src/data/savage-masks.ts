import type { Localized } from "../game/types";
import type { MaskRule } from "../game/fixed-mask";

export const FIXED_MASK_VERSION = "prototype-v1";

/** Editorial draft for five prototype lines; independent of clozePool/history. */
export const SAVAGE_MASKS: Record<string, Localized<readonly MaskRule[]>> = {
  L01: {
    zh: [
      {
        text: "什麼",
        occurrence: 0,
      },
      {
        text: "戰鬥",
        occurrence: 0,
      },
    ],
    jp: [
      {
        text: "何のため",
        occurrence: 0,
      },
      {
        text: "闘う",
        occurrence: 0,
      },
    ],
    en: [
      {
        text: "whom",
        occurrence: 0,
      },
      {
        text: "fight",
        occurrence: 0,
      },
    ],
  },
  L02: {
    zh: [
      {
        text: "艾歐澤亞",
        occurrence: 0,
      },
      {
        text: "真實",
        occurrence: 0,
      },
    ],
    jp: [
      {
        text: "エオルゼア",
        occurrence: 0,
      },
      {
        text: "真実",
        occurrence: 0,
      },
    ],
    en: [
      {
        text: "believe",
        occurrence: 0,
      },
      {
        text: "Eorzea",
        occurrence: 0,
      },
    ],
  },
  L03: {
    zh: [
      {
        text: "虛偽",
        occurrence: 0,
      },
      {
        text: "共存",
        occurrence: 0,
      },
      {
        text: "欺騙",
        occurrence: 0,
      },
      {
        text: "城市",
        occurrence: 0,
      },
      {
        text: "謊言",
        occurrence: 0,
      },
      {
        text: "偽神",
        occurrence: 0,
      },
    ],
    jp: [
      {
        text: "虚偽",
        occurrence: 0,
      },
      {
        text: "共存",
        occurrence: 0,
      },
      {
        text: "欺騙",
        occurrence: 0,
      },
      {
        text: "街",
        occurrence: 0,
      },
      {
        text: "瞞着",
        occurrence: 0,
      },
      {
        text: "神",
        occurrence: 0,
      },
    ],
    en: [
      {
        text: "unity",
        occurrence: 0,
      },
      {
        text: "falsehoods",
        occurrence: 0,
      },
      {
        text: "city-states",
        occurrence: 0,
      },
      {
        text: "deceit",
        occurrence: 0,
      },
      {
        text: "faith",
        occurrence: 0,
      },
      {
        text: "deception",
        occurrence: 0,
      },
    ],
  },
  L05: {
    zh: [
      {
        text: "蠻神",
        occurrence: 0,
      },
      {
        text: "恐懼",
        occurrence: 0,
      },
      {
        text: "恐懼",
        occurrence: 1,
      },
      {
        text: "戰鬥",
        occurrence: 0,
      },
      {
        text: "奇怪",
        occurrence: 0,
      },
    ],
    jp: [
      {
        text: "蛮神",
        occurrence: 0,
      },
      {
        text: "恐怖",
        occurrence: 0,
      },
      {
        text: "戦う",
        occurrence: 0,
      },
      {
        text: "おかしい",
        occurrence: 0,
      },
    ],
    en: [
      {
        text: "beast tribes",
        occurrence: 0,
      },
      {
        text: "gods",
        occurrence: 0,
      },
      {
        text: "comrades",
        occurrence: 0,
      },
      {
        text: "strange",
        occurrence: 0,
      },
    ],
  },
  L07: {
    zh: [
      {
        text: "召喚神明",
        occurrence: 0,
      },
      {
        text: "代價",
        occurrence: 0,
      },
      {
        text: "水晶",
        occurrence: 0,
      },
      {
        text: "乙太",
        occurrence: 0,
      },
    ],
    jp: [
      {
        text: "代償",
        occurrence: 0,
      },
      {
        text: "クリスタル",
        occurrence: 0,
      },
      {
        text: "エーテル",
        occurrence: 0,
      },
    ],
    en: [
      {
        text: "answer",
        occurrence: 0,
      },
      {
        text: "crystals",
        occurrence: 0,
      },
      {
        text: "aether",
        occurrence: 0,
      },
    ],
  },
};
