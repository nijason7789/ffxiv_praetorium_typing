import { getDifficultyRules } from "../game/difficulty";
import type { Difficulty } from "../game/types";

interface RestrictionOptions {
  isActive: () => boolean;
  getDifficulty: () => Difficulty;
}

let notice: HTMLElement | undefined;
let hideTimer: ReturnType<typeof setTimeout> | undefined;
const resets = new Set<() => void>();
const boundInputs = new WeakSet<HTMLElement>();

function ensureNotice() {
  if (notice?.isConnected) return notice;
  notice = document.createElement("div");
  notice.id = "inputRestrictionNotice";
  notice.setAttribute("role", "status");
  notice.setAttribute("aria-live", "polite");
  notice.className =
    "hidden pointer-events-none fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] max-w-[calc(100%-2rem)] rounded-lg border border-amber-600 bg-amber-950 px-4 py-3 text-sm text-amber-100 shadow-lg";
  document.body.append(notice);
  return notice;
}

function showNotice() {
  clearTimeout(hideTimer);
  const current = ensureNotice();
  current.textContent = "此難度請手動輸入台詞";
  current.classList.remove("hidden");
  hideTimer = setTimeout(() => {
    current.classList.add("hidden");
    hideTimer = undefined;
  }, 3000);
}

/** Reset at question/session boundaries, without touching the answer or IME. */
export function resetInputRestrictions() {
  clearTimeout(hideTimer);
  hideTimer = undefined;
  notice?.classList.add("hidden");
  resets.forEach((reset) => reset());
}

/** Only explicit transfer events are blocked; ordinary input/composition stays native. */
export function bindInputRestrictions(
  input: HTMLInputElement | HTMLTextAreaElement,
  options: RestrictionOptions,
) {
  if (boundInputs.has(input)) return;
  boundInputs.add(input);
  ensureNotice();
  let pendingTransfer: "paste" | "drop" | undefined;
  let transferTimer: ReturnType<typeof setTimeout> | undefined;
  function resetTransfer() {
    clearTimeout(transferTimer);
    transferTimer = undefined;
    pendingTransfer = undefined;
  }
  resets.add(resetTransfer);

  function block(event: Event, kind: "paste" | "drop", primary: boolean) {
    if (
      !input.isConnected ||
      input.disabled ||
      input.readOnly ||
      !options.isActive()
    )
      return;
    const rules = getDifficultyRules(options.getDifficulty());
    if ((kind === "paste" ? rules.paste : rules.textDrop) || !event.cancelable)
      return;
    event.preventDefault();
    if (primary || pendingTransfer !== kind) showNotice();
    resetTransfer();
    pendingTransfer = kind;
    transferTimer = setTimeout(resetTransfer, 0);
  }

  input.addEventListener("paste", (event) => block(event, "paste", true));
  input.addEventListener("drop", (event) => {
    const types = (event as DragEvent).dataTransfer?.types;
    // Leave non-text drops outside this policy; never read clipboard contents.
    if (types?.length && !types.some((type) => type.startsWith("text/")))
      return;
    block(event, "drop", true);
  });
  input.addEventListener("beforeinput", (event) => {
    const { inputType } = event as InputEvent;
    if (
      inputType === "insertFromPaste" ||
      inputType === "insertFromPasteAsQuotation"
    )
      block(event, "paste", false);
    if (inputType === "insertFromDrop" || inputType === "deleteByDrag")
      block(event, "drop", false);
  });
}
