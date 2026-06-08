/* ============================================================
   PrayerHub — Ramadan module
   Hijri-aware countdown to Ramadan / Eid, daily fasting timetable
   (Imsak, Suhoor end, Iftar) with live Iftar countdown, and
   season trackers (fasts, taraweeh, Quran, charity) persisted locally.
   ============================================================ */
PH.ramadan = (function () {
  const $ = id => document.getElementById(id);
  const KEY = 'prayerhub.ramadan.v1';
  let bound = false;

  /* Umm-al-Qura hijri parts (numbers) for a Gregorian date. */
  function hijri(date) {
    const f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' });
    const o = {};
    f.formatToParts(date).forEach(p => { if (p.type !== 'literal') o[p.type] = parseInt(p.value, 10); });
    return { day: o.day, month: o.month, year: o.year };
  }

  /* First Gregorian date strictly after `from` whose hijri = (month, day=1). */
  function findNext(month, from) {
    const d = new Date(from);
    for (let i = 0; i < 420; i++) {
      d.setDate(d.getDate() + 1);
      const h = hijri(d);
      if (h.month === month && h.day === 1) return new Date(d);
    }
    return null;
  }

  function daysBetween(a, b) { return Math.ceil((a - b) / 86400000); }

  function loadStore() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function saveStore(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function yearData(hy) {
    const s = loadStore();
    s[hy] = Object.assign({ fasts: 0, taraweeh: 0, quranPct: 0, charity: 0, charityGoal: 300 }, s[hy] || {});
    return { store: s, data: s[hy] };
  }

  function render() {
    const today = new Date();
    const h = hijri(today);
    const inRamadan = h.month === 9;
    const hy = inRamadan ? h.year : (h.month < 9 ? h.year : h.year + 1);

    // ----- countdown card -----
    if (inRamadan) {
      $('ramTitle').textContent = `Ramadan ${hy} · Day ${h.day}`;
      $('ramCountLabel').textContent = 'Days remaining';
      $('ramCountValue').textContent = Math.max(0, 30 - h.day);
    } else {
      const start = findNext(9, today);
      $('ramTitle').textContent = `Ramadan ${hy}`;
      $('ramCountLabel').textContent = 'Begins in';
      $('ramCountValue').textContent = start ? daysBetween(start, today) + ' days' : '—';
    }

    // ----- Eid al-Fitr (1 Shawwal) -----
    const eid = findNext(10, today);
    $('ramEidValue').textContent = eid ? daysBetween(eid, today) + ' days' : '—';

    // ----- timetable from today's timings -----
    const t = PH.state.today && PH.state.today.timings;
    $('ramImsak').textContent = t ? PH.fmtTime(t.Imsak) : '—';
    $('ramSuhoor').textContent = t ? PH.fmtTime(t.Fajr) : '—';   // suhoor ends at Fajr
    $('ramIftar').textContent = t ? PH.fmtTime(t.Maghrib) : '—'; // iftar at Maghrib
    tick();

    // ----- trackers -----
    const { data } = yearData(hy);
    setBar('ramFasts', data.fasts, 30, `${data.fasts} / 30`);
    setBar('ramTaraweeh', data.taraweeh, 30, `${data.taraweeh} / 30`);
    setBar('ramQuran', data.quranPct, 100, `${data.quranPct}%`);
    const pct = data.charityGoal ? Math.min(100, (data.charity / data.charityGoal) * 100) : 0;
    setBar('ramCharity', pct, 100, `$${data.charity} / $${data.charityGoal}`);
    $('ramYear').textContent = hy;

    if (!bound) bindControls(hy);
  }

  function setBar(id, val, max, label) {
    $(id + 'Val').textContent = label;
    $(id + 'Bar').style.width = Math.max(0, Math.min(100, (val / max) * 100)) + '%';
  }

  /* live Iftar countdown (called each second from app) */
  function tick() {
    const data = PH.state.today;
    if (!data || !data.timings) return;
    const now = PH.wallNow(data.tz);
    const [h, m] = PH.fmtTime(data.timings.Maghrib).split(':').map(Number);
    let iftar = new Date(now); iftar.setHours(h, m, 0, 0);
    let label = 'Iftar in';
    if (iftar <= now) { iftar.setDate(iftar.getDate() + 1); label = 'Iftar tomorrow in'; }
    const diff = iftar - now;
    const hh = Math.floor(diff / 3.6e6), mm = Math.floor((diff % 3.6e6) / 6e4), ss = Math.floor((diff % 6e4) / 1e3);
    const el = $('ramIftarCountdown'); if (!el) return;
    el.textContent = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
    $('ramIftarLabel').textContent = label;
  }

  function bindControls(hy) {
    bound = true;
    document.querySelectorAll('#view-ramadan [data-ram]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { store, data } = yearData(Number($('ramYear').textContent) || hy);
        const field = btn.dataset.ram, delta = Number(btn.dataset.delta);
        if (field === 'fasts') data.fasts = clamp(data.fasts + delta, 0, 30);
        if (field === 'taraweeh') data.taraweeh = clamp(data.taraweeh + delta, 0, 30);
        if (field === 'quranPct') data.quranPct = clamp(data.quranPct + delta, 0, 100);
        if (field === 'charity') data.charity = Math.max(0, data.charity + delta);
        saveStore(store); render();
      });
    });
    $('ramCharityGoal').addEventListener('change', e => {
      const { store, data } = yearData(Number($('ramYear').textContent) || hy);
      data.charityGoal = Math.max(1, parseInt(e.target.value, 10) || 300);
      saveStore(store); render();
    });
  }
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  return { render, tick };
})();
