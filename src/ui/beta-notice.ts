import { BETA_NOTICE } from "../data/beta-notice";
import { element } from "./dom";

const STORAGE_KEY = "ffxiv-praetorium:beta-notice";
let initialized = false;

export function initializeBetaNotice() {
  if (initialized) return;
  const sections = [
    {
      badge: element("btnBetaSetupNotice"),
      panel: element("betaSetupNotice"),
      close: element("btnDismissBetaSetup"),
    },
    {
      badge: element("btnBetaGameNotice"),
      panel: element("betaGameNotice"),
      close: element("btnDismissBetaGame"),
    },
  ];
  initialized = true;
  for (const key of [
    "badge",
    "title",
    "message",
    "dismiss",
    "resultTitle",
    "resultMessage",
    "feedbackLabel",
  ] as const) {
    document
      .querySelectorAll<HTMLElement>(`[data-beta-copy="${key}"]`)
      .forEach((node) => {
        node.textContent = BETA_NOTICE[key];
      });
  }
  (element("betaFeedbackLink") as HTMLAnchorElement).href =
    BETA_NOTICE.feedbackUrl;
  function show(section: (typeof sections)[number], visible: boolean) {
    section.panel.classList.toggle("hidden", !visible);
    section.badge.setAttribute("aria-expanded", String(visible));
  }
  function dismiss(section: (typeof sections)[number]) {
    sections.forEach((item) => show(item, false));
    try {
      localStorage.setItem(STORAGE_KEY, BETA_NOTICE.version);
    } catch {
      /* Reading the notice must not require storage access. */
    }
    section.badge.focus();
  }
  let acknowledged = false;
  try {
    acknowledged = localStorage.getItem(STORAGE_KEY) === BETA_NOTICE.version;
  } catch {
    /* Show the notice when storage is unavailable. */
  }
  show(sections[0], !acknowledged);
  show(sections[1], false);
  for (const section of sections) {
    section.badge.addEventListener("click", () => {
      if (section.panel.classList.contains("hidden")) show(section, true);
      else dismiss(section);
    });
    section.close.addEventListener("click", () => dismiss(section));
  }
}
