import type { Localized } from "../game/types";
import type { MaskRule } from "../game/fixed-mask";

export const FIXED_MASK_VERSION = "fixed-v4";

const words = (...texts: string[]): MaskRule[] =>
  texts.map((text) => ({ text, occurrence: 0 }));

/** Fixed editorial phrases for the complete script; independent of clozePool/history. */
export const SAVAGE_MASKS: Record<string, Localized<readonly MaskRule[]>> = {
  L04: {
    zh: words("艾歐澤亞", "欺瞞", "真實"),
    jp: words("欺瞞", "真実"),
    en: words("cobweb", "lies", "Eorzea", "nothing"),
  },
  L06: {
    zh: words("十二神", "加爾提諾", "危難", "召喚"),
    jp: words("エオルゼア十二神", "守護神", "カルテノー"),
    en: words("Twelve", "protectors", "guardians", "Carteneau"),
  },
  L08: {
    zh: words("十二神", "蠻神", "力量", "滅亡"),
    jp: words("十二神", "蛮神", "滅ぶ"),
    en: words("gods", "beasts", "eikons", "faith"),
  },
  L09: {
    zh: words("真相", "愚蠢", "偽神", "路易索瓦"),
    jp: words("真実", "愚かな民", "偽りの神", "ルイゾワ"),
    en: words("masters", "false deities", "Louisoix"),
  },
  L10: {
    zh: words("長者", "王", "執政", "軟弱無能"),
    jp: words("長", "王", "為政者", "力無き弱者"),
    en: words("masters", "strength"),
  },
  L11: {
    zh: words("人世", "支配", "價值"),
    jp: words("人の世", "支配", "存在価値"),
    en: words("world", "anything", "own"),
  },
  L12: {
    zh: words("鬥爭", "掠奪", "財富", "支配", "繁榮"),
    jp: words("太古", "争い", "奪う", "支配"),
    en: words("conflict", "rich", "conquest"),
  },
  L13: {
    zh: words("鬥爭", "弱者", "強者", "未來"),
    jp: words("争い", "強者", "弱者", "未来"),
    en: words("battle", "strong", "fate", "weak"),
  },
  L14: {
    zh: words("無能之人", "虛偽", "乾枯", "生靈"),
    jp: words("力無き弱者", "偽りの神", "枯れ", "死に絶える"),
    en: words("impotent ruler", "false worship", "enervation", "death"),
  },
  L15: {
    zh: words("強者", "統治", "愚蠢", "謊言", "拯救"),
    jp: words("力有る者", "支配", "欺瞞", "真実"),
    en: words("power", "civilization", "mendacity", "salvation"),
  },
  L16: {
    zh: words("英雄", "艾歐澤亞", "天命之人"),
    jp: words("英雄", "エオルゼア", "真なる王"),
    en: words("champion", "Eorzea", "defeat", "readiness"),
  },
  L17: {
    zh: words("鐵腕統治", "艾歐澤亞", "新生"),
    jp: words("エオルゼア", "新生", "力有る"),
    en: words("realm", "power"),
  },
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
