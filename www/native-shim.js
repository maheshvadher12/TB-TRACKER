/* Android app ma download / print / share ne kam karva mate nu nanu shim.
   Browser ma (native nathi tyare) kai j badlatu nathi. */
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  var P = C.Plugins || {};

  function toB64(blob) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () { res(String(r.result).split(',')[1] || ''); };
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  async function saveAndShare(blob, name) {
    try {
      var data = await toB64(blob);
      var w = await P.Filesystem.writeFile({ path: name, data: data, directory: 'CACHE' });
      await P.Share.share({ title: name, dialogTitle: 'Save / Share', url: w.uri });
    } catch (e) {
      var m = String((e && e.message) || e);
      if (/cancel|dismiss/i.test(m)) return;
      try { uiAlert('File save/share thai nahi: ' + m); } catch (_) { alert(m); }
    }
  }

  // a.download=... ; a.click()  (PDF, CSV, Backup JSON)
  var origClick = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && /^blob:/.test(this.href)) {
      var name = this.download, href = this.href;
      fetch(href).then(function (r) { return r.blob(); })
                 .then(function (b) { return saveAndShare(b, name); });
      return;
    }
    return origClick.apply(this, arguments);
  };

  // Print button -> PDF banavi share/save
  window.print = function () { if (typeof downloadPDF === 'function') downloadPDF(); };

  // Email PDF button -> share sheet (Gmail / WhatsApp / Drive vagere)
  window.addEventListener('load', function () {
    window.sharePDF = function () { downloadPDF(); };
  });
})();
