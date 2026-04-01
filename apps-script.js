// ═══════════════════════════════════════════════════════════════
// TOEIC 模擬測驗 — Google Apps Script
//
// 使用步驟：
// 1. 從 Google Sheets「擴充功能 → Apps Script」開啟
// 2. 貼入此內容，儲存
// 3. 執行 setupSheets() 初始化兩張工作表
// 4. 部署 → 新增部署 → 網頁應用程式
//    - Execute as: Me  /  Who has access: Anyone
// 5. 複製 Web App URL 貼入 test-01.html 與 practice.html 的 APPS_SCRIPT_URL
// ═══════════════════════════════════════════════════════════════

const SIM_SHEET   = 'TOEIC紀錄';       // 模擬測驗紀錄
const PRAC_SHEET  = '單項練習紀錄';     // 單項練習紀錄

// ── 接收前端 POST ──────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    if (data.type === 'practice') {
      handlePractice(ss, data);
    } else {
      handleSimulation(ss, data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ════════════════════════════════════════
// 模擬測驗（100 題）
// ════════════════════════════════════════
function handleSimulation(ss, data) {
  let sheet = ss.getSheetByName(SIM_SHEET);
  if (!sheet) { sheet = ss.insertSheet(SIM_SHEET); buildSimHeader(sheet); }
  if (sheet.getLastRow() === 0) buildSimHeader(sheet);
  sheet.appendRow(buildSimRow(data));
}

function buildSimHeader(sheet) {
  const h = ['日期時間','姓名','Part5分數','Part6分數','Part7分數','總分'];
  for (let q = 101; q <= 200; q++) { h.push('Q'+q+'_選項'); h.push('Q'+q+'_對錯'); }
  sheet.appendRow(h);
  sheet.setFrozenRows(1);
  styleHeader(sheet, h.length);
  sheet.setColumnWidth(1, 160); sheet.setColumnWidth(2, 100);
  for (let c = 3; c <= 6;  c++) sheet.setColumnWidth(c, 70);
  for (let c = 7; c <= h.length; c++) sheet.setColumnWidth(c, 52);
}

function buildSimRow(data) {
  const row = [
    data.timestamp, data.name || '匿名',
    data.score5 || 0, data.score6 || 0, data.score7 || 0, data.total || 0
  ];
  for (let q = 101; q <= 200; q++) {
    const a = data.answers && data.answers[q];
    row.push(a ? a.selectedLabel : '—');
    row.push(a ? (a.correct ? '✓' : '✗') : '—');
  }
  return row;
}

// ════════════════════════════════════════
// 單項練習（題數不固定，最多 30 題）
// ════════════════════════════════════════
const MAX_PRAC_Q = 30;

function handlePractice(ss, data) {
  let sheet = ss.getSheetByName(PRAC_SHEET);
  if (!sheet) { sheet = ss.insertSheet(PRAC_SHEET); buildPracHeader(sheet); }
  if (sheet.getLastRow() === 0) buildPracHeader(sheet);
  sheet.appendRow(buildPracRow(data));
}

function buildPracHeader(sheet) {
  const h = ['日期時間','姓名','練習類型','得分','總題數','正確率'];
  for (let i = 1; i <= MAX_PRAC_Q; i++) {
    h.push('Q'+i+'_題號');
    h.push('Q'+i+'_選項');
    h.push('Q'+i+'_對錯');
  }
  sheet.appendRow(h);
  sheet.setFrozenRows(1);
  styleHeader(sheet, h.length);
  sheet.setColumnWidth(1, 160); sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 160); // 練習類型
  for (let c = 4; c <= 6;  c++) sheet.setColumnWidth(c, 70);
  for (let c = 7; c <= h.length; c++) sheet.setColumnWidth(c, 60);
}

function buildPracRow(data) {
  const pct = data.total > 0
    ? Math.round((data.score / data.total) * 100) + '%'
    : '0%';
  const row = [
    data.timestamp,
    data.name  || '匿名',
    data.label || '單項練習',
    data.score || 0,
    data.total || 0,
    pct
  ];
  const answers = data.answers || [];  // [{qn, selectedLabel, correct}, ...]
  for (let i = 0; i < MAX_PRAC_Q; i++) {
    const a = answers[i];
    row.push(a ? 'Q' + a.qn : '—');
    row.push(a ? a.selectedLabel       : '—');
    row.push(a ? (a.correct ? '✓' : '✗') : '—');
  }
  return row;
}

// ════════════════════════════════════════
// 共用：標題列樣式
// ════════════════════════════════════════
function styleHeader(sheet, len) {
  const r = sheet.getRange(1, 1, 1, len);
  r.setBackground('#1a1a1a');
  r.setFontColor('#ffffff');
  r.setFontWeight('bold');
  r.setHorizontalAlignment('center');
}

// ════════════════════════════════════════
// 初始化（第一次執行一次）
// ════════════════════════════════════════
function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  [SIM_SHEET, PRAC_SHEET].forEach(name => {
    if (!ss.getSheetByName(name)) {
      const sheet = ss.insertSheet(name);
      if (name === SIM_SHEET)  buildSimHeader(sheet);
      else                     buildPracHeader(sheet);
      Logger.log('建立工作表：' + name);
    } else {
      Logger.log('已存在：' + name);
    }
  });
}

// 舊版相容（原 setupSheet 仍可使用）
function setupSheet() { setupSheets(); }
