import { mountPage } from "./page";
import { initializeApp } from "./events";
import { installPageErrorBoundary, runPageAction } from "./page-error";

export function bootstrap() {
  installPageErrorBoundary();
  runPageAction(() => {
    mountPage();
    initializeApp();
  });
}
