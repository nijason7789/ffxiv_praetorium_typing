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
- `src/game/app.ts`：遊戲控制、題目呈現與結算。
- `src/game/scoring.ts`：不依賴 DOM 的逐字倍率、錯誤紀錄與同局獎勵防重規則。
- `src/game/input-source.ts`：文字編輯前後的手動、輔助及自動標點來源追蹤。
- `src/game/statistics.ts`：不依賴 DOM 的打字計時、CPM、精準度、完成率與評級規則。
- `src/ui/events.ts`：操作事件綁定。
- `src/ui/ime.ts`：打字／填空組字保護及選字 Enter 防誤送。
- `src/ui/copy-feedback.ts`：成績單、全文與巨集共用的複製提示。
- `src/ui/setup.ts`：語言與難度選擇流程。
- `src/ui/dom.ts`：具型別與存在檢查的 DOM 存取。
- `src/ui/required-elements.ts`：啟動前檢查必要靜態元件。
- `src/ui/page-error.ts`：缺件時停止本局並顯示獨立錯誤畫面與重新整理入口。
- `src/services/`：Web Audio 音效與本機 BGM 播放控制。
- `src/services/clipboard.ts`：剪貼簿 API 與備援複製的成功／失敗處理。
- `src/styles/`：Tailwind 入口與黑金主題。
- `public/images/`：從原始 HTML 抽出的圖片。
- `public/audio/`：背景音樂檔案。

原始 `ffxiv_praetorium_typing.html` 保留作為遷移對照，不是 Vite 程式入口。

`npm test` 使用模擬 DOM 驗證語言切換、打字換題、填空、模式切換、全文練習入口及 BGM 控制；真實瀏覽器的輸入法和音訊解碼、播放需另行驗證。

## BDD 功能盤點與測試規劃

[功能盤點與 BDD 測試清單](docs/BDD-FEATURE-CATALOG.md) 列出功能的 Given／When／Then 情境、建議測試層級、現有覆蓋，以及經 27 題問答確認的 13 項產品決議。文件區分盤點時的程式現況與已確認但待實作的新預期，供後續補測與 refactor 使用。

首批計分規則已建立 21 項純規則測試與 10 項 DOM 整合測試，採 Feature／Given／When／Then 描述倍率、錯誤紀錄及獎勵防重。後續以同樣流程逐批補測與實作，詳細範圍見文件第 9 節。

第二批增加 22 項情境，區分手動輸入與輔助來源。補字／快速詞組仍給遊戲分與 Combo，但不進入字速、精準度的字數或錯誤數；自動補入標點也不給字元分／Combo。結算與複製成績單會顯示難度及實際輔助使用狀態，重開新局後清除。

第三批增加 34 項情境，目前合計 119 項測試。CPM 從手動輸入開始計時，排除填空、全文閱讀與完成後等待；純填空顯示「不適用」。返回原模式保留場次與輸入，從全文選句則建立獨立單題練習。完成率按答對題數／有效題數顯示，跳題不算完成；精準度與評級依可統計作答計算，沒有資料時顯示「無資料」。結算後鎖定成績，重開才重新計分。

第四批增加 20 項 IME 情境，目前合計 139 項測試。填空組字期間不判定答案，Enter 確認選字後需再按一次才送出；換題、重新抽詞、重開及結算會清除組字保護。實際中文／日文輸入法的手動驗收步驟見 BDD 文件第 12 節。

第五批增加 15 項剪貼簿情境，目前合計 154 項測試。複製失敗時嘗試備援，備援失敗顯示畫面下方紅色提示；三種複製入口共用提示，每次結果顯示三秒，連續成功由最後一次重新計時。備援完成後移除暫存輸入框並還原焦點與選取。

第六批增加 21 項音效情境，目前合計 175 項測試。短音效初始化、恢復或節點操作失敗時安全略過，遊戲與 BGM 可繼續；恢復尚未完成時不累積音符，已關閉的 context 在下一次操作重新建立。正常音效共用 context，音符結束後釋放連線，既有音色、音量與音符長度維持原值。

第七批增加 17 項頁面錯誤情境，目前合計 192 項測試。必要元件缺失時停止場次、取消換題並清除結算結果，顯示「頁面載入異常」與可用鍵盤操作的重新整理按鈕。錯誤畫面獨立建立，原畫面與 BGM 停止；缺少的 ID 仍保留於程式錯誤資訊，其他程式錯誤不會被當成缺件處理。

## 遊戲難度

進入流程為「選擇語言 → 選擇難度 → 開始遊戲」。體驗模式提供魔導輔助填詞與快速詞組點擊輸入；挑戰模式隱藏並停用這兩項打字輔助。兩種難度都保留填空選項、填空提示與標點略過設定。

遊戲上方會顯示目前難度，可重新選擇；重新選擇難度會開始新一局。換題、切換模式與重新開始會保留目前難度。

## 填空抽題

每句、每個語言各自維護一份洗牌詞庫：候選詞抽完一輪後才重新洗牌，且下一輪開頭會避開上一輪最後一個詞。選項順序與干擾詞也會洗牌。

抽題進度以 `localStorage` 儲存在目前瀏覽器，重開頁面會接續尚未抽完的詞庫。切換中文譯名不會重設進度；題庫變更時會重建該句的抽題進度。若儲存功能被停用，則退回目前頁面的記憶體記錄。

這會減少同一位使用者重複遇到同一空格，但不同使用者仍可能抽到相同題目。無痕模式、不同裝置或清除網站資料後不會共享進度；只有一個可用候選詞的句子也無法避免重複。

## 背景音樂

第一次選擇語言版本後，會播放 `public/audio/BGM_ORCH_570-天幕之下.ogg.mp3`，預設以 25% 音量循環播放，可使用上方滑桿調整音量。切換題目或模式不會重新載入音樂；手動暫停後，切換語言也會保留暫停狀態，再次播放會接續原本位置。BGM 與打字音效分別控制。

若瀏覽器阻擋有聲播放，或音檔載入失敗，頁面會顯示提示，可點擊 BGM 按鈕重試。音樂失敗不影響作答；已移除 YouTube 播放依賴。
