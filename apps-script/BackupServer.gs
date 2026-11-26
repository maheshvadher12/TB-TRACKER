/**
 * TB FUP Tracker – Auto Backup receiver (Google Apps Script)
 * The app sends weekly backups here; this script saves them as files in YOUR Google Drive:
 *   My Drive / TB Tracker Auto Backup / Backups          (full data, .json)
 *   My Drive / TB Tracker Auto Backup / Monthly Reports  (previous month report .pdf + figures .json)
 * Actions: ping, save (backup upload), latest (newest backup, used by Restore).
 * Only requests that carry the correct KEY and the Gmail of the account that owns this script are accepted.
 */
const KEY  = 'pransli123';     // <-- your own secret key (same key in the app)
const ROOT = 'TB Tracker Auto Backup';

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  if (e && e.parameter && e.parameter.reset) return resetPage_(e.parameter.reset);
  return out_({ ok: true, msg: 'TB backup server is running' });
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, err: 'Bad request' }); }
  if (req.key !== KEY) return out_({ ok: false, err: 'key' });
  var owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (owner && String(req.email || '').toLowerCase() !== owner) return out_({ ok: false, err: 'email' });
  if (req.action === 'ping') return out_({ ok: true });
  if (req.action === 'resetRequest') {
    try { return out_(resetRequest_(owner)); } catch (x) { return out_({ ok: false, err: String(x) }); }
  }
  if (req.action === 'resetFetch') return out_(resetFetch_());
  if (req.action === 'latest') {
    try { return out_(latest_()); } catch (x) { return out_({ ok: false, err: String(x) }); }
  }
  if (req.action === 'save') {
    try { return out_(save_(req)); } catch (x) { return out_({ ok: false, err: String(x) }); }
  }
  return out_({ ok: false, err: 'Unknown action' });
}

function folder_(name) {
  var it = DriveApp.getFoldersByName(ROOT);
  var root = it.hasNext() ? it.next() : DriveApp.createFolder(ROOT);
  var sub = root.getFoldersByName(name);
  return sub.hasNext() ? sub.next() : root.createFolder(name);
}

function save_(r) {
  var dir = folder_(String(r.folder || 'Backups').replace(/[^A-Za-z0-9 _-]/g, ''));
  var name = String(r.name || 'file').replace(/[\\\/:*?"<>|]/g, '_');
  var old = dir.getFilesByName(name);
  if (old.hasNext()) {
    if (r.overwrite) { while (old.hasNext()) old.next().setTrashed(true); }
    else { var d = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyyMMdd_HHmmss'); name = d + '_' + name; }
  }
  var blob = r.b64
    ? Utilities.newBlob(Utilities.base64Decode(r.b64), r.mime || 'application/octet-stream', name)
    : Utilities.newBlob(String(r.text || ''), r.mime || 'application/json', name);
  var f = dir.createFile(blob);
  return { ok: true, id: f.getId(), name: name };
}

function count_(txt) {
  try {
    var o = JSON.parse(txt), d = o.tbData2;
    if (typeof d === 'string') d = JSON.parse(d);
    return Array.isArray(d) ? d.length : (Array.isArray(o) ? o.length : 0);
  } catch (x) { return 0; }
}

// Restore reads the single backup file (TB_FUP_backup.json).
// Fallback for older installs: newest .json that really contains patients.
function latest_() {
  var dir = folder_('Backups');
  var one = dir.getFilesByName('TB_FUP_backup.json');
  if (one.hasNext()) {
    var f1 = one.next();
    return { ok: true, name: f1.getName(), text: f1.getBlob().getDataAsString('UTF-8') };
  }
  var it = dir.getFiles(), list = [];
  while (it.hasNext()) {
    var f = it.next();
    if (/\.json$/i.test(f.getName())) list.push(f);
  }
  list.sort(function (a, b) { return b.getLastUpdated() - a.getLastUpdated(); });
  for (var i = 0; i < list.length; i++) {
    var txt = list[i].getBlob().getDataAsString('UTF-8');
    if (count_(txt) > 0) return { ok: true, name: list[i].getName(), text: txt };
  }
  return { ok: false, err: 'none' };
}

/* ---------- Forgot password: link by e-mail to the owner's Gmail ---------- */
var RESET_MIN = 30;
function props_() { return PropertiesService.getScriptProperties(); }

function resetRequest_(owner) {
  if (!owner) return { ok: false, err: 'No account' };
  var token = Utilities.getUuid().replace(/-/g, '');
  props_().setProperties({ rt: token, rtExp: String(Date.now() + RESET_MIN * 60000) });
  props_().deleteProperty('newpw'); props_().deleteProperty('newpwExp');
  var link = ScriptApp.getService().getUrl() + '?reset=' + token;
  MailApp.sendEmail(owner, 'TB FUP Tracker - password reset',
    'Open this link to set a new Settings password (valid ' + RESET_MIN + ' minutes):\n\n' + link +
    '\n\nThen go back to the app and press "I have set it - Apply".\nIf you did not ask for this, ignore this mail.');
  return { ok: true };
}

function resetPage_(token) {
  var okTok = token && token === props_().getProperty('rt') && Date.now() < Number(props_().getProperty('rtExp') || 0);
  var html = okTok
    ? '<div style="font-family:sans-serif;max-width:360px;margin:30px auto;padding:0 16px"><h3>TB FUP Tracker - New password</h3>' +
      '<input id="a" type="password" placeholder="New password (min 4)" style="width:100%;padding:12px;margin:6px 0;box-sizing:border-box"><br>' +
      '<input id="b" type="password" placeholder="Confirm new password" style="width:100%;padding:12px;margin:6px 0;box-sizing:border-box"><br>' +
      '<button style="width:100%;padding:12px;margin-top:8px" onclick="go()">Set password</button><p id="m"></p></div>' +
      '<script>function go(){var a=document.getElementById("a").value,b=document.getElementById("b").value,m=document.getElementById("m");' +
      'if(a.length<4){m.textContent="At least 4 characters";return}if(a!==b){m.textContent="Passwords do not match";return}' +
      'google.script.run.withSuccessHandler(function(r){m.textContent=r?"Done. Go back to the app and press Apply.":"Link expired. Send a new link from the app."})' +
      '.setNewPw("' + token + '",a)}</script>'
    : '<div style="font-family:sans-serif;max-width:360px;margin:30px auto"><h3>Link expired or already used</h3><p>Send a new reset link from the app.</p></div>';
  return HtmlService.createHtmlOutput(html).setTitle('TB FUP Tracker');
}

function setNewPw(token, pw) {
  var P = props_();
  if (!token || token !== P.getProperty('rt') || Date.now() > Number(P.getProperty('rtExp') || 0)) return false;
  pw = String(pw || '');
  if (pw.length < 4) return false;
  P.setProperties({ newpw: pw, newpwExp: String(Date.now() + RESET_MIN * 60000) });
  P.deleteProperty('rt'); P.deleteProperty('rtExp');
  return true;
}

function resetFetch_() {
  var P = props_(), pw = P.getProperty('newpw');
  if (!pw || Date.now() > Number(P.getProperty('newpwExp') || 0)) { P.deleteProperty('newpw'); return { ok: false, err: 'none' }; }
  P.deleteProperty('newpw'); P.deleteProperty('newpwExp');
  return { ok: true, pw: pw };
}
