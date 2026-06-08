/* ============================================================
   PrayerHub UI — rendering, charts, theme, countdown helpers
   ============================================================ */
PH.ui = (function () {
  const $ = id => document.getElementById(id);
  const PRAYERS = PH.config.prayers;
  const charts = {};
  let toastTimer;

  /* ---------- toast ---------- */
  function toast(msg) {
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ---------- theme ---------- */
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    $('themeToggle').innerHTML = `<span class="material-symbols-outlined">${theme === 'dark' ? 'dark_mode' : 'light_mode'}</span>`;
    document.querySelector('meta[name=theme-color]').setAttribute('content', theme === 'dark' ? '#070b16' : '#eaf1fb');
  }

  // Eye-catching circular reveal from the toggle button (View Transitions API),
  // plus a quick pop/rotate of the icon. Falls back to instant apply.
  function animateTheme(apply, e) {
    const btn = $('themeToggle');
    if (btn) { btn.classList.remove('popping'); void btn.offsetWidth; btn.classList.add('popping'); }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) { apply(); return; }
    const x = e && e.clientX ? e.clientX : window.innerWidth - 40;
    const y = e && e.clientY ? e.clientY : 64;
    const end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${end}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  }

  /* ---------- time parsing ---------- */
  // "HH:MM" -> Date on the given base day
  function toDate(hhmm, base = new Date()) {
    const [h, m] = PH.fmtTime(hhmm).split(':').map(Number);
    const d = new Date(base);
    d.setHours(h, m, 0, 0);
    return d;
  }

  /* next prayer relative to `now` from a timings object */
  function nextPrayer(timings, now = new Date()) {
    const list = PRAYERS.map(p => ({ ...p, at: toDate(timings[p.key], now) }));
    for (let i = 0; i < list.length; i++) {
      if (list[i].at > now) {
        const prev = i === 0 ? toDate(timings.Isha, new Date(now.getTime() - 864e5)) : list[i - 1].at;
        return { ...list[i], index: i, prev, tomorrow: false };
      }
    }
    // all passed → Fajr tomorrow
    const t = new Date(now.getTime() + 864e5);
    return { ...PRAYERS[0], at: toDate(timings.Fajr, t), index: 0, prev: list[4].at, tomorrow: true };
  }

  /* ---------- status line ---------- */
  function renderStatus(label, source, customLabel) {
    $('locationLabel').textContent = label;
    const ds = $('dataSource');
    if (source === 'live') { ds.textContent = '● ' + PH.t('status.live'); ds.className = 'chip chip--live'; }
    else { ds.textContent = '◐ ' + PH.t('status.offline'); ds.className = 'chip chip--fallback'; }
    const cc = $('customCfg');
    if (customLabel) { cc.textContent = customLabel; cc.classList.remove('hidden'); }
    else cc.classList.add('hidden');
  }

  /* ---------- hero dates ---------- */
  function renderHeroDates(data) {
    const g = data.gregorian, h = data.hijri;
    // Build a Date from the API's gregorian fields, then format in the active language.
    const d = new Date(`${g.year}-${String(monthIndex(g.month.en) + 1).padStart(2, '0')}-${String(g.day).padStart(2, '0')}T12:00:00`);
    const ok = !isNaN(d);
    $('gregorianDate').textContent = ok ? PH.i18n.fmtDate(d, true) : `${g.day} ${g.month.en} ${g.year}`;
    $('hijriDate').textContent = `${h.day} ${h.month.en} ${h.year} AH`;
    $('todayLabel').textContent = ok ? PH.i18n.fmtDate(d, false) : `${g.day} ${g.month.en} ${g.year}`;
  }

  /* ---------- prayer grid ---------- */
  function renderPrayerGrid(timings, now, onToggle) {
    const grid = $('prayerGrid');
    const np = nextPrayer(timings, now);
    const todayKey = PH.dateKey(new Date());
    const dayLog = PH.track.getDay(todayKey);
    grid.innerHTML = '';
    PRAYERS.forEach((p, i) => {
      const at = toDate(timings[p.key], now);
      const passed = at < now && !(np.index === i && np.tomorrow);
      const isNext = np.index === i && !np.tomorrow ? np.at > now && np.key === p.key : false;
      const logged = dayLog[p.key];
      const card = document.createElement('div');
      card.className = 'prayer-card glass' + (isNext ? ' is-next' : '') + (passed ? ' is-passed' : '');
      card.style.animationDelay = (i * 60) + 'ms';
      card.innerHTML = `
        <span class="prayer-card__ico material-symbols-outlined">${p.ico}</span>
        <span class="prayer-card__name">${PH.t('prayer.' + p.key)}<span class="ar">${p.ar}</span></span>
        <span class="prayer-card__time">${PH.fmtTime(timings[p.key])}</span>
        <span class="prayer-card__meta">${passed ? PH.t('card.passed') : (isNext ? PH.t('card.upcoming') : PH.t('card.today'))}</span>
        <button class="prayer-card__check ${logged && logged !== 'missed' ? 'done' : ''}" data-prayer="${p.key}">
          ${logged ? (PH.config.statusMeta[logged] ? PH.t('st.' + logged) : '') : '○ ' + PH.t('card.mark')}
        </button>`;
      card.querySelector('.prayer-card__check').addEventListener('click', () => onToggle(p.key));
      grid.appendChild(card);
    });
    // secondary times
    $('t-sunrise').textContent = PH.fmtTime(timings.Sunrise);
    $('t-sunset').textContent = PH.fmtTime(timings.Sunset || timings.Maghrib);
    $('t-imsak').textContent = PH.fmtTime(timings.Imsak);
    $('t-midnight').textContent = PH.fmtTime(timings.Midnight);
    $('t-lastthird').textContent = PH.fmtTime(timings.Lastthird);
  }

  /* ---------- countdown (called every second) ---------- */
  function tickCountdown(timings) {
    if (!timings) return;
    const now = PH.wallNow(PH.state.today && PH.state.today.tz);
    $('liveClock').textContent = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const np = nextPrayer(timings, now);
    $('nextPrayerName').textContent = PH.t('prayer.' + np.key) + (np.tomorrow ? ' ' + PH.t('common.tomorrow') : '');
    let diff = Math.max(0, np.at - now);
    const h = Math.floor(diff / 3.6e6), m = Math.floor((diff % 3.6e6) / 6e4), s = Math.floor((diff % 6e4) / 1e3);
    $('countdown').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    // progress between prev and next prayer
    const span = np.at - np.prev;
    const done = now - np.prev;
    const pct = span > 0 ? Math.max(0, Math.min(100, (done / span) * 100)) : 0;
    $('prayerProgress').style.width = pct + '%';
  }

  /* ---------- tracking view ---------- */
  function renderTracking(date, onCycle) {
    const key = PH.dateKey(date);
    const day = PH.track.getDay(key);
    const timings = (PH.state.today && PH.dateKey(new Date()) === key) ? PH.state.today.timings : null;
    const grid = $('trackGrid');
    grid.innerHTML = '';
    PRAYERS.forEach(p => {
      const st = day[p.key];
      const meta = st ? PH.config.statusMeta[st] : null;
      const cell = document.createElement('div');
      cell.className = 'track-cell glass-soft';
      if (st) cell.dataset.status = st;
      cell.innerHTML = `
        <span class="prayer-card__ico material-symbols-outlined">${p.ico}</span>
        <span class="track-cell__name">${PH.t('prayer.' + p.key)}</span>
        <span class="track-cell__time">${timings ? PH.fmtTime(timings[p.key]) : '—'}</span>
        <span class="track-cell__status">${st ? PH.t('st.' + st) : PH.t('st.none')}</span>`;
      cell.addEventListener('click', () => onCycle(key, p.key));
      grid.appendChild(cell);
    });
    const logged = PRAYERS.filter(p => day[p.key]).length;
    $('trackLogged').textContent = `${logged} / 5`;
    $('trackScore').textContent = Math.round(PH.track.dayScore(day) * 100) + '%';
    $('trackStreak').innerHTML = PH.track.currentStreak() + ' <span class="material-symbols-outlined" style="font-size:1.15rem;color:var(--gold);vertical-align:-2px">local_fire_department</span>';
    const now = new Date();
    const isToday = key === PH.dateKey(now);
    const isYday = key === PH.dateKey(new Date(now.getTime() - 864e5));
    $('trackDateLabel').textContent = isToday ? PH.t('track.today') : isYday ? PH.t('track.yesterday')
      : PH.i18n.fmtDate(date, false);
  }

  /* ---------- analytics view ---------- */
  function renderAnalytics() {
    $('statConsistency').textContent = PH.track.consistency(30) + '%';
    $('statStreak').textContent = PH.track.currentStreak();
    $('statBestStreak').textContent = PH.track.bestStreak();
    $('statTotal').textContent = PH.track.totalLogged();

    const css = getComputedStyle(document.documentElement);
    const text = css.getPropertyValue('--text-dim').trim();
    const grid = css.getPropertyValue('--glass-brd').trim();
    Chart.defaults.color = text;
    Chart.defaults.font.family = 'Inter, sans-serif';

    // last 14 days bar
    const ds = PH.track.dailySeries(14);
    drawChart('weeklyChart', {
      type: 'bar',
      data: { labels: ds.labels, datasets: [{ data: ds.values, backgroundColor: 'rgba(52,211,153,.7)', borderRadius: 6, maxBarThickness: 22 }] },
      options: baseOpts(grid, 5),
    });

    // by prayer
    const bp = PH.track.byPrayer(30);
    drawChart('byPrayerChart', {
      type: 'bar',
      data: { labels: bp.map(x => x.prayer), datasets: [{ data: bp.map(x => x.rate),
        backgroundColor: ['#34d399','#0ea5e9','#6366f1','#f5c451','#f472b6'], borderRadius: 6, maxBarThickness: 30 }] },
      options: baseOpts(grid, 100, '%'),
    });

    // status breakdown bars
    const bd = PH.track.statusBreakdown(30);
    const total = Object.values(bd).reduce((a, b) => a + b, 0) || 1;
    const order = ['ontime', 'jamaah', 'late', 'qada', 'missed', 'none'];
    const colors = { ontime:'#34d399', jamaah:'#10b981', late:'#f5c451', qada:'#a5b4fc', missed:'#f87171', none:'rgba(148,163,184,.4)' };
    $('statusBreakdown').innerHTML = order.map(k => {
      const label = k === 'none' ? PH.t('bd.none') : PH.t('st.' + k);
      const pct = Math.round((bd[k] / total) * 100);
      return `<div class="breakdown__row"><span>${label}</span>
        <span class="breakdown__bar"><span style="width:${pct}%;background:${colors[k]}"></span></span>
        <span class="muted" style="text-align:right">${pct}%</span></div>`;
    }).join('');

    $('sidebarStreak').textContent = PH.track.currentStreak();
  }

  function baseOpts(grid, max, suffix = '') {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.parsed.y + suffix } } },
      scales: {
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true } },
        y: { beginAtZero: true, max, grid: { color: grid }, ticks: { stepSize: max === 5 ? 1 : 25, callback: v => v + suffix } },
      },
    };
  }
  function drawChart(id, cfg) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart($(id).getContext('2d'), cfg);
  }

  /* ---------- calendar view ---------- */
  function renderCalendar(monthData, calDate) {
    $('calMonthLabel').textContent = PH.i18n.fmtMonth(calDate);
    const body = $('calBody');
    if (!monthData) { body.innerHTML = '<tr><td colspan="7" class="muted">Loading month…</td></tr>'; return; }
    const todayKey = PH.dateKey(new Date());
    body.innerHTML = monthData.map(d => {
      const g = d.gregorian, t = d.timings;
      const key = `${g.year}-${String(monthIndex(g.month.en)+1).padStart(2,'0')}-${String(g.day).padStart(2,'0')}`;
      const isToday = key === todayKey;
      return `<tr class="${isToday ? 'is-today' : ''}">
        <td>${g.day} <span class="cal-hijri">${d.hijri.day} ${d.hijri.month.en}</span></td>
        <td>${PH.fmtTime(t.Fajr)}</td><td>${PH.fmtTime(t.Sunrise)}</td><td>${PH.fmtTime(t.Dhuhr)}</td>
        <td>${PH.fmtTime(t.Asr)}</td><td>${PH.fmtTime(t.Maghrib)}</td><td>${PH.fmtTime(t.Isha)}</td></tr>`;
    }).join('');
  }
  function monthIndex(name) {
    return ['January','February','March','April','May','June','July','August','September','October','November','December'].indexOf(name);
  }

  return { toast, setTheme, animateTheme, renderStatus, renderHeroDates, renderPrayerGrid, tickCountdown, renderTracking, renderAnalytics, renderCalendar, nextPrayer };
})();
