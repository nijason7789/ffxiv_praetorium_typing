import layout from "./components/page.html?raw";
import setup from "./components/setup.html?raw";
import header from "./components/header.html?raw";
import dashboard from "./components/dashboard.html?raw";
import gameStage from "./components/game-stage.html?raw";
import typingPanel from "./components/typing-panel.html?raw";
import clozePanel from "./components/cloze-panel.html?raw";
import results from "./components/results.html?raw";
import archive from "./components/archive.html?raw";
import footer from "./components/footer.html?raw";
import { element } from "./dom";

/** Compose trusted local templates only; user text must still use textContent. */
function compose(template: string, components: Record<string, string>) {
  return template.replace(
    /<!-- component: ([\w-]+) -->/g,
    (_, name: string) => {
      if (!(name in components))
        throw new Error("Unknown page component: " + name);
      return components[name];
    },
  );
}

/** Mount once before required-element checks or event binding. */
export function mountPage(baseUrl = import.meta.env.BASE_URL) {
  const host = element("app");
  const template = document.createElement("template");
  template.innerHTML = compose(layout, {
    setup,
    header,
    dashboard,
    archive,
    footer,
    "game-stage": compose(gameStage, {
      "typing-panel": typingPanel,
      "cloze-panel": clozePanel,
      results,
    }),
  });
  const base = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
  template.content
    .querySelectorAll<HTMLElement>("[data-public-src]")
    .forEach((node) => {
      node.setAttribute("src", base + node.dataset.publicSrc);
      node.removeAttribute("data-public-src");
    });
  // Keep header/main/footer directly under body for setup focus/inert behavior.
  host.replaceWith(template.content);
}
