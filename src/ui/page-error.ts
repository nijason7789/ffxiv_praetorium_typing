export class MissingRequiredElementError extends Error {
  constructor(readonly elementId: string) {
    super("Missing required element: " + elementId);
    this.name = "MissingRequiredElementError";
  }
}

let failed = false;
let boundaryInstalled = false;
const shutdownHandlers = new Set<() => void>();
export const hasPageError = () => failed;
export function onPageError(handler: () => void) {
  shutdownHandlers.add(handler);
}

/** Recovery must not depend on any of the application's required IDs. */
export function showPageError(
  reload: () => void = () => window.location.reload(),
) {
  if (failed) return;
  failed = true;
  shutdownHandlers.forEach((handler) => {
    try {
      handler();
    } catch {
      /* Survive a partially missing page. */
    }
  });
  for (const child of document.body.children) {
    if (child instanceof HTMLElement) {
      child.inert = true;
      child.style.display = "none";
    }
  }
  document.body.inert = false;
  document.body.classList.remove("overflow-hidden");
  const view = document.createElement("section");
  view.id = "pageErrorView";
  view.setAttribute("role", "alert");
  view.setAttribute("aria-labelledby", "pageErrorTitle");
  view.className =
    "fixed inset-0 z-[200] flex items-center justify-center bg-slate-950 p-6 text-slate-100";
  const card = document.createElement("div");
  card.className =
    "max-w-md rounded-xl border border-red-800 bg-slate-900 p-6 space-y-4";
  const title = document.createElement("h1");
  title.id = "pageErrorTitle";
  title.className = "text-xl font-bold text-red-200";
  title.textContent = "頁面載入異常";
  const description = document.createElement("p");
  description.textContent =
    "部分畫面無法載入，請重新整理頁面後再試。本次練習不會產生結算或評級。";
  const button = document.createElement("button");
  button.id = "btnReloadPage";
  button.type = "button";
  button.className = "ff-btn-gold rounded-lg px-4 py-2 font-bold";
  button.textContent = "重新整理頁面";
  button.addEventListener("click", reload);
  card.append(title, description, button);
  view.append(card);
  document.body.append(view);
  try {
    document.querySelector<HTMLAudioElement>("#bgmAudio")?.pause();
  } catch {
    /* A broken media element cannot block recovery. */
  }
  button.focus();
}

export function runPageAction(action: () => void) {
  if (failed) return;
  try {
    action();
  } catch (error) {
    if (!(error instanceof MissingRequiredElementError)) throw error;
    showPageError();
  }
}

/** Leave unrelated programming errors visible. */
export function installPageErrorBoundary() {
  if (boundaryInstalled) return;
  boundaryInstalled = true;
  window.addEventListener("error", (event) => {
    if (!(event.error instanceof MissingRequiredElementError)) return;
    showPageError();
    event.preventDefault();
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (!(event.reason instanceof MissingRequiredElementError)) return;
    showPageError();
    event.preventDefault();
  });
}
