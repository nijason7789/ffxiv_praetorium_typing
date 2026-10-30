export type InputSource = "manual" | "assist" | "automatic";

/** Locate inserted/replaced text while retaining the unchanged prefix and suffix. */
export function changedRange(previous: string, input: string) {
  let start = 0;
  while (
    start < previous.length &&
    start < input.length &&
    previous[start] === input[start]
  )
    start++;
  let suffix = 0;
  while (
    suffix < previous.length - start &&
    suffix < input.length - start &&
    previous[previous.length - 1 - suffix] === input[input.length - 1 - suffix]
  )
    suffix++;
  return { start, end: input.length - suffix };
}

export function reconcileInputSources(
  previous: string,
  previousSources: readonly InputSource[],
  input: string,
  source: InputSource,
): InputSource[] {
  const { start, end } = changedRange(previous, input);
  return Array.from({ length: input.length }, (_, index) => {
    if (index < start) return previousSources[index] ?? "manual";
    if (index >= end)
      return (
        previousSources[previous.length - (input.length - index)] ?? "manual"
      );
    return source;
  });
}
