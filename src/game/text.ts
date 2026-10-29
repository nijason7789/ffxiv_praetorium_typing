import { state } from "./state";
import type { ScriptLine } from "./types";
export const PUNCT_SET = new Set([
  "，",
  "。",
  "！",
  "？",
  "、",
  "…",
  "「",
  "」",
  "—",
  "·",
  "・",
  ",",
  ".",
  "!",
  "?",
  ";",
  ":",
  "'",
  '"',
  "—",
]);
export function localizeZhTerm(str: string) {
  if (!str) return "";
  if (state.useAltTerm) {
    return str.replace(/艾歐澤亞/g, "艾奧傑亞");
  }
  return str;
}

export function getLinePrimaryText(item: ScriptLine) {
  if (state.lang === "jp") return item.jp;
  if (state.lang === "en") return item.en;
  return localizeZhTerm(item.text);
}

export function getLineSpeaker(item: ScriptLine) {
  return item.speaker[state.lang] || item.speaker.zh;
}

export function getLineActTitle(item: ScriptLine) {
  return item.actTitle[state.lang] || item.actTitle.zh;
}

// Normalize variants (艾歐澤亞/艾奧傑亞, 乙太/以太, case-insensitive in English)
export function normalizeForCompare(str: string) {
  if (!str) return "";
  let out = str
    .replace(/艾奧傑亞/g, "艾歐澤亞")
    .replace(/以太/g, "乙太")
    .replace(/裡/g, "裏")
    .replace(/裏/g, "裡");
  if (state.lang === "en") {
    out = out.toLowerCase();
  }
  return out;
}
export function computeEffectiveInput(rawInput: string, targetStr: string) {
  if (!state.skipPunct) return rawInput;
  const normInput = normalizeForCompare(rawInput);
  const normTarget = normalizeForCompare(targetStr);

  let result = "";
  let tIdx = 0;
  for (let i = 0; i < normInput.length && tIdx < normTarget.length; i++) {
    const inChar = normInput[i];
    while (
      tIdx < normTarget.length &&
      (PUNCT_SET.has(targetStr[tIdx]) ||
        (state.lang !== "en" && targetStr[tIdx] === " ")) &&
      inChar !== normTarget[tIdx]
    ) {
      result += targetStr[tIdx];
      tIdx++;
    }
    if (tIdx < normTarget.length) {
      result += rawInput[i];
      tIdx++;
    }
  }
  while (
    tIdx < normTarget.length &&
    (PUNCT_SET.has(targetStr[tIdx]) ||
      (state.lang !== "en" && targetStr[tIdx] === " ")) &&
    result.length === tIdx
  ) {
    if (
      tIdx > 0 &&
      normalizeForCompare(result[tIdx - 1]) === normTarget[tIdx - 1]
    ) {
      result += targetStr[tIdx];
      tIdx++;
    } else {
      break;
    }
  }
  return result;
}
