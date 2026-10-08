/**
 * 福爾摩鯊 即時打擊記錄 API（Google Apps Script）
 *
 * 安裝方式：
 *   1. 開啟球員名單的 Google 試算表 →「擴充功能」→「Apps Script」
 *   2. 刪除編輯器內原有內容，貼上本檔全部內容，並修改下方 PIN（記錄密碼）
 *   3. 「部署」→「新增部署作業」→ 類型選「網頁應用程式」
 *      執行身分：我　／　誰可以存取：所有人 → 部署，並授權
 *   4. 複製產生的網址（https://script.google.com/macros/s/.../exec）
 *
 * 運作方式：
 *   - 每一個打席寫入「打席紀錄」工作表（首次使用時自動建立）
 *   - 每次記錄後自動重算，並把各球員累計成績寫回球員名單工作表的統計欄位
 *   - 網站以 GET 讀取即時資料；記錄 App 以 POST 寫入（需密碼）
 */

const PIN = '0000';            // ★ 記錄密碼，請務必修改
const ROSTER_SHEET = '';       // 球員名單工作表名稱；留空則使用第一個工作表
const LOG_SHEET = '打席紀錄';
const LOG_HEAD = ['id', '記錄時間', '比賽日期', '對手', '局數', '背號', '姓名', '結果', '打點'];

// 打擊結果（工作表內以中文記錄）
const RESULTS = {
  '一壘安打': '1B', '二壘安打': '2B', '三壘安打': '3B', '全壘打': 'HR',
  '四壞球': 'BB', '觸身球': 'HBP', '失誤上壘': 'E', '野手選擇': 'FC',
  '三振': 'K', '滾地出局': 'GO', '飛球出局': 'FO', '犧牲觸擊': 'SH', '高飛犧牲打': 'SF'
};
const NOT_AB = ['BB', 'HBP', 'SH', 'SF'];   // 不計打數

function doGet() {
  return json_(snapshot_());
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: '資料格式錯誤' }); }
  if (String(body.pin) !== String(PIN)) return json_({ ok: false, error: '記錄密碼錯誤' });

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = logSheet_();
    if (body.action === 'add') {
      const items = Array.isArray(body.entries) ? body.entries : [body.entry];
      const seen = new Set(ids_(sh));
      const rows = [];
      items.forEach(function (it) {
        if (!it || !it.id || seen.has(String(it.id))) return;      // 重送不重複記錄
        if (!RESULTS[it.result]) throw new Error('未知的打擊結果：' + it.result);
        if (!it.name) throw new Error('缺少打者姓名');
        rows.push([String(it.id), new Date(it.ts || Date.now()), String(it.date || ''), String(it.opp || ''),
                   Number(it.inning) || '', String(it.num || ''), String(it.name), it.result, Number(it.rbi) || 0]);
        seen.add(String(it.id));
      });
      if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, LOG_HEAD.length).setValues(rows);
    } else if (body.action === 'delete') {
      const i = ids_(sh).indexOf(String(body.id));
      if (i >= 0) sh.deleteRow(i + 2);
    } else {
      return json_({ ok: false, error: '未知的動作' });
    }
    SpreadsheetApp.flush();
    try { writeBack_(); } catch (err) { console.warn('寫回球員名單失敗', err); }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
  return json_(snapshot_());
}

/* ---------- 讀取 ---------- */

function snapshot_() {
  return { ok: true, updated: new Date().toISOString(), roster: roster_(), log: readLog_() };
}

function rosterSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ROSTER_SHEET ? ss.getSheetByName(ROSTER_SHEET) : ss.getSheets()[0];
}

function roster_() {
  const v = rosterSheet_().getDataRange().getDisplayValues();
  const head = v[0].map(function (s) { return String(s).trim(); });
  const iNum = head.indexOf('背號'), iPhoto = head.indexOf('照片'), iName = head.indexOf('姓名');
  return v.slice(1)
    .filter(function (r) { return r[iName] && String(r[0]).trim().toLowerCase() !== 'total'; })
    .map(function (r) { return { num: String(r[iNum]).trim(), photo: iPhoto >= 0 ? String(r[iPhoto]).trim() : '', name: String(r[iName]).trim() }; });
}

function logSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(LOG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(LOG_SHEET);
    sh.getRange(1, 1, 1, LOG_HEAD.length).setValues([LOG_HEAD]).setFontWeight('bold');
    sh.setFrozenRows(1);
    ['A:A', 'C:D', 'F:F'].forEach(function (a) { sh.getRange(a).setNumberFormat('@'); });  // 純文字，避免被轉成日期或數字
    sh.getRange('B:B').setNumberFormat('yyyy/mm/dd hh:mm:ss');
  }
  return sh;
}

function ids_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); });
}

function readLog_() {
  const sh = logSheet_(), last = sh.getLastRow();
  if (last < 2) return [];
  const tz = Session.getScriptTimeZone();
  return sh.getRange(2, 1, last - 1, LOG_HEAD.length).getValues().map(function (r) {
    const d = r[2] instanceof Date ? Utilities.formatDate(r[2], tz, 'yyyy-MM-dd') : String(r[2]);
    return { id: String(r[0]), ts: r[1] instanceof Date ? r[1].toISOString() : String(r[1]), date: d,
             opp: String(r[3]), inning: Number(r[4]) || '', num: String(r[5]), name: String(r[6]),
             result: String(r[7]), rbi: Number(r[8]) || 0 };
  }).filter(function (r) { return r.name && RESULTS[r.result]; });
}

/* ---------- 統計與寫回 ---------- */

function tally_(log) {
  const m = {};
  log.forEach(function (r) {
    const c = RESULTS[r.result]; if (!c) return;
    const p = m[r.name] || (m[r.name] = { pa: 0, ab: 0, h: 0, rbi: 0, s: 0, d: 0, t: 0, hr: 0, roe: 0, so: 0, bb: 0, hbp: 0, sf: 0 });
    p.pa++; p.rbi += Number(r.rbi) || 0;
    if (NOT_AB.indexOf(c) < 0) p.ab++;
    if (c === '1B') { p.s++; p.h++; } else if (c === '2B') { p.d++; p.h++; }
    else if (c === '3B') { p.t++; p.h++; } else if (c === 'HR') { p.hr++; p.h++; }
    else if (c === 'BB') p.bb++; else if (c === 'HBP') p.hbp++;
    else if (c === 'E') p.roe++; else if (c === 'K') p.so++; else if (c === 'SF') p.sf++;
  });
  Object.keys(m).forEach(function (k) {
    const p = m[k], tb = p.s + 2 * p.d + 3 * p.t + 4 * p.hr, r3 = function (x) { return Math.round(x * 1000) / 1000; };
    p.avg = p.ab ? r3(p.h / p.ab) : '';
    p.obp = (p.ab + p.bb + p.hbp + p.sf) ? r3((p.h + p.bb + p.hbp) / (p.ab + p.bb + p.hbp + p.sf)) : '';
    p.slg = p.ab ? r3(tb / p.ab) : '';
  });
  return m;
}

// 把累計成績寫回球員名單工作表（保留 Total 列等公式）
function writeBack_() {
  const sh = rosterSheet_();
  const COLS = { '打席': 'pa', '打數': 'ab', '安打數': 'h', '打擊率': 'avg', '打點': 'rbi', '一壘安打': 's', '二壘安打': 'd',
                 '三壘安打': 't', '全壘打': 'hr', '失誤上壘': 'roe', '三振': 'so', '四壞球': 'bb', '上壘率': 'obp', '長打率': 'slg' };
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow < 2) return;
  const head = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(function (s) { return String(s).trim(); });
  const iName = head.indexOf('姓名');
  const statCols = head.map(function (h, i) { return COLS[h] ? i : -1; }).filter(function (i) { return i >= 0; });
  if (iName < 0 || !statCols.length) return;
  const c0 = Math.min.apply(null, statCols), c1 = Math.max.apply(null, statCols);
  const rng = sh.getRange(2, c0 + 1, lastRow - 1, c1 - c0 + 1);
  const vals = rng.getValues(), fx = rng.getFormulas();
  const names = sh.getRange(2, iName + 1, lastRow - 1, 1).getValues();
  const firstCol = sh.getRange(2, 1, lastRow - 1, 1).getValues();
  const stats = tally_(readLog_());
  const out = vals.map(function (row, r) {
    const name = String(names[r][0]).trim();
    const isPlayer = name && String(firstCol[r][0]).trim().toLowerCase() !== 'total';
    return row.map(function (v, j) {
      const key = COLS[head[c0 + j]];
      if (isPlayer && key) { const p = stats[name]; return p ? p[key] : (key === 'avg' || key === 'obp' || key === 'slg' ? '' : 0); }
      return fx[r][j] || v;
    });
  });
  rng.setValues(out);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
