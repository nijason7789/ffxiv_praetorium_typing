export interface MaskRule {
  text: string;
  occurrence: number;
}
export type MemoryDifficulty = "savage" | "ultimate";

/** One underscore per UTF-16 code unit, matching the game's current counting. */
export function fixedMask(
  sentence: string,
  rules: readonly MaskRule[] = [],
): string {
  if (!rules.length) throw new Error("No fixed mask rules");
  const covered = new Set<number>();
  for (const rule of rules) {
    if (!rule.text || !Number.isInteger(rule.occurrence) || rule.occurrence < 0)
      throw new Error("Invalid fixed mask rule");
    let start = -1;
    for (let index = 0; index <= rule.occurrence; index++) {
      start = sentence.indexOf(rule.text, start + 1);
      if (start < 0) throw new Error("Fixed mask text not found: " + rule.text);
    }
    for (let index = start; index < start + rule.text.length; index++) {
      if (covered.has(index))
        throw new Error("Overlapping fixed mask: " + rule.text);
      covered.add(index);
    }
  }
  return sentence
    .split("")
    .map((char, index) => (covered.has(index) ? "＿" : char))
    .join("");
}
