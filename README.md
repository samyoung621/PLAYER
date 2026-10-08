# 福爾摩鯊 打擊成績網站

- 成績頁：https://samyoung621.github.io/PLAYER/
- 記錄台：https://samyoung621.github.io/PLAYER/record.html

## 檔案
| 檔案 | 用途 |
|---|---|
| `index.html` | 成績頁（即時動態、排行、球員卡、完整數據） |
| `record.html` | 比賽即時記錄台（手機使用） |
| `config.js` | 設定 `API_URL`（Apps Script 網址） |
| `stats.js` | 打擊結果定義與統計公式 |
| `apps-script/Code.gs` | 貼到 Google 試算表 Apps Script 的後端程式 |

## 啟用即時記錄（只需做一次）
1. 開啟球員名單 Google 試算表 →「擴充功能」→「Apps Script」。
2. 刪除原有內容，貼上 `apps-script/Code.gs` 全部內容；把第一行設定 `PIN` 改成球隊的記錄密碼，按儲存。
3. 「部署」→「新增部署作業」→ 齒輪選「網頁應用程式」；執行身分「我」、誰可以存取「所有人」→ 部署，依指示授權。
4. 複製網頁應用程式網址，填入 `config.js` 的 `API_URL`。

修改 `Code.gs` 後須「管理部署作業」→ 編輯 → 版本選「新版本」再部署，網址不變。

## 注意
- 每個打席存於試算表「打席紀錄」工作表，並自動彙整寫回球員名單的統計欄位；啟用後請勿再手動修改這些統計欄位。
- 新增球員：直接在球員名單工作表加一列（背號、照片、姓名）。
