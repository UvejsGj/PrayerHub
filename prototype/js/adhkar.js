/* ============================================================
   Salah OS — Adhkar & Du'as
   Morning / evening / sleep / travel / after-prayer remembrances
   with tap-to-count, daily progress, and favorites (local).
   ============================================================ */
PH.adhkar = (function () {
  const $ = id => document.getElementById(id);
  const KEY = 'prayerhub.adhkar.v1';
  const FAV = 'prayerhub.adhkar.fav.v1';

  const CATEGORIES = [
    { id: 'morning', label: 'Morning', ico: 'wb_sunny' },
    { id: 'evening', label: 'Evening', ico: 'wb_twilight' },
    { id: 'sleep', label: 'Sleep', ico: 'bedtime' },
    { id: 'travel', label: 'Travel', ico: 'flight' },
    { id: 'after_prayer', label: 'After Prayer', ico: 'self_improvement' },
  ];

  // Concise, widely-cited set. References abbreviated.
  const DATA = {
    morning: [
      { id: 'm1', ar: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', en: 'We have entered the morning and the dominion belongs to Allah; praise be to Allah. There is no deity but Allah alone, with no partner.', ref: 'Muslim', repeat: 1 },
      { id: 'm2', ar: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ', en: 'O Allah, by You we enter the morning and the evening, by You we live and die, and to You is the resurrection.', ref: 'Tirmidhi', repeat: 1 },
      { id: 'm3', ar: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', en: 'In the name of Allah with whose name nothing in the earth or the heaven can cause harm, and He is the All-Hearing, All-Knowing.', ref: 'Abu Dawud · Tirmidhi', repeat: 3 },
      { id: 'm4', ar: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', en: 'Glory be to Allah and praise be to Him.', ref: 'Muslim', repeat: 100 },
      { id: 'm5', ar: 'رَضِيتُ بِاللَّهِ رَبًّا، وَبِالْإِسْلَامِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا', en: 'I am pleased with Allah as Lord, with Islam as religion, and with Muhammad ﷺ as Prophet.', ref: 'Abu Dawud', repeat: 3 },
    ],
    evening: [
      { id: 'e1', ar: 'أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', en: 'We have entered the evening and the dominion belongs to Allah; praise be to Allah. There is no deity but Allah alone, with no partner.', ref: 'Muslim', repeat: 1 },
      { id: 'e2', ar: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ', en: 'O Allah, by You we enter the evening and the morning, by You we live and die, and to You is the final return.', ref: 'Tirmidhi', repeat: 1 },
      { id: 'e3', ar: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', en: 'I seek refuge in the perfect words of Allah from the evil of what He has created.', ref: 'Muslim', repeat: 3 },
      { id: 'e4', ar: 'بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ', en: 'In the name of Allah with whose name nothing can cause harm, and He is the All-Hearing, All-Knowing.', ref: 'Abu Dawud · Tirmidhi', repeat: 3 },
    ],
    sleep: [
      { id: 's1', ar: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', en: 'In Your name, O Allah, I die and I live.', ref: 'Bukhari', repeat: 1 },
      { id: 's2', ar: 'اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ', en: 'O Allah, protect me from Your punishment on the Day You resurrect Your servants.', ref: 'Abu Dawud', repeat: 3 },
      { id: 's3', ar: 'سُبْحَانَ اللَّهِ (٣٣) · الْحَمْدُ لِلَّهِ (٣٣) · اللَّهُ أَكْبَرُ (٣٤)', en: 'Glory be to Allah (33), praise be to Allah (33), Allah is the Greatest (34).', ref: 'Bukhari · Muslim', repeat: 1 },
    ],
    travel: [
      { id: 't1', ar: 'سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ، وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ', en: 'Glory be to Him who has subjected this to us, and we could not have done it ourselves; and indeed, to our Lord we will return.', ref: 'Muslim', repeat: 1 },
      { id: 't2', ar: 'اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى', en: 'O Allah, we ask You on this journey for righteousness, piety, and deeds that please You.', ref: 'Muslim', repeat: 1 },
      { id: 't3', ar: 'أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ', en: 'I seek refuge in the perfect words of Allah from the evil of what He has created.', ref: 'Muslim', repeat: 3 },
    ],
    after_prayer: [
      { id: 'a1', ar: 'أَسْتَغْفِرُ اللَّهَ', en: 'I seek the forgiveness of Allah.', ref: 'Muslim', repeat: 3 },
      { id: 'a2', ar: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ', en: 'O Allah, You are Peace and from You is peace. Blessed are You, O Owner of majesty and honor.', ref: 'Muslim', repeat: 1 },
      { id: 'a3', ar: 'سُبْحَانَ اللَّهِ', en: 'Glory be to Allah.', ref: 'Muslim', repeat: 33 },
      { id: 'a4', ar: 'الْحَمْدُ لِلَّهِ', en: 'Praise be to Allah.', ref: 'Muslim', repeat: 33 },
      { id: 'a5', ar: 'اللَّهُ أَكْبَرُ', en: 'Allah is the Greatest.', ref: 'Muslim', repeat: 33 },
      { id: 'a6', ar: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ', en: 'There is no deity but Allah alone, with no partner; His is the dominion and praise, and He is over all things competent.', ref: 'Muslim', repeat: 1 },
    ],
  };

  let activeCat = 'morning';

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
  function today() { return PH.dateKey(new Date()); }
  function counts() { const s = load(); return s[today()] || {}; }
  function setCount(id, val) {
    const s = load(); const d = s[today()] || {};
    if (val <= 0) delete d[id]; else d[id] = val;
    if (Object.keys(d).length) s[today()] = d; else delete s[today()];
    save(s);
  }
  function loadFavs() { try { return JSON.parse(localStorage.getItem(FAV)) || []; } catch (e) { return []; } }
  function toggleFav(id) {
    let f = loadFavs(); f = f.includes(id) ? f.filter(x => x !== id) : [...f, id];
    localStorage.setItem(FAV, JSON.stringify(f)); return f.includes(id);
  }

  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  function render(cat) {
    if (cat) activeCat = cat;
    // tabs
    $('adhkarTabs').innerHTML = CATEGORIES.map(c =>
      `<button class="adhkar-tab ${c.id === activeCat ? 'is-active' : ''}" data-cat="${c.id}"><span class="material-symbols-outlined">${c.ico}</span> ${PH.t('adh.' + (c.id === 'after_prayer' ? 'after' : c.id))}</button>`).join('');
    $('adhkarTabs').querySelectorAll('.adhkar-tab').forEach(b =>
      b.addEventListener('click', () => render(b.dataset.cat)));

    const list = DATA[activeCat];
    const cnt = counts(), favs = loadFavs();
    const done = list.filter(x => (cnt[x.id] || 0) >= x.repeat).length;
    $('adhkarProgress').textContent = `${done} / ${list.length} ${PH.t('adh.progress')}`;

    $('adhkarList').innerHTML = list.map(d => {
      const c = cnt[d.id] || 0, complete = c >= d.repeat, fav = favs.includes(d.id);
      return `<div class="adhkar-card glass ${complete ? 'is-done' : ''}" data-id="${d.id}">
        <div class="adhkar-card__top">
          <span class="adhkar-card__count">${c} / ${d.repeat}</span>
          <button class="adhkar-fav ${fav ? 'is-fav' : ''}" data-fav="${d.id}" title="Favorite"><span class="material-symbols-outlined">${fav ? 'favorite' : 'favorite_border'}</span></button>
        </div>
        <p class="adhkar-ar">${esc(d.ar)}</p>
        <p class="adhkar-en">${esc(d.en)}</p>
        <div class="adhkar-card__foot">
          <span class="adhkar-ref">${esc(d.ref)}</span>
          <span class="adhkar-tap">${complete ? '✓ ' + PH.t('adh.done') : PH.t('adh.tap')}</span>
        </div>
      </div>`;
    }).join('');

    // tap card body → increment
    $('adhkarList').querySelectorAll('.adhkar-card').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.adhkar-fav')) return;
        const d = list.find(x => x.id === card.dataset.id);
        const c = (counts()[d.id] || 0);
        setCount(d.id, c >= d.repeat ? 0 : c + 1); // wrap when finished
        render();
      });
    });
    $('adhkarList').querySelectorAll('.adhkar-fav').forEach(b =>
      b.addEventListener('click', () => { toggleFav(b.dataset.fav); render(); }));
  }

  return { render };
})();
