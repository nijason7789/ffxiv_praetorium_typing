import { element } from "../ui/dom";
let bgmPlaying = false;
const YT_EMBED_ACTIVE_URL =
  "https://www.youtube.com/embed/VETYSUtX6PY?si=oPXKaLiA8_kHiYg3&autoplay=1&mute=0&loop=1&playlist=VETYSUtX6PY&enablejsapi=1&playsinline=1&rel=0";
const YT_EMBED_MANUAL_URL =
  "https://www.youtube.com/embed/VETYSUtX6PY?si=oPXKaLiA8_kHiYg3&autoplay=0&loop=1&playlist=VETYSUtX6PY&enablejsapi=1&playsinline=1&rel=0";

function updateBgmStatusBadge(text: string, isPlaying: boolean) {
  const badge = element("bgmEngineStatus");
  const dot = element("bgmStatusDot");
  if (badge) {
    badge.textContent = text;
    badge.className = isPlaying
      ? "px-2 py-0.5 rounded bg-amber-950/90 text-amber-300 border border-amber-600/40 text-[11px]"
      : "px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700 text-[11px]";
  }
  if (dot) {
    dot.className = isPlaying
      ? "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"
      : "w-2.5 h-2.5 rounded-full bg-amber-400";
  }
}

function sendYtPostMessage(funcName: string, args: (number | string)[] = []) {
  const iframe = element("ytBgmIframe");
  if (iframe && iframe.contentWindow) {
    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: "listening",
        id: "ytBgmIframe",
        channel: "widget",
      }),
      "*",
    );
    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: "command",
        func: funcName,
        args: args,
      }),
      "*",
    );
  }
}

function enableBgmManually() {
  bgmPlaying = true;
  const iframe = element("ytBgmIframe");
  if (iframe) {
    iframe.src = YT_EMBED_ACTIVE_URL;
  }
  [200, 600, 1200].forEach((delay) => {
    setTimeout(() => {
      if (!bgmPlaying) return;
      sendYtPostMessage("unMute");
      sendYtPostMessage("setVolume", [100]);
      sendYtPostMessage("playVideo");
    }, delay);
  });
  const btnBgm = element("btnToggleBgm");
  if (btnBgm) {
    btnBgm.textContent = "🎵 BGM：已開啟";
    btnBgm.className =
      "px-2.5 py-1.5 rounded-md text-xs font-semibold bg-amber-500/20 border border-amber-400/60 text-amber-200 hover:bg-amber-500/30 transition";
  }
  updateBgmStatusBadge("指定曲 VETYSUtX6PY 手動播放中", true);
}

function disableBgmManually() {
  bgmPlaying = false;
  sendYtPostMessage("pauseVideo");
  const iframe = element("ytBgmIframe");
  if (iframe) {
    iframe.src = YT_EMBED_MANUAL_URL;
  }
  const btnBgm = element("btnToggleBgm");
  if (btnBgm) {
    btnBgm.textContent = "🔇 BGM：手動開啟";
    btnBgm.className =
      "px-2.5 py-1.5 rounded-md text-xs font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:border-amber-400/50 transition";
  }
  updateBgmStatusBadge(
    "手動開啟模式（請點擊右側播放器或上方 BGM 按鈕開啟）",
    false,
  );
}

export { enableBgmManually, disableBgmManually };
export function toggleBgm() {
  if (bgmPlaying) disableBgmManually();
  else enableBgmManually();
}
