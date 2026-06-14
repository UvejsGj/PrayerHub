/* ============================================================
   Salah OS config — shared constants & global namespace
   ============================================================ */
window.PH = window.PH || {};

PH.config = {
  apiBase: 'https://api.aladhan.com/v1',

  // The 5 obligatory prayers (Sunrise is shown but not "trackable").
  prayers: [
    { key: 'Fajr',    label: 'Fajr',    ar: 'الفجر',   ico: 'wb_twilight' },
    { key: 'Dhuhr',   label: 'Dhuhr',   ar: 'الظهر',   ico: 'light_mode' },
    { key: 'Asr',     label: 'Asr',     ar: 'العصر',   ico: 'partly_cloudy_day' },
    { key: 'Maghrib', label: 'Maghrib', ar: 'المغرب',  ico: 'wb_twilight' },
    { key: 'Isha',    label: 'Isha',    ar: 'العشاء',  ico: 'bedtime' },
  ],

  // AlAdhan method codes mapped to the spec's requested methods.
  methods: {
    3:  'Muslim World League',
    4:  'Umm Al-Qura',
    2:  'ISNA',
    5:  'Egyptian General Authority',
    1:  'Karachi',
    99: 'Custom',
  },

  // Tracking statuses cycle in this order on tap.
  trackCycle: ['ontime', 'late', 'jamaah', 'qada', 'missed', null],
  statusMeta: {
    ontime: { label: 'On time', score: 1.0,  color: '#34d399' },
    jamaah: { label: "Jama'ah", score: 1.0,  color: '#10b981' },
    late:   { label: 'Late',    score: 0.6,  color: '#f5c451' },
    qada:   { label: 'Qada',    score: 0.5,  color: '#a5b4fc' },
    missed: { label: 'Missed',  score: 0.0,  color: '#f87171' },
  },

  storageKey: 'prayerhub.v1',
  prefsKey:   'prayerhub.prefs.v1',
};

/* Format a Date or "HH:MM" string for display (24h, zero-padded). */
PH.fmtTime = function (val) {
  if (val instanceof Date) {
    return String(val.getHours()).padStart(2, '0') + ':' + String(val.getMinutes()).padStart(2, '0');
  }
  return (val || '').replace(/\s*\(.*\)\s*$/, '').trim(); // strip "(EET)" suffixes
};

/* ISO date key YYYY-MM-DD in local time. */
PH.dateKey = function (d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};

/* "DD-MM-YYYY" for AlAdhan path params. */
PH.aladhanDate = function (d) {
  return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
};

/* Current wall-clock time in an IANA timezone, as a Date whose LOCAL
   fields equal that timezone's wall clock. Lets us compare against
   "HH:MM" prayer strings (which are in the location's local time)
   regardless of the device's timezone. Falls back to device time. */
PH.wallNow = function (tz) {
  if (!tz) return new Date();
  try { return new Date(new Date().toLocaleString('en-US', { timeZone: tz })); }
  catch (e) { return new Date(); }
};

/* HTML-escape any value before it is interpolated into innerHTML.
   Treat ALL third-party API data (AlAdhan, Quran.com, OpenStreetMap, …)
   as untrusted. Escapes the 5 HTML-significant chars so the value is safe
   in both element-text and quoted-attribute contexts. */
PH.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

/* ---- Maps ----
   Paste your Mapbox PUBLIC token (starts with "pk.") below to use Mapbox tiles.
   If left empty, the maps fall back to free OpenStreetMap tiles. */
PH.config.mapboxToken = '';

/* Returns a Leaflet tile layer: Mapbox (theme-aware) when a token is set,
   otherwise OpenStreetMap. Pass the global Leaflet `L`. */
PH.mapTiles = function (L) {
  const token = PH.config.mapboxToken;
  if (token) {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    const style = dark ? 'dark-v11' : 'streets-v12';
    return L.tileLayer(
      `https://api.mapbox.com/styles/v1/mapbox/${style}/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`,
      { attribution: '© Mapbox © OpenStreetMap', tileSize: 512, zoomOffset: -1, maxZoom: 19 }
    );
  }
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: '© OpenStreetMap contributors', maxZoom: 19 });
};
