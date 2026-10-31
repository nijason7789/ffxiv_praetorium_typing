# 專案開發指引

## 專案與範圍

- 本專案是 FFXIV 天幕魔導城台詞打字與填空遊戲，採 Vite + TypeScript、原生 DOM、Tailwind CSS 3，維持純前端。
- 使用繁體中文溝通與撰寫專案說明，程式識別字使用英文。
- 先閱讀 `README.md` 與此次修改涉及的模組。以目前程式與 `package.json` 為準，避免只依舊版 HTML 推斷行為。
- `ffxiv_praetorium_typing.html` 是遷移前的對照檔；一般功能修改應落在 `index.html` 與 `src/`，不需同步改寫對照檔。
- 依需求做局部修改；新增框架、後端或調整計分規則時，先確認它們屬於本次需求範圍。

## 檔案分工

- `index.html`：文件資訊、body 樣式與 `#app` 掛載點。
- `src/main.ts`：樣式載入並呼叫 `src/ui/bootstrap.ts`；先組裝頁面，再檢查元件與初始化事件。
- `src/ui/components/*.html`：依畫面區塊拆分的靜態模板；`page.html` 為外層版型，`game-stage.html` 組合打字、填空與結算。元素 ID 與控制器相互依賴，修改時一併檢查引用。
- `src/ui/page.ts`：以 Vite `?raw` 匯入並組裝可信的本機模板，保持 header／main／footer 位於 body 下；`data-public-src` 素材路徑依 Vite BASE_URL 設定。
- `src/data/praetorium.ts`：繁中、日文、英文台詞及各語言的填空詞、干擾選項。
- `src/game/types.ts`、`state.ts`：領域型別與遊戲狀態。
- `src/game/text.ts`：文字正規化、語言選取、標點略過。
- `src/game/difficulty.ts`：四種難度名稱、題目呈現與唯讀功能權限設定；控制器、事件及文字處理共用 `getDifficultyRules()`，模式顯示與切換共用 `canSelectMode()`。限制需同時涵蓋 UI 與事件入口，避免在其他模組直接依難度名稱推斷權限。
- `src/game/fixed-mask.ts`、`src/data/savage-masks.ts`、`src/data/ultimate-masks.ts`：純遮罩規則與完整 17 句三語固定設定；絕在零式規則上增加詞組，與既有 clozePool／抽題歷史分離。變更固定設定需更新出題版本及 `docs/FIXED-MASK-CATALOG.md` 的範例。
- `src/ui/memory-prototype.ts`：以 `?prototype=memory` 進入的獨立單句原型，可選全部 17 句。正式選單已接入四種難度及完整場次，範圍見 `docs/FIXED-DIFFICULTY-DRAFT.md`。
- `src/game/input-source.ts`：編輯前後的字元來源追蹤；自動標點及輔助字元的來源需跨後續輸入保留。
- `src/game/statistics.ts`：純計時與統計規則；控制器負責傳入時間、有效題目與保存結算結果。
- `src/game/app.ts`：遊戲控制、渲染與結算；`src/game/scoring.ts`：不依賴 DOM 的計分規則與同局獎勵紀錄。新增可獨立測試的遊戲規則時，優先抽成純函式。
- `src/ui/events.ts`：透過 `initializeApp()` 明確初始化操作與輸入法事件，重複呼叫不重綁；`src/ui/dom.ts` 提供具型別及存在檢查的 DOM 存取。
- `src/ui/required-elements.ts`：啟動前的必要靜態 ID 清單，新增控制器依賴時同步更新；動態產生的元素由使用時檢查。
- `src/ui/page-error.ts`：獨立錯誤畫面與缺件錯誤界線；錯誤復原不可再依賴原本的必要 ID，且不能吞掉其他程式錯誤。
- `src/ui/ime.ts`：一般打字與填空的組字事件保護。換題、重新抽詞、重開或結算時需清除保護狀態，避免舊組字事件套用至新題目。
- `src/ui/input-restrictions.ts`：正式作答欄與單句原型共用的貼上／拖放限制、三秒提示及事件去重；依難度的 `paste`／`textDrop` 權限判斷，不以字數或鍵盤事件猜測 IME。題目／場次重設、結算與頁面錯誤需呼叫 `resetInputRestrictions()`；`inputRestrictionNotice` 是模組動態建立的共用狀態提示，不列入靜態必要 ID。
- `src/services/clipboard.ts`：Clipboard API 與備援複製；`src/ui/copy-feedback.ts`：共用複製提示及可取消的三秒計時器。
- `src/services/`：打字音效與本機 BGM 控制，避免將播放邏輯混入文字比對或計分。
- `src/styles/`：Tailwind 入口與主題樣式。新增 class 時須確認 Tailwind 能從原始碼掃描到完整名稱。
- `public/images/`：圖片資產；新增圖片使用獨立檔案。
- `public/audio/`：本機 BGM 音檔，隨靜態網站一併部署。
- `tests/game.test.ts`：以 Vitest + happy-dom 執行的互動測試。
- `tests/scoring.test.ts`、`tests/scoring.integration.test.ts`：BDD 計分情境，分別驗證純規則與 DOM 整合；功能決議與進度見 `docs/BDD-FEATURE-CATALOG.md`。
- `tests/input-source.test.ts`：手動／輔助／自動標點的計分與統計邊界。
- `tests/statistics.test.ts`、`tests/session.integration.test.ts`：計時／評級規則，以及閱讀、單句練習、完成率與結算鎖定的整合情境。
- `tests/ime.integration.test.ts`：選字 Enter、事件順序、長按、空白答案與換題重設的 BDD 情境；模擬事件不取代作業系統輸入法驗收。
- `tests/clipboard.integration.test.ts`：複製成功、備援、最終失敗、焦點還原及提示競態的 BDD 情境。
- `tests/audio.test.ts`、`tests/audio.integration.test.ts`：音效初始化／恢復／節點失敗，以及不中斷遊戲或 BGM 的 BDD 情境。
- `tests/page-error.test.ts`、`tests/page-error.integration.test.ts`：必要元件缺失、停止場次、焦點與重新整理，以及錯誤界線的 BDD 情境。
- `tests/helpers/page.ts`：整合測試使用正式模板與組裝器，不另複製整份 HTML；`tests/page.test.ts` 驗證組裝、部署素材路徑及啟動順序。
- `tests/fixed-mask.test.ts`、`tests/memory-prototype.test.ts`：固定多處遮罩、絕包含零式遮罩並保留文字、無效設定，以及單句原型作答／重開／IME 的 BDD 情境。
- `tests/memory-session.integration.test.ts`：正式零式／絕三語完整三章通關、無輔助及導覽、嚴格標點、偏好恢復、IME、舊計時器取消與替代譯名的 BDD 情境。
- `tests/input-restrictions.integration.test.ts`：貼上／拖放權限、beforeinput 備援、原文／選取／計時保留、提示競態、普通填空、IME、換題／結算與錯誤情境；規格及裝置驗收見 `docs/BDD-INPUT-RESTRICTIONS.md`。

