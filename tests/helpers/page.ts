import { mountPage } from "../../src/ui/page";

/** Use the production templates and composer rather than a copied HTML fixture. */
export function mountPageFixture() {
  document.body.innerHTML = '<div id="app"></div>';
  mountPage();
}
