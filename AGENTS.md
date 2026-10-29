# 專案開發指引

## 專案與範圍

- 本專案是 FFXIV 天幕魔導城台詞打字與填空遊戲，採 Vite + TypeScript、原生 DOM、Tailwind CSS 3，維持純前端。
- 使用繁體中文溝通與撰寫專案說明，程式識別字使用英文。
- 先閱讀 `README.md` 與此次修改涉及的模組。以目前程式與 `package.json` 為準，避免只依舊版 HTML 推斷行為。
- `ffxiv_praetorium_typing.html` 是遷移前的對照檔；一般功能修改應落在 `index.html` 與 `src/`，不需同步改寫對照檔。
- 依需求做局部修改；新增框架、後端或調整計分規則時，先確認它們屬於本次需求範圍。

## 檔案分工

- `index.html`：頁面結構。元素 ID 與事件、渲染程式相互依賴，修改時一併檢查引用。
- `src/main.ts`：程式入口與樣式載入。
- `src/data/praetorium.ts`：繁中、日文、英文台詞及各語言的填空詞、干擾選項。
- `src/game/types.ts`、`state.ts`：領域型別與遊戲狀態。
- `src/game/text.ts`：文字正規化、語言選取、標點略過。
- `src/game/app.ts`：目前的遊戲控制、渲染、計分與結算。新增可獨立測試的遊戲規則時，優先抽成不依賴 DOM 的函式。
- `src/ui/events.ts`：使用者操作與輸入法事件；`src/ui/dom.ts` 提供具型別及存在檢查的 DOM 存取。
- `src/services/`：音效與 YouTube 控制，避免將外部播放邏輯混入文字比對或計分。
- `src/styles/`：Tailwind 入口與主題樣式。新增 class 時須確認 Tailwind 能從原始碼掃描到完整名稱。
- `public/images/`：圖片資產；新增圖片使用獨立檔案。
- `tests/game.test.ts`：以 Vitest + happy-dom 執行的互動測試。

## 行為與實作原則

- 保留繁中、日文、英文模式；新增題目時補齊 `ScriptLine` 所需欄位，確認各語言填空詞確實存在於對應台詞。
- 修改文字比對時，保留既有譯名容錯、英文大小寫處理及標點設定，除非需求明確要求變更。
- 中文與日文輸入須考慮 IME 組字期間與確認選字的 Enter；不要在組字尚未完成時判錯或送出答案。
- 修改換題、重開或模式切換時，檢查延遲回呼是否仍屬於目前的一局與題目，避免重複計分或舊計時器推進新局。
- 既有輔助作答與計分規則是目前行為，不代表公平競賽規格。調整時說明對字速、精準度、Combo 與得分的影響。
- 維持 TypeScript strict；優先補正確的型別，避免以 `any` 或停用檢查掩蓋問題。
- 題目和使用者輸入優先透過 `textContent` 呈現；若必須產生 HTML，避免直接插入未受信任內容。
- 保留素材版權標示。音效與 YouTube 的載入或播放失敗不應阻止作答。
- 不直接編輯 `dist/`、`node_modules/` 或 `.npm-cache/`；依賴異動需同步更新 `package-lock.json`。

## 開發與驗證

- 使用 npm 與現有 lockfile。`npm run dev` 啟動開發伺服器；`npm run preview` 預覽正式建置。
- 程式碼異動後執行 `npm test` 與 `npm run build`；後者已包含 TypeScript 型別檢查。僅需單獨檢查型別時使用 `npm run typecheck`。
- 針對新遊戲規則與錯誤修正增加能驗證行為的測試；純文件修改不必重跑遊戲測試。
- happy-dom 測試不能證明真實瀏覽器的 IME、焦點、視覺版面、Web Audio 或 YouTube 播放正常。涉及這些行為時，進行適當的瀏覽器驗證；無法驗證則明確說明。
- 完成時簡述修改內容、執行的驗證與尚未驗證的限制，不宣稱未執行的檢查已通過。
