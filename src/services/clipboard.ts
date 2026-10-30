/** Report the actual copy result; UI messages are handled separately. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // API denial or synchronous failure can still fall back to the legacy path.
  }
  return fallbackCopy(text);
}

function fallbackCopy(text: string): boolean {
  const focused = document.activeElement;
  const selection =
    focused instanceof HTMLInputElement ||
    focused instanceof HTMLTextAreaElement
      ? {
          start: focused.selectionStart,
          end: focused.selectionEnd,
          direction: focused.selectionDirection,
        }
      : null;
  const temporary = document.createElement("textarea");
  temporary.value = text;
  temporary.readOnly = true;
  temporary.style.position = "fixed";
  temporary.style.opacity = "0";
  try {
    document.body.appendChild(temporary);
    temporary.focus({ preventScroll: true });
    temporary.select();
    return document.execCommand("copy") === true;
  } catch {
    return false;
  } finally {
    temporary.remove();
    if (focused instanceof HTMLElement && focused.isConnected) {
      try {
        focused.focus({ preventScroll: true });
        if (selection && selection.start !== null && selection.end !== null)
          (focused as HTMLInputElement | HTMLTextAreaElement).setSelectionRange(
            selection.start,
            selection.end,
            selection.direction ?? "none",
          );
      } catch {
        // Restoring focus must not change a copy operation's result.
      }
    }
  }
}
