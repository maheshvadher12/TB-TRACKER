/**
 * TB FUP Tracker – Sync Server (Google Apps Script)
 * Data is stored in a Google Sheet (tab name: "patients") of YOUR Google account.
 * Every phone uses the same Web App URL and the same SECRET KEY below.
 */
const KEY   = 'CHANGE_THIS_SECRET_KEY';   // <-- apni gupt key (dareke phone ma same)
const SHEET = 'patients';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SHEET);
  if (!s) { s = ss.insertSheet(SHEET); s.appendRow(['uid', 'json', 'deleted', 'version']); }
  return s;
}
function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
function doGet() { return out_({ ok: true, msg: 'TB sync server is running' }); }

function doPost(e) {
  let req;
  try { req = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, err: 'Bad request' }); }
  if (req.key !== KEY) return out_({ ok: false, err: 'key' });
  if (req.action === 'ping') return out_({ ok: true });
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return out_(sync_(req)); } finally { lock.releaseLock(); }
}

function sync_(req) {
  const sh = sheet_(), last = sh.getLastRow();
  const vals = last > 1 ? sh.getRange(2, 1, last - 1, 4).getValues() : [];
  const idx = {}; let maxV = 0;
  vals.forEach(function (r, i) { idx[String(r[0])] = i; if (+r[3] > maxV) maxV = +r[3]; });
  let ver = Math.max(Date.now(), maxV + 1);
  const rej = [], touched = {};
  let changed = false;

  (req.items || []).forEach(function (it) {
    const u = String(it.uid), i = idx[u];
    if (i !== undefined) {
      if (+vals[i][3] > (+it.base || 0)) { rej.push(u); return; }   // someone else changed it meanwhile
      vals[i] = [u, it.del ? '' : String(it.d), it.del ? 1 : 0, ver++];
      touched[u] = 1; changed = true;
    } else {
      vals.push([u, it.del ? '' : String(it.d), it.del ? 1 : 0, ver++]);
      idx[u] = vals.length - 1; touched[u] = 1; changed = true;
    }
  });

  if (changed) {
    sh.getRange(2, 2, vals.length, 1).setNumberFormat('@');
    sh.getRange(2, 1, vals.length, 4).setValues(vals);
  }
  const since = +req.since || 0, items = [];
  let top = 0;
  vals.forEach(function (r) {
    const v = +r[3]; if (v > top) top = v;
    if (v > since || rej.indexOf(String(r[0])) >= 0) {
      items.push({ uid: String(r[0]), d: r[2] ? null : String(r[1]), del: r[2] ? 1 : 0, sv: v });
    }
  });
  return { ok: true, items: items, rej: rej, since: top };
}
