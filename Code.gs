/**
 * SEO Daily — team leaderboard backend.
 * Paste this whole file into Extensions → Apps Script in your Google Sheet,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 *
 * To reset everyone's progress (new season): select resetLeaderboard in the
 * toolbar and click Run. Every player starts from zero the next time they open the quiz.
 */
const SHEET_NAME = 'Scores';
const HEADERS = ['id', 'name', 'xp', 'streak', 'bestStreak', 'lastDaily', 'recent', 'updated'];

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function season_() {
  return PropertiesService.getScriptProperties().getProperty('season') || '';
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function num_(v, max) {
  const n = Number(v);
  return isFinite(n) && n >= 0 ? Math.min(Math.round(n), max) : 0;
}

function recent_(v) {
  const out = {};
  if (v && typeof v === 'object') {
    Object.keys(v).slice(0, 31).forEach(function (k) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(k)) out[k] = num_(v[k], 10);
    });
  }
  return out;
}

function doGet() {
  const values = sheet_().getDataRange().getDisplayValues().slice(1);
  const rows = values.filter(function (r) { return r[0]; }).map(function (r) {
    let recent = {};
    try { recent = recent_(JSON.parse(r[6] || '{}')); } catch (e) {}
    return {
      id: r[0], name: r[1], xp: num_(r[2], 1e7), streak: num_(r[3], 5000),
      bestStreak: num_(r[4], 5000), lastDaily: r[5], recent: recent
    };
  });
  return json_({ season: season_(), rows: rows });
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  const id = String(d.id || '');
  const name = String(d.name || '').replace(/\s+/g, ' ').trim().slice(0, 30);
  if (!/^[a-f0-9]{16,40}$/.test(id) || !name) return json_({ ok: false, error: 'bad player' });
  if (String(d.season || '') !== season_()) return json_({ ok: false, error: 'old season' });
  const lastDaily = /^\d{4}-\d{2}-\d{2}$/.test(String(d.lastDaily || '')) ? String(d.lastDaily) : '';
  const row = [id, name, num_(d.xp, 1e7), num_(d.streak, 5000), num_(d.bestStreak, 5000),
               lastDaily, JSON.stringify(recent_(d.recent)), new Date().toISOString()];

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues() : [];
    let r = -1;
    for (let i = 0; i < ids.length; i++) { if (ids[i][0] === id) { r = i + 2; break; } }
    if (r === -1) {
      if (sh.getLastRow() > 500) return json_({ ok: false, error: 'full' });
      r = sh.getLastRow() + 1;
    }
    const range = sh.getRange(r, 1, 1, row.length);
    range.setNumberFormat('@');   // keep everything as plain text (no date or formula parsing)
    range.setValues([row]);
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

/** Run this from the Apps Script editor to start a new season and wipe everyone's progress. */
function resetLeaderboard() {
  PropertiesService.getScriptProperties().setProperty('season', new Date().toISOString());
  const sh = sheet_();
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
}
