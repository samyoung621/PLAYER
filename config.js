// 福爾摩鯊網站設定
// API_URL：Apps Script 部署後的網頁應用程式網址（https://script.google.com/macros/s/.../exec）
// 留空時，成績頁改讀 Google 試算表發佈的 CSV（更新會延遲數分鐘），記錄 App 無法使用。
window.FS_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbynIs_SDM-hkKp8dIWEBvLX_e85_dP6U5LWFg9x6n4Co438bkGBO88c-bXU14yd-dGP/exec",
  REFRESH_SECONDS: 15   // 成績頁自動更新間隔（秒）
};
