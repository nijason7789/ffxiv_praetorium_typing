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

## GitHub Pages 部署

Workflow 位於 `.github/workflows/deploy-pages.yml`，採用 GitHub 官方 Pages artifact 部署，不需要建立 `gh-pages` 分支或設定額外 token。

首次設定：

1. 在 repository 的 **Settings → Pages → Build and deployment → Source** 選擇 **GitHub Actions**。
2. 將 workflow 推送至 `main`，便會自動部署；也可在 **Actions → Deploy to GitHub Pages → Run workflow** 手動執行，分支選 `main`。
3. 部署完成後開啟 <https://nijason7789.github.io/ffxiv_praetorium_typing/>。

每次推送 `main` 都會依序執行 `npm ci`、測試、型別檢查與正式建置，成功後才部署 `dist/`。部署狀態與實際網址可在 Actions 的 `github-pages` environment 查看。

Workflow 會從 Pages 設定取得部署的 `base_path`，傳給 Vite `--base`，讓 JS、CSS、圖片及 BGM 都能在 `/ffxiv_praetorium_typing/` 下正確載入；本機開發仍使用原本根路徑。

本機模擬目前的 Pages 部署路徑：

```sh
npm run build -- --base=/ffxiv_praetorium_typing/
npm run preview -- --base=/ffxiv_praetorium_typing/
```

開啟 `http://localhost:4173/ffxiv_praetorium_typing/`。相關設定參考 [Vite GitHub Pages 部署文件](https://vite.dev/guide/static-deploy#github-pages) 與 [GitHub Pages workflow 文件](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

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

## BDD 功能盤點與測試規劃

[功能盤點與 BDD 測試清單](docs/BDD-FEATURE-CATALOG.md) 列出功能的 Given／When／Then 情境、建議測試層級、現有覆蓋，以及經 27 題問答確認的 13 項產品決議。文件區分盤點時的程式現況與已確認但待實作的新預期，供後續補測與 refactor 使用。

## 遊戲難度

進入流程為「選擇語言 → 選擇難度 → 開始遊戲」。體驗模式提供魔導輔助填詞與快速詞組點擊輸入；挑戰模式隱藏並停用這兩項打字輔助。填空選項、提示、標點略過及計分規則維持原樣。

遊戲上方會顯示目前難度，可重新選擇；重新選擇難度會開始新一局。換題、切換模式與重新開始會保留目前難度。

## 填空抽題

每句、每個語言各自維護一份洗牌詞庫：候選詞抽完一輪後才重新洗牌，且下一輪開頭會避開上一輪最後一個詞。選項順序與干擾詞也會洗牌。

抽題進度以 `localStorage` 儲存在目前瀏覽器，重開頁面會接續尚未抽完的詞庫。切換中文譯名不會重設進度；題庫變更時會重建該句的抽題進度。若儲存功能被停用，則退回目前頁面的記憶體記錄。

這會減少同一位使用者重複遇到同一空格，但不同使用者仍可能抽到相同題目。無痕模式、不同裝置或清除網站資料後不會共享進度；只有一個可用候選詞的句子也無法避免重複。

## 背景音樂

第一次選擇語言版本後，會播放 `public/audio/BGM_ORCH_570-天幕之下.ogg.mp3`，預設以 25% 音量循環播放，可使用上方滑桿調整音量。切換題目或模式不會重新載入音樂；手動暫停後，切換語言也會保留暫停狀態，再次播放會接續原本位置。BGM 與打字音效分別控制。

若瀏覽器阻擋有聲播放，或音檔載入失敗，頁面會顯示提示，可點擊 BGM 按鈕重試。音樂失敗不影響作答；已移除 YouTube 播放依賴。