## 行為與實作原則

- 保留繁中、日文、英文模式；新增題目時補齊 `ScriptLine` 所需欄位，確認各語言填空詞確實存在於對應台詞。
- 修改文字比對時，保留既有譯名容錯、英文大小寫處理及標點設定，除非需求明確要求變更。
- 中文與日文輸入須考慮 IME 組字期間與確認選字的 Enter；不要在組字尚未完成時判錯或送出答案。
- 修改換題、重開或模式切換時，檢查延遲回呼是否仍屬於目前的一局與題目，避免重複計分或舊計時器推進新局。
- 既有輔助作答與計分規則是目前行為，不代表公平競賽規格。調整時說明對字速、精準度、Combo 與得分的影響。
- 維持 TypeScript strict；優先補正確的型別，避免以 `any` 或停用檢查掩蓋問題。
- 題目和使用者輸入優先透過 `textContent` 呈現；若必須產生 HTML，避免直接插入未受信任內容。
- 頁面模板只在啟動時組裝一次；不要為換題重建整頁，以免丟失事件、IME、BGM 與焦點狀態。模板不接受使用者字串插值，遊戲動態渲染仍使用既有控制器。
- 保留素材版權標示。音效與 BGM 的載入或播放失敗不應阻止作答。
- 音效恢復尚未完成時略過音符，不累積延後播放；音符結束或建立失敗時安全中斷節點連線，清理失敗也不能向遊戲拋錯。
- 不直接編輯 `dist/`、`node_modules/` 或 `.npm-cache/`；依賴異動需同步更新 `package-lock.json`。

## 開發與驗證

- 使用 npm 與現有 lockfile。`npm run dev` 啟動開發伺服器；`npm run preview` 預覽正式建置。
- 程式碼異動後執行 `npm test` 與 `npm run build`；後者已包含 TypeScript 型別檢查。僅需單獨檢查型別時使用 `npm run typecheck`。
- 針對新遊戲規則與錯誤修正增加能驗證行為的測試；純文件修改不必重跑遊戲測試。
- happy-dom 測試不能證明真實瀏覽器的 IME、焦點、視覺版面、Web Audio 或音檔播放正常。涉及這些行為時，進行適當的瀏覽器驗證；無法驗證則明確說明。
- 完成時簡述修改內容、執行的驗證與尚未驗證的限制，不宣稱未執行的檢查已通過。
