import { MissingRequiredElementError, showPageError } from "./page-error";

type Elements = {
  typingInput: HTMLTextAreaElement;
  clozeInput: HTMLInputElement;
  bgmAudio: HTMLAudioElement;
  bgmVolume: HTMLInputElement;
  btnAutoFillWord: HTMLButtonElement;
};
export function element<K extends string>(
  id: K,
): K extends keyof Elements ? Elements[K] : HTMLElement {
  const node = document.getElementById(id);
  if (!node) {
    showPageError();
    throw new MissingRequiredElementError(id);
  }
  return node as K extends keyof Elements ? Elements[K] : HTMLElement;
}
