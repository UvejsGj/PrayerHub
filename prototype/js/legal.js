/* Standalone legal pages (privacy.html): inherit the visitor's saved theme
   and language from the main app so the page matches what they were using. */
(function () {
  try {
    var p = JSON.parse(localStorage.getItem('prayerhub.prefs.v1')) || {};
    if (p.theme === 'light' || p.theme === 'dark') document.documentElement.setAttribute('data-theme', p.theme);
    if (p.lang === 'sq') {
      var t = document.getElementById('langToggle');
      if (t) { t.checked = true; document.documentElement.setAttribute('lang', 'sq'); }
    }
  } catch (e) {}
})();
