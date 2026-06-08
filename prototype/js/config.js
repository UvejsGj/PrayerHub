/* ============================================================
   PrayerHub config — shared constants & global namespace
   ============================================================ */
window.PH = window.PH || {};

PH.config = {
  apiBase: 'https://api.aladhan.com/v1',

  // The 5 obligatory prayers (Sunrise is shown but not "trackable").
  prayers: [
    { key: 'Fajr',    label: 'Fajr',    ar: 'الفجر',   ico: '🌄' },
    { key: 'Dhuhr',   label: 'Dhuhr',   ar: 'الظهر',   ico: '☀️' },
    { key: 'Asr',     label: 'Asr',     ar: 'العصر',   ico: '🌤️' },
    { key: 'Maghrib', label: 'Maghrib', ar: 'المغرب',  ico: '🌇' },
    { key: 'Isha',    label: 'Isha',    ar: 'العشاء',  ico: '🌙' },
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
