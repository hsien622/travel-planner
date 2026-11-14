# AGENTS.md：自由行排程網站

## 1. 專案目的
給台灣旅客使用的「任意目的地」自由行排程網站，目前收錄首爾行程當範例。每個行程是一份資料檔，網站自動長出頁面。使用者可勾選完成、上下調整順序，進度存在瀏覽器。
重點：新增行程只需「新增一個 JSON ＋ 登記一筆」，不改版型與程式。

## 2. 技術限制（不可違反）
- 純靜態：HTML、CSS、原生 JavaScript。不用框架、不用打包工具、不用外部 CDN 或字體。
- 要能部署在 GitHub Pages；所有路徑用相對路徑。
- 資料用 `fetch` 讀取，所以預覽要用伺服器（`python -m http.server`），不能雙擊 HTML。
- 動態文字一律用 `textContent`，不用 `innerHTML` 塞資料。
- localStorage 讀寫必須包 try/catch。

## 3. 檔案結構
```
index.html          首頁（行程卡片列表）
trip.html           行程頁版型，網址 trip.html?id=行程id
css/style.css       唯一樣式檔（含列印樣式）
tools/validate.py   驗證腳本
js/app.js           唯一程式檔（首頁與行程頁共用）
data/trips.json     行程清單
data/<id>.json      單一行程內容
```
- 行程 id：小寫英數字與連字號，格式 `城市英文-天數d夜數n`，例如 `seoul-3d2n`、`tokyo-4d3n`。檔名必須等於 id。

## 4. 視覺風格
- 淺藍底 `#e3eefa`、卡片 `#f8fbff`；深藍 `#1f3a5f` 用於標題與所有卡片、按鈕的邊界（`--border`）；朱紅 `#c8553d` 只作強調（完成進度、標題底線、待確認標籤）；進度條底色與次要分隔線用淡藍 `#b9d0e8`（`--line`）。
- 系統字體，中文優先；圓角 10px；單欄版面，最大寬度 760px，手機優先。
- 不使用圖片、emoji 以外的裝飾。

## 5. 資料格式 `data/<id>.json`
```json
{ "id": "seoul-3d2n", "title": "標題", "city": "首爾", "updated": "YYYY-MM-DD",
  "currency": "KRW", "units_per_twd": 44, "summary": "一句話",
  "emergency": [ {"label":"駐外單位 24 小時","value":"電話"} ],
  "checklist": [ {"id":"c01","text":"行前待辦"} ],
  "guides": [ {"id":"g01","title":"入境與簽證","status":"verified","source":"https://…","points":["重點一","重點二"]} ],
  "days": [ { "title": "第1天：主題",
    "items": [ { "id": "d1-01", "time": "09:30", "name": "名稱",
      "type": "transport|food|sight|stay|tips",
      "cost": 1550, "note": "備註", "source": "https://… 或 自行整理",
      "status": "verified|community|tbd" } ] } ] }
```
- `items[].id` 在同一檔案內唯一，格式 `d<天>-<兩位序號>`。
- `currency` 為當地幣別代碼（KRW、JPY、USD、EUR、THB、TWD）；`units_per_twd` 是 1 新台幣可換多少當地幣，若是假設要在 `summary` 寫明。幣別是 TWD 時填 1。
- `cost` 的單位就是 `currency`；沒有費用填 `null`（不要填 0）。`type` 為 `tips` 的項目不計費用。
- `status`：`verified` 官方來源（外交部領事事務局 boca.gov.tw 的該國頁面、該國官方觀光局或政府網站）；`community` 民間資料；`tbd` 待確認或教學假設。

- `emergency`（緊急聯絡）與 `checklist`（行前清單，id 為 `c01` 格式）與 `guides`（旅遊須知，id 為 `g01` 格式）為選填，但新行程應盡量提供；電話必須來自該國官方來源。`guides` 建議涵蓋入境與簽證、交通、退稅、海關、法律與安全、緊急聯絡，每張卡 3 到 5 個重點，用自己的話摘要，並標示官方或民間來源。

## 5-1. 網站功能（由 app.js 自動提供，不需在資料裡設定）
旅遊須知卡片（可展開）、已知費用與依類型統計、新台幣預算比對、可調匯率、只看待確認、勾選與排序、首頁進度、列印版面。這些都從資料欄位計算，新增行程不必改程式。

## 6. 新增行程的步驟（AI 照做）
1. 在 `data/` 新增 `<id>.json`，欄位照第 5 節。
2. 在 `data/trips.json` 新增一筆 `{id,title,city,days,summary,updated}`，`days` 為天數。
3. 不修改 HTML、CSS、JS，除非使用者明確要求。
4. 執行 `python3 tools/validate.py`，必須顯示「通過」才算完成；有錯誤就修正再跑，不可略過。
5. 回報時列出哪些項目是 `tbd`。

## 7. 內容規則
- 營業時間、票價、交通時間、餐廳推薦不得憑記憶編造；查不到就 `tbd` 並在 `note` 寫「待確認」。
- 有來源就填 `source`；來源是自己整理就寫「自行整理」。
- 官方與民間資料分開標示，不可把民間資料標成 `verified`。
- `verified` 的 `source` 必須是能找到該內容的**具體頁面**（例如該國入境須知頁），不可只放網站首頁；找不到具體官方頁面就改標 `community` 或 `tbd`。
- 一個項目或卡片若混合官方與非官方內容，整體用較低的等級標示。
- 制度有施行日期時（例如退稅新制），要寫明適用日期；已廢止的舊制規定（如特殊包裝、舊門檻）不得殘留在內容裡。
- 價格若是假設，`note` 必須寫「教學假設」。
- 不整段複製他人文章，用自己的話摘要。
- 規定可能變動的內容（退稅、免簽、票價），`note` 要提醒出發前再查官方。
- 換目的地時，入境、簽證、緊急電話等資訊必須重新查該國官方來源，不可沿用其他國家的內容。

## 8. 禁止事項
- 不新增框架或外部資源；不新增第二個 CSS／JS 檔。
- 不改動既有行程的項目 id（會讓使用者已勾選的進度失效）。
- 不刪除使用者資料以外的 localStorage 鍵；鍵名固定為 `planner:<行程id>`。

## 9. 給 AI 的範例指令與驗收
- 範例：「請依 AGENTS.md 新增東京 4 天 3 夜行程，幣別 JPY，每天 5 到 8 個項目。」
- 常見錯誤：`verified` 只附網站首頁網址、混用新舊制度規定、把一般旅遊常識標成官方資料、費用填 0（應填 `null`）、忘記登記 `trips.json`、把民間資料標成 `verified`、沿用其他國家的緊急電話或入境規定、改動既有項目 id。
- 驗收表：① validate.py 通過 ② 只新增或修改 `data/` 內檔案 ③ 所有 `tbd` 項目已在回報中列出 ④ 沒有編造票價、營業時間、電話。
