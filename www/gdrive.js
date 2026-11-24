/* Google Drive backup / restore (Android app only).
   Files are kept in a Drive folder "TB Tracker". Scope = drive.file, so the app can
   only see files it created itself - it cannot read anything else in your Drive.

   >>> Paste your Google "Web application" OAuth client ID below (see GOOGLE_DRIVE_SETUP.md). <<<
   The GitHub build copies this same ID into capacitor.config.json automatically. */
(function () {
  var DEFAULT_ACCOUNT = 'maheshvadher12@gmail.com';   // backups always go to this Gmail unless another one is made active
  var WEB_CLIENT_ID = 'PASTE_WEB_CLIENT_ID_HERE.apps.googleusercontent.com';

  var SCOPE = 'https://www.googleapis.com/auth/drive.file';
  var FOLDER = 'TB Tracker';
  var API = 'https://www.googleapis.com/drive/v3/';
  var UP = 'https://www.googleapis.com/upload/drive/v3/files';
  var tok = null, tokAt = 0;
  function acct() { try { return localStorage.getItem('tbGAcct') || DEFAULT_ACCOUNT; } catch (e) { return DEFAULT_ACCOUNT; } }
  function accts() { var a = []; try { a = JSON.parse(localStorage.getItem('tbGAccts') || '[]'); if (!Array.isArray(a)) a = []; } catch (e) { a = []; } a = a.filter(function (x) { return x !== DEFAULT_ACCOUNT; }); a.unshift(DEFAULT_ACCOUNT); return a; }
  function addAcct(v) { if (!v) return; var a = accts(); if (a.indexOf(v) < 0) a.push(v); try { localStorage.setItem('tbGAccts', JSON.stringify(a)); } catch (e) {} }
  function setAcct(v) { addAcct(v); try { if (v) localStorage.setItem('tbGAcct', v); else localStorage.removeItem('tbGAcct'); } catch (e) {} }

  function isNative() { var C = window.Capacitor; return !!(C && C.isNativePlatform && C.isNativePlatform()); }
  function plugin() { var C = window.Capacitor; return C && C.Plugins && C.Plugins.GoogleAuth; }

  async function token(force) {
    if (!force && tok && Date.now() - tokAt < 45 * 60000) return tok;
    if (WEB_CLIENT_ID.indexOf('PASTE_') === 0)
      throw new Error('Google Drive is not set up in this app version yet.');
    var G = plugin();
    if (!G) throw new Error('Google sign-in is not available in this build.');
    try { await G.initialize({ clientId: WEB_CLIENT_ID, scopes: [SCOPE], grantOfflineAccess: false }); } catch (e) {}
    var r = null;
    try { r = await G.refresh(); } catch (e) { r = null; }          // already signed in -> silent
    if (!r || !r.accessToken) {
      var want = acct();
      var s = await G.signIn();                                      // first time -> account chooser
      if (s && s.email && s.email.toLowerCase() !== want.toLowerCase()) {
        try { await G.signOut(); } catch (e) {}
        throw new Error('Please select the account ' + want + ' (Settings > Google Accounts to change the backup account).');
      }
      if (s && s.email) setAcct(s.email);
      r = s && s.authentication;
    }
    if (!r || !r.accessToken) throw new Error('Google sign-in failed.');
    tok = r.accessToken; tokAt = Date.now();
    return tok;
  }

  async function api(url, opt, retry) {
    var t = await token(!!retry);
    opt = opt || {};
    var h = Object.assign({}, opt.headers || {}, { Authorization: 'Bearer ' + t });
    var r = await fetch(url, Object.assign({}, opt, { headers: h }));
    if (r.status === 401 && !retry) { tok = null; return api(url, opt, true); }
    if (!r.ok) {
      var m = '';
      try { m = (await r.json()).error.message; } catch (e) {}
      throw new Error('Drive error ' + r.status + (m ? ': ' + m : ''));
    }
    return r;
  }

  async function folderId(create) {
    var q = "name='" + FOLDER + "' and mimeType='application/vnd.google-apps.folder' and trashed=false";
    var j = await (await api(API + 'files?q=' + encodeURIComponent(q) + '&fields=files(id)&pageSize=1')).json();
    if (j.files && j.files.length) return j.files[0].id;
    if (!create) return null;
    var c = await (await api(API + 'files?fields=id', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER, mimeType: 'application/vnd.google-apps.folder' })
    })).json();
    return c.id;
  }

  async function upload(name, text) {
    var id = await folderId(true), b = 'tbfup' + Date.now();
    var body = '--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify({ name: name, parents: [id], mimeType: 'application/json' }) +
      '\r\n--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + text + '\r\n--' + b + '--';
    var r = await api(UP + '?uploadType=multipart&fields=id,name', {
      method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: body
    });
    return r.json();
  }

  async function list() {
    var id = await folderId(false);
    if (!id) return [];
    var q = "'" + id + "' in parents and trashed=false";
    var j = await (await api(API + 'files?q=' + encodeURIComponent(q) +
      '&orderBy=createdTime%20desc&pageSize=20&fields=files(id,name,createdTime,size)')).json();
    return j.files || [];
  }

  async function get(id) { return (await api(API + 'files/' + encodeURIComponent(id) + '?alt=media')).text(); }

  /* Settings -> Account: always show the Google account chooser, remember the chosen Gmail */
  async function choose(want) {
    var G = plugin();
    if (!G) throw new Error('Google sign-in is not available in this build.');
    if (WEB_CLIENT_ID.indexOf('PASTE_') === 0) { tok = null; await token(true); }   // throws the "not set up" message
    try { await G.signOut(); } catch (e) {}
    tok = null; setAcct('');
    try { await G.initialize({ clientId: WEB_CLIENT_ID, scopes: [SCOPE], grantOfflineAccess: false }); } catch (e) {}
    var s = await G.signIn();
    if (want && s && s.email && s.email.toLowerCase() !== want.toLowerCase()) {
      try { await G.signOut(); } catch (e) {}
      throw new Error('Please select the account ' + want + '.');
    }
    if (!s || !s.authentication || !s.authentication.accessToken) throw new Error('Google sign-in failed.');
    tok = s.authentication.accessToken; tokAt = Date.now();
    setAcct(s.email || 'Google account');
    return acct();
  }
  /* remove one account from the app list (Drive files stay in that Drive) */
  async function removeAcct(email) {
    if (email === DEFAULT_ACCOUNT) return;                       // default account cannot be removed
    var a = accts().filter(function (x) { return x !== email; });
    try { localStorage.setItem('tbGAccts', JSON.stringify(a)); } catch (e) {}
    if (acct() === email) await signOut();
  }
  async function signOut() {
    var G = plugin();
    try { if (G) await G.signOut(); } catch (e) {}
    tok = null; setAcct('');
  }

  window.GD = { native: isNative, upload: upload, list: list, get: get, account: acct, defaultAccount: DEFAULT_ACCOUNT, accounts: accts, choose: choose, remove: removeAcct, signOut: signOut };
})();
