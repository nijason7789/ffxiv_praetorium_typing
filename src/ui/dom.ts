type Elements = {
  typingInput: HTMLTextAreaElement;
  clozeInput: HTMLInputElement;
  bgmAudio: HTMLAudioElement;
  bgmVolume: HTMLInputElement;
};
export function element<K extends string>(
  id: K,
): K extends keyof Elements ? Elements[K] : HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error("Missing required element: " + id);
  return node as K extends keyof Elements ? Elements[K] : HTMLElement;
}
