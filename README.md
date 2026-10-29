# FFXIV Praetorium Typing

以 Vite + TypeScript 整理的純前端打字與台詞填空遊戲，保留原有三語題庫及介面。

## 開發

需要 Node.js 22.12+ 或 24+。

```sh
npm install
npm run dev
```

開啟終端顯示的本機網址。模組版本需透過開發伺服器使用。

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`dist/` 是建置後可部署至靜態主機的內容。Google Fonts 與 YouTube BGM 仍需要網路；Tailwind CSS 已改為本機建置。

## 結構

- `index.html`：頁面結構，保留現有樣式與元素 ID。
- `src/main.ts`：程式入口與樣式載入。
- `src/data/praetorium.ts`：三語台詞、挖空詞及干擾選項。
- `src/game/types.ts`：語言、模式、題目及遊戲狀態型別。
- `src/game/state.ts`：目前遊戲狀態。
- `src/game/text.ts`：文字正規化、語言取值與標點略過。
- `src/game/app.ts`：遊戲控制、題目呈現與計分。
- `src/ui/events.ts`：操作事件綁定。
- `src/ui/dom.ts`：具型別與存在檢查的 DOM 存取。
- `src/services/`：Web Audio 音效與 YouTube 播放控制。
- `src/styles/`：Tailwind 入口與黑金主題。
- `public/images/`：從原始 HTML 抽出的圖片。

原始 `ffxiv_praetorium_typing.html` 保留作為遷移對照，不是 Vite 程式入口。此次以模組化為主，既有計分與輔助作答規則維持原樣。

`npm test` 使用模擬 DOM 驗證語言切換、打字換題、填空、模式切換及全文練習入口；不驗證真實瀏覽器的輸入法、音訊或 YouTube 播放。
