/* ============================================================
   PrayerHub — Quran module
   Read with translation + audio recitation (Mishary Alafasy), a
   word-by-word highlight synced to the recitation, bookmark verses,
   mark ayat read, and track progress.
   • Arabic words + audio + per-word timings: Quran.com API v4
   • Translations (en.asad / sq.ahmeti / …): AlQuran.cloud
   ============================================================ */
PH.quran = (function () {
  const $ = id => document.getElementById(id);
  const AQ = 'https://api.alquran.cloud/v1';
  const QC = 'https://api.quran.com/api/v4';
  const AUDIO_BASE = 'https://verses.quran.com/';
  const TOTAL_AYAT = 6236;
  const PROG = 'prayerhub.quran.v1';
  const BM = 'prayerhub.quran.bm.v1';

  let surahList = null, qCache = {}, trCache = {}, current = 1, edition = 'en.asad';
  let bound = false, playingKey = null, ayatList = [], currentSegments = [];

  /* ---------- storage ---------- */
  function prog() { try { return JSON.parse(localStorage.getItem(PROG)) || {}; } catch (e) { return {}; } }
  function saveProg(p) { localStorage.setItem(PROG, JSON.stringify(p)); }
  function bookmarks() { try { return JSON.parse(localStorage.getItem(BM)) || []; } catch (e) { return []; } }
  function saveBm(b) { localStorage.setItem(BM, JSON.stringify(b)); }
  function markRead(key) {
    const p = prog(); p.read = p.read || {};
    if (!p.read[key]) {
      p.read[key] = 1;
      const today = PH.dateKey(new Date());
      if (!p.today || p.today.date !== today) p.today = { date: today, count: 0 };
      p.today.count++;
    }
    const [s, a] = key.split(':').map(Number);
    p.lastSurah = s; p.lastAyah = a; saveProg(p);
  }
  function toggleBm(key) { let b = bookmarks(); b = b.includes(key) ? b.filter(x => x !== key) : [...b, key]; saveBm(b); return b.includes(key); }

  /* ---------- fetch ---------- */
  async function getJSON(url, ms = 13000) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
    try { const r = await fetch(url, { signal: ctrl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    finally { clearTimeout(t); }
  }
  async function loadList() {
    if (surahList) return surahList;
    surahList = (await getJSON(`${AQ}/surah`)).data;
    return surahList;
  }
  // Arabic words + audio + per-word timing segments (cached per surah).
  async function loadQuran(n) {
    if (qCache[n]) return qCache[n];
    const j = await getJSON(`${QC}/verses/by_chapter/${n}?words=true&word_fields=text_uthmani&audio=7&per_page=300`);
    qCache[n] = j.verses.map(v => ({
      n: v.verse_number,
      words: v.words.filter(w => w.char_type_name === 'word').map(w => ({ pos: w.position, ar: w.text_uthmani })),
      audio: v.audio && v.audio.url ? AUDIO_BASE + v.audio.url : '',
      // segment = [segIndex, wordPosition, startMs, endMs]
      segments: ((v.audio && v.audio.segments) || []).map(s => ({ word: s[1], start: s[2], end: s[3] })),
    }));
    return qCache[n];
  }
  // Translation text + surah meta (cached per surah+edition).
  async function loadTranslation(n, ed) {
    const k = n + '|' + ed;
    if (trCache[k]) return trCache[k];
    const j = await getJSON(`${AQ}/surah/${n}/${ed}`);
    const byNum = {}; j.data.ayahs.forEach(a => { byNum[a.numberInSurah] = a.text; });
    trCache[k] = { meta: j.data, byNum };
    return trCache[k];
  }
  async function loadSurah(n) {
    const [verses, tr] = await Promise.all([loadQuran(n), loadTranslation(n, edition)]);
    const ayat = verses.map(v => ({ n: v.n, words: v.words, audio: v.audio, segments: v.segments, tr: tr.byNum[v.n] || '' }));
    return { meta: tr.meta, ayat };
  }

  /* ---------- stats ---------- */
  function updateStats() {
    const p = prog();
    const read = p.read ? Object.keys(p.read).length : 0;
    $('quranReadPct').textContent = ((read / TOTAL_AYAT) * 100).toFixed(1) + '%';
    const today = PH.dateKey(new Date());
    $('quranToday').textContent = (p.today && p.today.date === today) ? p.today.count : 0;
    $('quranBmCount').textContent = bookmarks().length;
  }

  /* ---------- render ---------- */
  async function render() { if (!bound) await setup(); updateStats(); await show(current); }

  async function setup() {
    bound = true;
    const p = prog(); current = p.lastSurah || 1;
    if (PH.i18n && PH.i18n.lang === 'sq') edition = 'sq.ahmeti';
    $('quranEdition').value = edition;
    try {
      const list = await loadList();
      $('quranSurah').innerHTML = list.map(s => `<option value="${s.number}">${s.number}. ${s.englishName} — ${s.name}</option>`).join('');
      $('quranSurah').value = current;
    } catch (e) {}
    $('quranSurah').addEventListener('change', e => { current = Number(e.target.value); show(current); });
    $('quranEdition').addEventListener('change', e => { edition = e.target.value; show(current); });
    const audio = $('quranAudio');
    audio.addEventListener('ended', () => playNext(ayatList.findIndex(x => x.key === playingKey) + 1)); // auto-advance
    audio.addEventListener('timeupdate', updateTime);
  }

  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  async function show(n) {
    const wrap = $('quranAyat');
    if (playingKey && Number(playingKey.split(':')[0]) !== n) stop();
    wrap.innerHTML = `<p class="muted">${PH.t('quran.loading')}</p>`;
    $('quranSurah').value = n;
    try {
      const { meta, ayat } = await loadSurah(n);
      ayatList = ayat.map(a => ({ key: `${n}:${a.n}`, audio: a.audio, segments: a.segments }));
      $('quranSurahName').textContent = `${meta.englishName} · ${meta.name}`;
      $('quranSurahSub').textContent = `${meta.englishNameTranslation} · ${meta.revelationType} · ${meta.numberOfAyahs} ayat`;
      const bm = bookmarks(), read = prog().read || {};
      wrap.innerHTML = ayat.map(a => {
        const key = `${n}:${a.n}`;
        const isBm = bm.includes(key), isRead = !!read[key];
        const arHtml = a.words.map(w => `<span class="qw" data-w="${w.pos}">${w.ar}</span>`).join(' ');
        return `<div class="ayah glass ${isRead ? 'is-read' : ''}" data-key="${key}">
          <div class="ayah__bar">
            <button class="ayah__num" data-read="${key}" title="Mark read">${a.n}</button>
            <div class="ayah__actions">
              <button class="ayah__btn" data-play="${key}" title="Play"><span class="material-symbols-outlined">play_arrow</span></button>
              <button class="ayah__btn ${isBm ? 'is-bm' : ''}" data-bm="${key}" title="Bookmark"><span class="material-symbols-outlined">${isBm ? 'bookmark' : 'bookmark_border'}</span></button>
            </div>
          </div>
          <p class="ayah__ar">${arHtml}</p>
          <p class="ayah__tr">${esc(a.tr)}</p>
          <div class="ayah__progress"><div class="ayah__seek"><span></span></div><span class="ayah__time">0:00 / 0:00</span></div>
        </div>`;
      }).join('');
      bindAyat();
      markRead(`${n}:1`); // opening a surah counts the first ayah as reached
      // keep the currently-playing ayah highlighted across re-renders (e.g. language switch)
      if (playingKey) { const item = ayatList.find(x => x.key === playingKey); if (item) currentSegments = item.segments || []; }
      paintPlaying();
      if (playingKey) { scrollToAyah(playingKey); updateTime(); }
      updateStats();
    } catch (e) {
      wrap.innerHTML = `<p class="muted">${PH.t('quran.error')}</p><button class="btn" id="quranRetry">↻ ${PH.t('mosq.retry')}</button>`;
      const rb = $('quranRetry'); if (rb) rb.addEventListener('click', () => show(n));
    }
  }

  function bindAyat() {
    const wrap = $('quranAyat');
    wrap.querySelectorAll('[data-read]').forEach(b => b.addEventListener('click', () => { markRead(b.dataset.read); b.closest('.ayah').classList.add('is-read'); updateStats(); }));
    wrap.querySelectorAll('[data-bm]').forEach(b => b.addEventListener('click', () => {
      const on = toggleBm(b.dataset.bm); b.classList.toggle('is-bm', on);
      b.querySelector('.material-symbols-outlined').textContent = on ? 'bookmark' : 'bookmark_border'; updateStats();
    }));
    wrap.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => play(b.dataset.play)));
    wrap.querySelectorAll('.ayah__seek').forEach(s => s.addEventListener('click', e => {
      const audio = $('quranAudio');
      if (s.closest('.ayah').dataset.key === playingKey && audio.duration) {
        const r = s.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
      }
    }));
  }

  // Tap a verse to play; when it ends, the next plays automatically.
  function play(key) { if (playingKey === key) { $('quranAudio').pause(); stop(); return; } playNext(ayatList.findIndex(x => x.key === key)); }
  function playNext(i) {
    if (i < 0 || i >= ayatList.length) { stop(); return; }
    const item = ayatList[i];
    if (!item.audio) return playNext(i + 1);
    const audio = $('quranAudio');
    audio.src = item.audio; audio.play().catch(() => PH.ui.toast('Audio playback blocked — tap play again.'));
    playingKey = item.key; currentSegments = item.segments || [];
    paintPlaying(); markRead(item.key); updateStats(); scrollToAyah(item.key);
  }
  function stop() { $('quranAudio').pause(); playingKey = null; currentSegments = []; paintPlaying(); }

  function paintPlaying() {
    document.querySelectorAll('#quranAyat .ayah').forEach(el => {
      const on = el.dataset.key === playingKey;
      el.classList.toggle('is-playing', on);
      const ic = el.querySelector('[data-play] .material-symbols-outlined');
      if (ic) ic.textContent = on ? 'pause' : 'play_arrow';
      if (!on) {
        const t = el.querySelector('.ayah__time'), bar = el.querySelector('.ayah__seek > span');
        if (t) t.textContent = '0:00 / 0:00'; if (bar) bar.style.width = '0';
        el.querySelectorAll('.qw-active').forEach(w => w.classList.remove('qw-active'));
      }
    });
  }
  function scrollToAyah(key) { const el = document.querySelector(`#quranAyat .ayah[data-key="${key}"]`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

  const fmtT = s => isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
  function updateTime() {
    const audio = $('quranAudio');
    const el = document.querySelector('#quranAyat .ayah.is-playing'); if (!el) return;
    const t = el.querySelector('.ayah__time'); if (t) t.textContent = `${fmtT(audio.currentTime)} / ${fmtT(audio.duration)}`;
    const bar = el.querySelector('.ayah__seek > span'); if (bar && audio.duration) bar.style.width = (audio.currentTime / audio.duration * 100) + '%';
    // word-by-word highlight synced to the recitation
    const ms = audio.currentTime * 1000;
    let active = -1;
    for (const sg of currentSegments) { if (ms >= sg.start && ms < sg.end) { active = sg.word; break; } }
    el.querySelectorAll('.qw').forEach(w => w.classList.toggle('qw-active', Number(w.dataset.w) === active));
  }

  // Match the translation edition to the app language (called from the language toggle).
  function setLang() { edition = PH.i18n.lang === 'sq' ? 'sq.ahmeti' : 'en.asad'; const sel = $('quranEdition'); if (sel) sel.value = edition; }

  return { render, setLang };
})();
