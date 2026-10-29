import { element } from "../ui/dom";

let initialized = false;
let languageSelected = false;
let requested = false;
let requestId = 0;
let waitTimer: ReturnType<typeof setTimeout> | undefined;

function clearWaitTimer() {
  clearTimeout(waitTimer);
  waitTimer = undefined;
}

function updateStatus(message: string, label: string, playing = false) {
  element("bgmEngineStatus").textContent = message;
  element("btnToggleBgm").textContent = label;
  element("btnToggleBgm").setAttribute("aria-pressed", String(playing));
  element("bgmStatusDot").className = playing
    ? "w-2.5 h-2.5 rounded-full bg-emerald-400"
    : "w-2.5 h-2.5 rounded-full bg-amber-400";
}

function playbackUnavailable(message: string) {
  requested = false;
  requestId++;
  clearWaitTimer();
  element("bgmAudio").pause();
  updateStatus(message, "▶ BGM：點擊重試");
}

/** Prepare one persistent audio element, without playing before user interaction. */
export function initializeBgm() {
  if (initialized) return;
  initialized = true;
  const audio = element("bgmAudio");
  audio.loop = true;
  setBgmVolume(Number(element("bgmVolume").value) / 100);

  audio.addEventListener("playing", () => {
    if (!requested) {
      audio.pause();
      return;
    }
    clearWaitTimer();
    updateStatus("天幕之下・循環播放中", "🎵 BGM：播放中（點擊暫停）", true);
  });
  audio.addEventListener("pause", () => {
    // Ignore an old pause event if playback has already been requested again.
    if (!audio.paused || !requested) return;
    requested = false;
    requestId++;
    clearWaitTimer();
    updateStatus("BGM 已暫停", "▶ BGM：繼續播放");
  });
  audio.addEventListener("waiting", () => {
    if (requested) updateStatus("BGM 載入中…", "⏳ BGM：載入中（點擊暫停）");
  });
  audio.addEventListener("error", () => {
    playbackUnavailable("音樂載入失敗，請點擊 BGM 按鈕重試。");
  });
}

export function startBgmOnLanguageSelection() {
  if (languageSelected) return;
  languageSelected = true;
  enableBgm();
}

function enableBgm() {
  initializeBgm();
  if (requested) return;
  const audio = element("bgmAudio");
  // Reload only after a media error; normal pause/resume preserves the position.
  if (audio.error) audio.load();
  requested = true;
  const id = ++requestId;
  updateStatus("正在載入天幕之下…", "⏳ BGM：載入中（點擊暫停）");
  clearWaitTimer();
  waitTimer = setTimeout(() => {
    if (id === requestId)
      playbackUnavailable("音樂尚未開始播放，請點擊 BGM 按鈕重試。");
  }, 15000);

  // Call play synchronously in the click handler to preserve user activation.
  void audio.play().catch((error: unknown) => {
    if (id !== requestId || !requested) return;
    const blocked =
      error instanceof DOMException && error.name === "NotAllowedError";
    playbackUnavailable(
      blocked
        ? "瀏覽器阻擋了有聲播放，請點擊 BGM 按鈕開啟。"
        : "音樂無法播放，請點擊 BGM 按鈕重試。",
    );
  });
}

function pauseBgm() {
  requested = false;
  requestId++;
  clearWaitTimer();
  element("bgmAudio").pause();
  updateStatus("BGM 已暫停", "▶ BGM：繼續播放");
}

export function toggleBgm() {
  languageSelected = true;
  if (requested) pauseBgm();
  else enableBgm();
}

export function setBgmVolume(value: number) {
  const volume = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
  element("bgmAudio").volume = volume;
  element("bgmVolume").value = String(Math.round(volume * 100));
  element("bgmVolumeValue").textContent = `${Math.round(volume * 100)}%`;
}
