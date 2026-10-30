interface ImeOptions {
  isActive: () => boolean;
  onCompositionChange: (composing: boolean) => void;
  onCommit?: () => void;
  onInput?: () => void;
  onEnter?: () => void;
}

const resets = new Set<() => void>();

/** Clear guards when a question is replaced; late compositionend must not commit it. */
export function resetImeGuards() {
  resets.forEach((reset) => reset());
}

export function bindIme(
  input: HTMLElement,
  options: ImeOptions,
) {
  let composing = false;
  let justEnded = false;
  let confirmationHeld = false;
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  function clearEndGuard() {
    clearTimeout(endTimer);
    endTimer = undefined;
    justEnded = false;
  }
  function reset() {
    composing = false;
    confirmationHeld = false;
    clearEndGuard();
    options.onCompositionChange(false);
  }
  resets.add(reset);
  input.addEventListener("blur", reset);
  input.addEventListener("compositionstart", () => {
    if (!options.isActive()) return;
    clearEndGuard();
    confirmationHeld = false;
    composing = true;
    options.onCompositionChange(true);
  });
  input.addEventListener("compositionend", () => {
    if (!composing) return;
    composing = false;
    options.onCompositionChange(false);
    justEnded = true;
    // Some browsers end composition before delivering its confirming keydown.
    // Guard that event turn only; mouse selection must not swallow a later Enter.
    endTimer = setTimeout(clearEndGuard, 0);
    if (options.isActive()) options.onCommit?.();
  });
  input.addEventListener("input", (event) => {
    if (options.isActive() && !composing && !(event as InputEvent).isComposing)
      options.onInput?.();
  });
  if (options.onEnter) {
    input.addEventListener("keydown", (event) => {
      if (!options.isActive()) return;
      if (event.key !== "Enter") {
        clearEndGuard();
        return;
      }
      const nativeComposing = event.isComposing || event.keyCode === 229;
      if (composing || nativeComposing || justEnded || confirmationHeld) {
        confirmationHeld = true;
        // Let the IME process its own confirmation key.
        if (!composing && !nativeComposing) event.preventDefault();
        return;
      }
      event.preventDefault();
      if (!event.repeat) options.onEnter?.();
    });
    input.addEventListener("keyup", (event) => {
      if (event.key !== "Enter") return;
      confirmationHeld = false;
      clearEndGuard();
    });
  }
}
