import { copyText } from "../services/clipboard";
import { element } from "./dom";

let hideTimer: ReturnType<typeof setTimeout> | undefined;
let latestRequest = 0;

export async function copyWithFeedback(text: string, successMessage: string) {
  const request = ++latestRequest;
  const success = await copyText(text);
  // An older pending copy must not overwrite feedback for a newer action.
  if (request !== latestRequest) return;
  clearTimeout(hideTimer);
  const toast = element("copyToastMsg");
  toast.textContent = success
    ? successMessage
    : "複製失敗，請重試或手動選取文字複製。";
  toast.className = success
    ? "fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-max max-w-[calc(100%-2rem)] rounded-lg border border-emerald-600 bg-emerald-950 px-4 py-3 text-sm text-emerald-200 shadow-lg"
    : "fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-max max-w-[calc(100%-2rem)] rounded-lg border border-red-600 bg-red-950 px-4 py-3 text-sm text-red-200 shadow-lg";
  hideTimer = setTimeout(() => {
    toast.classList.add("hidden");
    hideTimer = undefined;
  }, 3000);
}
