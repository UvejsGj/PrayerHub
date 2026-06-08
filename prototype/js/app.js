/* ============================================================
   PrayerHub app — bootstrap, state, events, routing
   ============================================================ */
(function () {
  const ui = PH.ui, track = PH.track;
  const $ = id => document.getElementById(id);

  PH.state = {
    prefs: loadPrefs(),
    today: null,
    trackDate: new Date(),
    calDate: new Date(),
    monthCache: {},
  };
  let current = 'dashboard'; // active view (used by cloud rehydrate)

  function loadPrefs() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(PH.config.prefsKey)) || {}; } catch (e) {}
    // Default to Mecca (with coords) so live + offline both work on first load.
    return Object.assign({ method: 3, theme: 'dark', city: '', country: '', lat: 21.4225, lng: 39.8262, locationLabel: 'Mecca, Saudi Arabia' }, p);
  }
  function savePrefs() { localStorage.setItem(PH.config.prefsKey, JSON.stringify(PH.state.prefs)); }

  /* ---------- data loading ---------- */
  async function loadToday() {
    const p = PH.state.prefs;
    const opts = { method: Number(p.method), date: new Date() };
    if (p.lat != null) { opts.lat = p.lat; opts.lng = p.lng; }
    else { opts.city = p.city; opts.country = p.country; }
    try {
      const data = await PH.times.getDay(opts);
      data.tz = data.meta && data.meta.timezone; // location's IANA tz (live only)
      PH.state.today = data;
      const customLabel = Number(p.method) === 99 ? 'Fajr 18° · Isha 17°' : '';
      ui.renderStatus(p.locationLabel, data.source, customLabel);
      ui.renderHeroDates(data);
      ui.renderPrayerGrid(data.timings, PH.wallNow(data.tz), onDashboardToggle);
      ui.tickCountdown(data.timings);
      $('sidebarStreak').textContent = track.currentStreak();
      refreshVisibleModule();
    } catch (e) {
      ui.toast('Could not load prayer times for that location.');
      console.error(e);
    }
  }

  // Re-render whichever location-dependent module is currently on screen.
  function refreshVisibleModule() {
    const vis = name => !$('view-' + name).classList.contains('hidden');
    if (PH.qibla && vis('qibla')) PH.qibla.render();
    if (PH.ramadan && vis('ramadan')) PH.ramadan.render();
    if (PH.mosques && vis('mosques')) PH.mosques.render();
  }

  async function loadMonth() {
    const p = PH.state.prefs, d = PH.state.calDate;
    const cacheKey = `${d.getFullYear()}-${d.getMonth()}-${p.method}-${p.lat ?? p.city}`;
    ui.renderCalendar(null, d);
    if (PH.state.monthCache[cacheKey]) { ui.renderCalendar(PH.state.monthCache[cacheKey], d); return; }
    const opts = { method: Number(p.method), year: d.getFullYear(), month: d.getMonth() + 1 };
    if (p.lat != null) { opts.lat = p.lat; opts.lng = p.lng; }
    else { opts.city = p.city; opts.country = p.country; }
    try {
      const data = await PH.times.getMonth(opts);
      PH.state.monthCache[cacheKey] = data;
      ui.renderCalendar(data, d);
    } catch (e) {
      $('calBody').innerHTML = '<tr><td colspan="7" class="muted">Could not load this month for the chosen location.</td></tr>';
    }
  }

  /* ---------- toggles ---------- */
  function onDashboardToggle(prayerKey) {
    const key = PH.dateKey(new Date());
    track.cycle(key, prayerKey);
    ui.renderPrayerGrid(PH.state.today.timings, new Date(), onDashboardToggle);
    $('sidebarStreak').textContent = track.currentStreak();
  }

  /* ---------- view routing ---------- */
  function showView(name) {
    current = name;
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    const el = $('view-' + name);
    if (el) el.classList.remove('hidden');
    document.querySelectorAll('.nav__item[data-view]').forEach(a =>
      a.classList.toggle('is-active', a.dataset.view === name));
    if (name === 'tracking') ui.renderTracking(PH.state.trackDate, onTrackCycle);
    if (name === 'analytics') ui.renderAnalytics();
    if (name === 'calendar') loadMonth();
    if (name === 'qibla') PH.qibla.render();
    if (name === 'ramadan') PH.ramadan.render();
    if (name === 'mosques') PH.mosques.render();
    if (name === 'adhkar') PH.adhkar.render();
    document.querySelector('.sidebar').classList.remove('open');
  }

  function onTrackCycle(key, prayerKey) {
    track.cycle(key, prayerKey);
    ui.renderTracking(PH.state.trackDate, onTrackCycle);
    $('sidebarStreak').textContent = track.currentStreak();
  }

  /* ---------- geolocation ---------- */
  function detectLocation() {
    if (!navigator.geolocation) { ui.toast('Geolocation not supported.'); return; }
    ui.toast('Detecting your location…');
    navigator.geolocation.getCurrentPosition(async pos => {
      const p = PH.state.prefs;
      p.lat = +pos.coords.latitude.toFixed(4);
      p.lng = +pos.coords.longitude.toFixed(4);
      p.city = ''; p.country = '';
      p.locationLabel = await reverseGeocode(p.lat, p.lng);
      savePrefs();
      PH.state.monthCache = {};
      loadToday();
      ui.toast('Location set: ' + p.locationLabel);
    }, err => {
      ui.toast('Location permission denied — search a city instead.');
    }, { timeout: 8000, enableHighAccuracy: false });
  }

  async function reverseGeocode(lat, lng) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`, { headers: { 'Accept': 'application/json' } });
      const j = await r.json();
      const a = j.address || {};
      const city = a.city || a.town || a.village || a.county || '';
      return [city, a.country].filter(Boolean).join(', ') || `(${lat}, ${lng})`;
    } catch (e) { return `(${lat}, ${lng})`; }
  }

  // Resolve a city/country to coordinates so coord-based features
  // (Qibla, Mosque finder) work after a manual search. Null if not found.
  async function forwardGeocode(city, country) {
    try {
      const q = encodeURIComponent([city, country].filter(Boolean).join(', '));
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`, { headers: { 'Accept': 'application/json' } });
      const j = await r.json();
      if (!j.length) return null;
      return { lat: +(+j[0].lat).toFixed(4), lng: +(+j[0].lon).toFixed(4) };
    } catch (e) { return null; }
  }

  /* ---------- events ---------- */
  function bindEvents() {
    // nav
    document.querySelectorAll('.nav__item[data-view]').forEach(a =>
      a.addEventListener('click', e => { e.preventDefault(); showView(a.dataset.view); }));

    // city search (geocodes to coordinates so all features work)
    $('cityForm').addEventListener('submit', async e => {
      e.preventDefault();
      const city = $('cityInput').value.trim();
      if (!city) return;
      const country = $('countryInput').value.trim();
      const p = PH.state.prefs;
      ui.toast('Searching “' + city + '”…');
      const geo = await forwardGeocode(city, country);
      if (geo) { p.lat = geo.lat; p.lng = geo.lng; }
      else { p.lat = null; p.lng = null; }
      p.city = city; p.country = country;
      p.locationLabel = [city, country].filter(Boolean).join(', ');
      savePrefs(); PH.state.monthCache = {}; loadToday();
    });

    $('geoBtn').addEventListener('click', detectLocation);

    // method
    $('methodSelect').value = PH.state.prefs.method;
    $('methodSelect').addEventListener('change', e => {
      PH.state.prefs.method = Number(e.target.value);
      savePrefs(); PH.state.monthCache = {}; loadToday();
      if (!$('view-calendar').classList.contains('hidden')) loadMonth();
    });

    // theme
    $('themeToggle').addEventListener('click', () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      PH.state.prefs.theme = next; savePrefs(); ui.setTheme(next);
      if (!$('view-analytics').classList.contains('hidden')) ui.renderAnalytics();
    });

    // mobile menu
    $('menuToggle').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));

    // qibla live compass
    $('qiblaEnable').addEventListener('click', () => PH.qibla.enable());

    // tracking nav
    $('trackPrev').addEventListener('click', () => { PH.state.trackDate.setDate(PH.state.trackDate.getDate() - 1); ui.renderTracking(PH.state.trackDate, onTrackCycle); });
    $('trackNext').addEventListener('click', () => {
      const n = new Date(PH.state.trackDate); n.setDate(n.getDate() + 1);
      if (n > new Date()) { ui.toast("Can't log future prayers."); return; }
      PH.state.trackDate = n; ui.renderTracking(PH.state.trackDate, onTrackCycle);
    });

    // calendar nav
    $('calPrev').addEventListener('click', () => { PH.state.calDate.setMonth(PH.state.calDate.getMonth() - 1); loadMonth(); });
    $('calNext').addEventListener('click', () => { PH.state.calDate.setMonth(PH.state.calDate.getMonth() + 1); loadMonth(); });

    // export csv
    $('exportCsv').addEventListener('click', () => {
      const d = PH.state.calDate;
      const csv = track.exportMonthCsv(d.getFullYear(), d.getMonth() + 1);
      const blob = new Blob([csv], { type: 'text/csv' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `prayerhub-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}.csv`;
      a.click(); URL.revokeObjectURL(a.href);
      ui.toast('Tracking log exported as CSV.');
    });

    // analytics seed/reset
    $('seedBtn').addEventListener('click', () => { track.seed(90); ui.renderAnalytics(); ui.toast('Sample 90-day history generated.'); });
    $('resetBtn').addEventListener('click', () => {
      if (confirm('Delete all your prayer logs on this device?')) { track.reset(); ui.renderAnalytics(); $('sidebarStreak').textContent = '0'; ui.toast('Your data was reset.'); }
    });

    // hash routing on load
    const h = (location.hash || '').replace('#', '');
    if (['dashboard','tracking','analytics','calendar','qibla','ramadan','mosques','adhkar'].includes(h)) showView(h);
  }

  /* ---------- cloud rehydrate hook ---------- */
  // Called by the sync layer after merging remote data into localStorage:
  // re-read everything and refresh the whole UI without a page reload.
  function rehydrate() {
    PH.state.prefs = loadPrefs();
    ui.setTheme(PH.state.prefs.theme);
    $('methodSelect').value = PH.state.prefs.method;
    $('cityInput').value = PH.state.prefs.city || '';
    $('countryInput').value = PH.state.prefs.country || '';
    PH.state.monthCache = {};
    loadToday();
    $('sidebarStreak').textContent = track.currentStreak();
    showView(current);
  }
  PH.app = { rehydrate };

  /* ---------- init ---------- */
  function init() {
    ui.setTheme(PH.state.prefs.theme);
    bindEvents();
    loadToday();
    if (PH.cloud) PH.cloud.init();
    // live clock + countdown (+ Ramadan Iftar countdown when visible)
    setInterval(() => {
      if (PH.state.today) ui.tickCountdown(PH.state.today.timings);
      if (PH.ramadan && !$('view-ramadan').classList.contains('hidden')) PH.ramadan.tick();
    }, 1000);
    // refresh prayer data at the top of each hour (re-evaluates next prayer & dates)
    setInterval(loadToday, 60 * 60 * 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
