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

`dist/` 是建置後可部署至靜態主機的內容。BGM 與圖片隨專案部署，Google Fonts 仍需要網路；Tailwind CSS 已改為本機建置。

## 結構

- `index.html`：頁面結構，保留現有樣式與元素 ID。
- `src/main.ts`：程式入口與樣式載入。
- `src/data/praetorium.ts`：三語台詞、挖空詞及干擾選項。
- `src/game/types.ts`：語言、模式、題目及遊戲狀態型別。
- `src/game/state.ts`：目前遊戲狀態。
- `src/game/text.ts`：文字正規化、語言取值與標點略過。
- `src/game/app.ts`：遊戲控制、題目呈現與計分。
- `src/ui/events.ts`：操作事件綁定。
- `src/ui/setup.ts`：語言與難度選擇流程。
- `src/ui/dom.ts`：具型別與存在檢查的 DOM 存取。
- `src/services/`：Web Audio 音效與本機 BGM 播放控制。
- `src/styles/`：Tailwind 入口與黑金主題。
- `public/images/`：從原始 HTML 抽出的圖片。
- `public/audio/`：背景音樂檔案。

原始 `ffxiv_praetorium_typing.html` 保留作為遷移對照，不是 Vite 程式入口。

`npm test` 使用模擬 DOM 驗證語言切換、打字換題、填空、模式切換、全文練習入口及 BGM 控制；真實瀏覽器的輸入法和音訊解碼、播放需另行驗證。

## 遊戲難度

進入流程為「選擇語言 → 選擇難度 → 開始遊戲」。體驗模式提供魔導輔助填詞與快速詞組點擊輸入；挑戰模式隱藏並停用這兩項打字輔助。填空選項、提示、標點略過及計分規則維持原樣。

遊戲上方會顯示目前難度，可重新選擇；重新選擇難度會開始新一局。換題、切換模式與重新開始會保留目前難度。

## 背景音樂

第一次選擇語言版本後，會播放 `public/audio/BGM_ORCH_570-天幕之下.ogg.mp3`，預設以 50% 音量循環播放，可使用上方滑桿調整音量。切換題目或模式不會重新載入音樂；手動暫停後，切換語言也會保留暫停狀態，再次播放會接續原本位置。BGM 與打字音效分別控制。

若瀏覽器阻擋有聲播放，或音檔載入失敗，頁面會顯示提示，可點擊 BGM 按鈕重試。音樂失敗不影響作答；已移除 YouTube 播放依賴。
