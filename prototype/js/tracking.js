/* ============================================================
   Salah OS tracking + analytics
   Persists per-day prayer logs in localStorage and derives
   streaks, consistency score and breakdowns.
   data shape: { "YYYY-MM-DD": { Fajr:"ontime", Asr:"missed", ... } }
   ============================================================ */
PH.track = (function () {
  const KEY = PH.config.storageKey;
  const PRAYERS = PH.config.prayers.map(p => p.key);
  const META = PH.config.statusMeta;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save(data) { localStorage.setItem(KEY, JSON.stringify(data)); }

  function getDay(key) { return load()[key] || {}; }

  /* advance a prayer through the status cycle */
  function cycle(key, prayer) {
    const data = load();
    const day = data[key] || {};
    const cur = day[prayer] || null;
    const order = PH.config.trackCycle;
    const next = order[(order.indexOf(cur) + 1) % order.length];
    if (next == null) delete day[prayer]; else day[prayer] = next;
    if (Object.keys(day).length) data[key] = day; else delete data[key];
    save(data);
    return next;
  }

  function setStatus(key, prayer, status) {
    const data = load();
    const day = data[key] || {};
    if (status == null) delete day[prayer]; else day[prayer] = status;
    if (Object.keys(day).length) data[key] = day; else delete data[key];
    save(data);
  }

  /* day score 0..1 averaged over the 5 prayers (unlogged = 0) */
  function dayScore(day) {
    let s = 0;
    PRAYERS.forEach(p => { const st = day[p]; if (st && META[st]) s += META[st].score; });
    return s / PRAYERS.length;
  }

  /* a day "counts" for streak if every prayer is logged as performed
     (ontime/jamaah/late/qada) — i.e. none missed and none blank */
  function dayComplete(day) {
    return PRAYERS.every(p => { const st = day[p]; return st && st !== 'missed'; });
  }

  function currentStreak() {
    const data = load();
    let streak = 0;
    const d = new Date();
    // today only extends the streak if complete; otherwise start from yesterday
    if (!dayComplete(data[PH.dateKey(d)] || {})) d.setDate(d.getDate() - 1);
    while (dayComplete(data[PH.dateKey(d)] || {})) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  }

  function bestStreak() {
    const data = load();
    const keys = Object.keys(data).filter(k => dayComplete(data[k])).sort();
    let best = 0, run = 0, prev = null;
    keys.forEach(k => {
      if (prev) {
        const gap = (new Date(k) - new Date(prev)) / 86400000;
        run = gap === 1 ? run + 1 : 1;
      } else run = 1;
      best = Math.max(best, run); prev = k;
    });
    return best;
  }

  /* consistency = average day-score over the last N days */
  function consistency(days = 30) {
    const data = load();
    let sum = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      sum += dayScore(data[PH.dateKey(d)] || {});
    }
    return Math.round((sum / days) * 100);
  }

  function totalLogged() {
    const data = load();
    let n = 0;
    Object.values(data).forEach(day => Object.values(day).forEach(st => { if (st !== 'missed') n++; }));
    return n;
  }

  /* last-N-day series of #prayers performed (0..5) */
  function dailySeries(days = 14) {
    const data = load(), labels = [], values = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const day = data[PH.dateKey(d)] || {};
      const done = PRAYERS.filter(p => day[p] && day[p] !== 'missed').length;
      labels.push(d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
      values.push(done);
    }
    return { labels, values };
  }

  /* completion rate per prayer over N days */
  function byPrayer(days = 30) {
    const data = load();
    return PRAYERS.map(p => {
      let done = 0, total = 0;
      for (let i = 0; i < days; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const st = (data[PH.dateKey(d)] || {})[p];
        total++;
        if (st && st !== 'missed') done++;
      }
      return { prayer: p, rate: Math.round((done / total) * 100) };
    });
  }

  /* status counts over N days */
  function statusBreakdown(days = 30) {
    const data = load();
    const counts = { ontime: 0, jamaah: 0, late: 0, qada: 0, missed: 0, none: 0 };
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const day = data[PH.dateKey(d)] || {};
      PRAYERS.forEach(p => { const st = day[p]; counts[st || 'none']++; });
    }
    return counts;
  }

  /* Generate plausible sample history for the demo (90 days). */
  function seed(days = 90) {
    const data = load();
    for (let i = 0; i < days; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = PH.dateKey(d);
      if (data[key]) continue;
      const day = {};
      // higher consistency for recent days
      const base = 0.92 - (i / days) * 0.35;
      PRAYERS.forEach(p => {
        const r = Math.random();
        if (r < base) day[p] = Math.random() < 0.7 ? 'ontime' : 'jamaah';
        else if (r < base + 0.10) day[p] = 'late';
        else if (r < base + 0.16) day[p] = 'qada';
        else if (r < base + 0.22) day[p] = 'missed';
        // else leave blank
      });
      if (Object.keys(day).length) data[key] = day;
    }
    save(data);
  }

  function reset() { localStorage.removeItem(KEY); }

  /* CSV export of a month's logged statuses */
  function exportMonthCsv(year, month) {
    const data = load();
    const days = new Date(year, month, 0).getDate();
    let csv = 'Date,' + PRAYERS.join(',') + '\n';
    for (let d = 1; d <= days; d++) {
      const key = PH.dateKey(new Date(year, month - 1, d));
      const day = data[key] || {};
      csv += key + ',' + PRAYERS.map(p => day[p] || '').join(',') + '\n';
    }
    return csv;
  }

  return {
    getDay, cycle, setStatus, dayScore, dayComplete,
    currentStreak, bestStreak, consistency, totalLogged,
    dailySeries, byPrayer, statusBreakdown, seed, reset, exportMonthCsv,
  };
})();
