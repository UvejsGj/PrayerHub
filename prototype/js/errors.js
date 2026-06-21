/* ============================================================
   Salah OS — client error tracking
   Captures uncaught errors + unhandled promise rejections into a
   rolling localStorage buffer, logs them to the console, and shows a
   quiet (debounced) toast. If PH.config.sentryDsn is set AND the Sentry
   browser SDK is present on the page, each error is also forwarded there.

   Works with ZERO external account out of the box — inspect captured
   errors any time with  PH.errors.dump()  in the console.

   Loaded FIRST (before every other script) so it can catch failures in
   the rest of the app, including the CDN libraries.
   ============================================================ */
(function () {
  window.PH = window.PH || {};
  var KEY = 'prayerhub.errors.v1';
  var MAX = 25; // keep only the most recent N — never grow unbounded

  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function write(list) { try { localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX))); } catch (e) {} }

  function record(kind, message, detail) {
    var entry = {
      t: new Date().toISOString(),
      kind: kind,
      message: String(message == null ? '' : message).slice(0, 500),
      stack: (detail && detail.stack ? String(detail.stack) : '').slice(0, 2000),
      url: location.pathname + location.search,
      ua: navigator.userAgent
    };
    var list = read(); list.push(entry); write(list);
    if (window.console && console.error) console.error('[Salah OS]', kind + ':', message, detail || '');
    forward(entry);
    notify();
  }

  // Optional Sentry forwarding — a no-op unless a DSN is configured AND the
  // Sentry SDK has been added to the page (see js/config.js for how to enable).
  function forward(entry) {
    var dsn = window.PH.config && window.PH.config.sentryDsn;
    if (!dsn || !window.Sentry || !window.Sentry.captureMessage) return;
    try { window.Sentry.captureMessage('[' + entry.kind + '] ' + entry.message, { level: 'error', extra: entry }); }
    catch (e) {}
  }

  // Quiet, debounced toast — a burst of errors must never become a wall of toasts.
  var notifyTimer = null;
  function notify() {
    if (notifyTimer) return;
    notifyTimer = setTimeout(function () {
      notifyTimer = null;
      if (window.PH.ui && PH.ui.toast) {
        var sq = window.PH.i18n && PH.i18n.lang === 'sq';
        try { PH.ui.toast(sq ? 'Ndodhi një gabim — u regjistrua.' : 'Something glitched — it was logged.'); } catch (e) {}
      }
    }, 800);
  }

  // Uncaught runtime errors (script execution). Resource-load failures don't
  // bubble here, so e.message guards out the empty ones.
  window.addEventListener('error', function (e) {
    if (e && e.message) record('error', e.message, e.error || { stack: (e.filename || '') + ':' + (e.lineno || '') });
  });
  // Rejected promises with no .catch() — the silent killers of async code.
  window.addEventListener('unhandledrejection', function (e) {
    var r = e && e.reason;
    record('promise', (r && r.message) || r || 'Unhandled promise rejection', r);
  });

  // Console helpers for debugging in the field.
  window.PH.errors = {
    list: read,
    dump: function () { var l = read(); if (window.console) (console.table ? console.table(l) : console.log(l)); return l; },
    clear: function () { write([]); return true; },
    count: function () { return read().length; }
  };
})();
