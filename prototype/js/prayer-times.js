/* ============================================================
   PrayerHub prayer-times engine
   - Primary source: AlAdhan API
   - Fallback: self-contained solar calculation (PrayTimes-style)
     so the dashboard ALWAYS renders, even offline.
   ============================================================ */
PH.times = (function () {
  const B = PH.config.apiBase;

  /* ---------- HTTP helpers ---------- */
  async function getJSON(url, ms = 8000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      const r = await fetch(url, { signal: ctrl.signal });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(t); }
  }

  /* ---------- AlAdhan: single day ---------- */
  async function fetchDay({ lat, lng, city, country, method = 3, date = new Date() }) {
    const ds = PH.aladhanDate(date);
    let url;
    if (city) {
      url = `${B}/timingsByCity/${ds}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country || '')}&method=${method}`;
    } else {
      url = `${B}/timings/${ds}?latitude=${lat}&longitude=${lng}&method=${method}`;
    }
    const j = await getJSON(url);
    if (j.code !== 200) throw new Error('AlAdhan code ' + j.code);
    return {
      source: 'live',
      timings: j.data.timings,
      hijri: j.data.date.hijri,
      gregorian: j.data.date.gregorian,
      meta: j.data.meta,
    };
  }

  /* ---------- AlAdhan: full month ---------- */
  async function fetchMonth({ lat, lng, city, country, method = 3, year, month }) {
    let url;
    if (city) {
      url = `${B}/calendarByCity/${year}/${month}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country || '')}&method=${method}`;
    } else {
      url = `${B}/calendar/${year}/${month}?latitude=${lat}&longitude=${lng}&method=${method}`;
    }
    const j = await getJSON(url, 12000);
    if (j.code !== 200) throw new Error('AlAdhan code ' + j.code);
    return j.data.map(d => ({ timings: d.timings, hijri: d.date.hijri, gregorian: d.date.gregorian }));
  }

  /* ============================================================
     Offline fallback — solar prayer-time calculation
     Adapted from the open PrayTimes.org algorithm.
     ============================================================ */
  const DMath = {
    dtr: d => d * Math.PI / 180, rtd: r => r * 180 / Math.PI,
    sin: d => Math.sin(DMath.dtr(d)), cos: d => Math.cos(DMath.dtr(d)),
    tan: d => Math.tan(DMath.dtr(d)),
    arcsin: x => DMath.rtd(Math.asin(x)), arccos: x => DMath.rtd(Math.acos(x)),
    arctan2: (y, x) => DMath.rtd(Math.atan2(y, x)),
    arccot: x => DMath.rtd(Math.atan(1 / x)),
    fixAngle: a => DMath.fix(a, 360), fixHour: a => DMath.fix(a, 24),
    fix: (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; },
  };

  const methodParams = {
    3:  { fajr: 18,   isha: 17 },        // MWL
    2:  { fajr: 15,   isha: 15 },        // ISNA
    5:  { fajr: 19.5, isha: 17.5 },      // Egyptian
    4:  { fajr: 18.5, isha: '90 min' },  // Umm Al-Qura
    1:  { fajr: 18,   isha: 18 },        // Karachi
    99: { fajr: 18,   isha: 17 },        // Custom default
  };

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    const A = Math.floor(y / 100), Bc = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + Bc - 1524.5;
  }

  function sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = DMath.fixAngle(357.529 + 0.98560028 * D);
    const q = DMath.fixAngle(280.459 + 0.98564736 * D);
    const L = DMath.fixAngle(q + 1.915 * DMath.sin(g) + 0.020 * DMath.sin(2 * g));
    const e = 23.439 - 0.00000036 * D;
    const RA = DMath.arctan2(DMath.cos(e) * DMath.sin(L), DMath.cos(L)) / 15;
    const decl = DMath.arcsin(DMath.sin(e) * DMath.sin(L));
    const eqt = q / 15 - DMath.fixHour(RA);
    return { decl, eqt };
  }

  function computeLocal({ lat, lng, date = new Date(), method = 3 }) {
    const tz = -date.getTimezoneOffset() / 60; // local timezone offset, hours
    const jDate = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
    const params = methodParams[method] || methodParams[3];

    const midDay = t => {
      const eqt = sunPosition(jDate + t).eqt;
      return DMath.fixHour(12 - eqt);
    };
    const sunAngleTime = (angle, t, dir) => {
      const decl = sunPosition(jDate + t).decl;
      const noon = midDay(t);
      const inner = (-DMath.sin(angle) - DMath.sin(decl) * DMath.sin(lat)) / (DMath.cos(decl) * DMath.cos(lat));
      const T = (1 / 15) * DMath.arccos(Math.max(-1, Math.min(1, inner)));
      return noon + (dir === 'ccw' ? -T : T);
    };
    const asrTime = (factor, t) => {
      const decl = sunPosition(jDate + t).decl;
      const angle = -DMath.arccot(factor + DMath.tan(Math.abs(lat - decl)));
      return sunAngleTime(angle, t);
    };

    // iterate once from midday estimates (day portions)
    let t = { imsak: 5/24, fajr: 5/24, sunrise: 6/24, dhuhr: 12/24, asr: 13/24, sunset: 18/24, maghrib: 18/24, isha: 18/24 };
    const riseAngle = 0.833;
    const out = {};
    out.fajr    = sunAngleTime(params.fajr, t.fajr, 'ccw');
    out.sunrise = sunAngleTime(riseAngle, t.sunrise, 'ccw');
    out.dhuhr   = midDay(t.dhuhr);
    out.asr     = asrTime(1, t.asr);
    out.sunset  = sunAngleTime(riseAngle, t.sunset);
    out.maghrib = out.sunset;
    out.isha    = (params.isha === '90 min') ? out.maghrib + 1.5 : sunAngleTime(params.isha, t.isha);
    out.imsak   = sunAngleTime(params.fajr + 1.5, t.imsak, 'ccw');

    const adjust = h => DMath.fixHour(h + tz - lng / 15);
    for (const k in out) out[k] = adjust(out[k]);

    // derived night times
    const sunsetH = out.sunset, fajrH = out.fajr + (out.fajr < out.sunset ? 24 : 0);
    const nightDur = (fajrH - sunsetH);
    out.midnight = DMath.fixHour(out.sunset + nightDur / 2);
    out.lastthird = DMath.fixHour(out.sunset + nightDur * 2 / 3);

    const toHM = h => {
      h = DMath.fixHour(h + 0.5/60); // round to nearest min
      const hh = Math.floor(h), mm = Math.floor((h - hh) * 60);
      return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
    };

    const timings = {};
    ['Fajr','Sunrise','Dhuhr','Asr','Sunset','Maghrib','Isha','Imsak','Midnight','Lastthird']
      .forEach(name => { timings[name] = toHM(out[name.toLowerCase()]); });
    timings.Firstthird = toHM(DMath.fixHour(out.sunset + nightDur / 3));

    return { source: 'fallback', timings, hijri: hijriFor(date), gregorian: gregorianFor(date), meta: { method: { name: PH.config.methods[method] } } };
  }

  /* Hijri date via Intl (Umm al-Qura) — used by fallback. */
  function hijriFor(date) {
    try {
      const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' });
      const parts = f.formatToParts(date);
      const get = t => (parts.find(p => p.type === t) || {}).value || '';
      return { day: get('day'), month: { en: get('month') }, year: get('year').replace(/[^0-9]/g, '') };
    } catch (e) {
      return { day: '—', month: { en: '' }, year: '' };
    }
  }
  function gregorianFor(date) {
    return {
      day: String(date.getDate()),
      month: { en: date.toLocaleString('en', { month: 'long' }) },
      year: String(date.getFullYear()),
      weekday: { en: date.toLocaleString('en', { weekday: 'long' }) },
    };
  }

  /* ---------- public: day with graceful fallback ---------- */
  async function getDay(opts) {
    try {
      return await fetchDay(opts);
    } catch (e) {
      console.warn('[PrayerHub] live day failed, using fallback:', e.message);
      if (opts.lat == null) throw e; // city-only with no coords → cannot fallback accurately
      return computeLocal(opts);
    }
  }

  async function getMonth(opts) {
    try {
      return await fetchMonth(opts);
    } catch (e) {
      console.warn('[PrayerHub] live month failed, building fallback month:', e.message);
      if (opts.lat == null) throw e;
      const days = new Date(opts.year, opts.month, 0).getDate();
      const arr = [];
      for (let d = 1; d <= days; d++) {
        const date = new Date(opts.year, opts.month - 1, d);
        arr.push(computeLocal({ ...opts, date }));
      }
      return arr;
    }
  }

  return { getDay, getMonth, computeLocal };
})();
