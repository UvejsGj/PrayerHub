/* ============================================================
   PrayerHub — Quran module
   Read the Quran with translation + audio recitation (Mishary
   Alafasy), bookmark verses, mark ayat read, and track progress.
   Data: AlQuran.cloud API (free, no key).
   ============================================================ */
PH.quran = (function () {
  const $ = id => document.getElementById(id);
  const API = 'https://api.alquran.cloud/v1';
  const TOTAL_AYAT = 6236;
  const PROG = 'prayerhub.quran.v1';
  const BM = 'prayerhub.quran.bm.v1';

  let surahList = null, surahCache = {}, current = 1, edition = 'en.asad', bound = false, playingKey = null;

  /* ---------- storage ---------- */
  function prog() { try { return JSON.parse(localStorage.getItem(PROG)) || {}; } catch (e) { return {}; } }
  function saveProg(p) { localStorage.setItem(PROG, JSON.stringify(p)); }
  function bookmarks() { try { return JSON.parse(localStorage.getItem(BM)) || []; } catch (e) { return []; } }
  function saveBm(b) { localStorage.setItem(BM, JSON.stringify(b)); }

  function markRead(key) {
    const p = prog();
    p.read = p.read || {};
    if (!p.read[key]) {
      p.read[key] = 1;
      const today = PH.dateKey(new Date());
      if (!p.today || p.today.date !== today) p.today = { date: today, count: 0 };
      p.today.count++;
    }
    const [s, a] = key.split(':').map(Number);
    p.lastSurah = s; p.lastAyah = a;
    saveProg(p);
  }
  function toggleBm(key) {
    let b = bookmarks();
    b = b.includes(key) ? b.filter(x => x !== key) : [...b, key];
    saveBm(b); return b.includes(key);
  }

  /* ---------- fetch ---------- */
  async function getJSON(url) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 12000);
    try { const r = await fetch(url, { signal: ctrl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    finally { clearTimeout(t); }
  }

  async function loadList() {
    if (surahList) return surahList;
    const j = await getJSON(`${API}/surah`);
    surahList = j.data;
    return surahList;
  }

  async function loadSurah(n) {
    const cacheKey = n + '|' + edition;
    if (surahCache[cacheKey]) return surahCache[cacheKey];
    const j = await getJSON(`${API}/surah/${n}/editions/quran-uthmani,${edition},ar.alafasy`);
    const [ar, tr, au] = j.data;
    const ayat = ar.ayahs.map((a, i) => ({
      n: a.numberInSurah, ar: a.text,
      tr: (tr.ayahs[i] && tr.ayahs[i].text) || '',
      audio: (au.ayahs[i] && au.ayahs[i].audio) || '',
    }));
    const data = { meta: ar, ayat };
    surahCache[cacheKey] = data;
    return data;
  }

  /* ---------- render ---------- */
  function updateStats() {
    const p = prog();
    const read = p.read ? Object.keys(p.read).length : 0;
    $('quranReadPct').textContent = ((read / TOTAL_AYAT) * 100).toFixed(1) + '%';
    const today = PH.dateKey(new Date());
    $('quranToday').textContent = (p.today && p.today.date === today) ? p.today.count : 0;
    $('quranBmCount').textContent = bookmarks().length;
  }

  async function render() {
    if (!bound) await setup();
    updateStats();
    await show(current);
  }

  async function setup() {
    bound = true;
    const p = prog();
    current = p.lastSurah || 1;
    try {
      const list = await loadList();
      $('quranSurah').innerHTML = list.map(s =>
        `<option value="${s.number}">${s.number}. ${s.englishName} — ${s.name}</option>`).join('');
      $('quranSurah').value = current;
    } catch (e) { /* dropdown stays empty; show() will surface the error */ }
    $('quranSurah').addEventListener('change', e => { current = Number(e.target.value); show(current); });
    $('quranEdition').addEventListener('change', e => { edition = e.target.value; show(current); });
    $('quranAudio').addEventListener('ended', () => { playingKey = null; paintPlaying(); });
  }

  async function show(n) {
    const wrap = $('quranAyat');
    wrap.innerHTML = '<p class="muted">Loading surah…</p>';
    $('quranSurah').value = n;
    try {
      const { meta, ayat } = await loadSurah(n);
      $('quranSurahName').textContent = `${meta.englishName} · ${meta.name}`;
      $('quranSurahSub').textContent = `${meta.englishNameTranslation} · ${meta.revelationType} · ${meta.numberOfAyahs} ayat`;
      const bm = bookmarks(), read = prog().read || {};
      wrap.innerHTML = ayat.map(a => {
        const key = `${n}:${a.n}`;
        const isBm = bm.includes(key), isRead = !!read[key];
        return `<div class="ayah glass ${isRead ? 'is-read' : ''}" data-key="${key}">
          <div class="ayah__bar">
            <button class="ayah__num" data-read="${key}" title="Mark read">${a.n}</button>
            <div class="ayah__actions">
              <button class="ayah__btn" data-play="${key}" data-audio="${a.audio}" title="Play"><span class="material-symbols-outlined">play_arrow</span></button>
              <button class="ayah__btn ${isBm ? 'is-bm' : ''}" data-bm="${key}" title="Bookmark"><span class="material-symbols-outlined">${isBm ? 'bookmark' : 'bookmark_border'}</span></button>
            </div>
          </div>
          <p class="ayah__ar">${a.ar}</p>
          <p class="ayah__tr">${a.tr}</p>
        </div>`;
      }).join('');
      bindAyat();
      markRead(`${n}:1`); // opening a surah counts the first ayah as reached
      updateStats();
    } catch (e) {
      wrap.innerHTML = `<p class="muted">Couldn't load this surah (network). </p><button class="btn" id="quranRetry">↻ Retry</button>`;
      const rb = $('quranRetry'); if (rb) rb.addEventListener('click', () => show(n));
    }
  }

  function bindAyat() {
    const wrap = $('quranAyat');
    wrap.querySelectorAll('[data-read]').forEach(b => b.addEventListener('click', () => {
      markRead(b.dataset.read);
      b.closest('.ayah').classList.add('is-read');
      updateStats();
    }));
    wrap.querySelectorAll('[data-bm]').forEach(b => b.addEventListener('click', () => {
      const on = toggleBm(b.dataset.bm);
      b.classList.toggle('is-bm', on);
      b.querySelector('.material-symbols-outlined').textContent = on ? 'bookmark' : 'bookmark_border';
      updateStats();
    }));
    wrap.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => play(b.dataset.play, b.dataset.audio)));
  }

  function play(key, url) {
    const audio = $('quranAudio');
    if (!url) { PH.ui.toast('No audio for this verse.'); return; }
    if (playingKey === key) { audio.pause(); playingKey = null; paintPlaying(); return; }
    audio.src = url; audio.play().catch(() => PH.ui.toast('Audio playback blocked.'));
    playingKey = key; paintPlaying();
    markRead(key); updateStats();
  }
  function paintPlaying() {
    document.querySelectorAll('#quranAyat .ayah').forEach(el => {
      const on = el.dataset.key === playingKey;
      el.classList.toggle('is-playing', on);
      const ic = el.querySelector('[data-play] .material-symbols-outlined');
      if (ic) ic.textContent = on ? 'pause' : 'play_arrow';
    });
  }

  return { render };
})();
