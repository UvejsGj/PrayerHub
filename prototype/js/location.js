/* ============================================================
   Salah OS — location picker
   A two-step cascade: choose a COUNTRY, then a CITY of that country.
   • Country + city lists: countriesnow.space (free, no key, CORS-open),
     cached in localStorage (instant + offline after first load).
   • The chosen "city, country" is geocoded to coordinates with a
     STRUCTURED Nominatim query (city= + countrycodes=) — far more
     reliable than the old free-text search — so every coordinate-based
     feature (Qibla, Mosque finder, sun times) keeps working.
   • A one-tap GPS option fills everything from the device location.
   The picker fires onSelect({ lat, lng, city, country, iso2, label });
   the app turns that into prefs + a data reload.
   ============================================================ */
PH.location = (function () {
  const $ = id => document.getElementById(id);
  const esc = PH.esc;
  const CN = 'https://countriesnow.space/api/v0.1';
  const COUNTRIES_KEY = 'prayerhub.countries.v1';
  const cityKey = iso2 => 'prayerhub.cities.' + (iso2 || 'xx');

  // Minimal offline fallback if the countries API is unreachable on first run.
  const FALLBACK_COUNTRIES = [
    { name: 'Albania', iso2: 'al' }, { name: 'Kosovo', iso2: 'xk' }, { name: 'North Macedonia', iso2: 'mk' },
    { name: 'Saudi Arabia', iso2: 'sa' }, { name: 'Turkey', iso2: 'tr' }, { name: 'United Kingdom', iso2: 'gb' },
    { name: 'United States', iso2: 'us' }, { name: 'Germany', iso2: 'de' }, { name: 'United Arab Emirates', iso2: 'ae' },
    { name: 'Egypt', iso2: 'eg' }, { name: 'Pakistan', iso2: 'pk' }, { name: 'Indonesia', iso2: 'id' },
  ];

  let countries = [];          // [{ name, iso2 }]
  let cityCache = {};          // iso2 -> [city names]
  let sel = { country: '', iso2: '', city: '' };
  let onSelect = null, getCurrent = null, bound = false;
  let countryCombo, cityCombo;

  /* ---------- data ---------- */
  async function getJSON(url, opts) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 15000);
    try { const r = await fetch(url, Object.assign({ signal: ctrl.signal }, opts || {})); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    finally { clearTimeout(t); }
  }

  async function loadCountries() {
    if (countries.length) return countries;
    try { const c = JSON.parse(localStorage.getItem(COUNTRIES_KEY)); if (c && c.length) { countries = c; return countries; } } catch (e) {}
    try {
      const j = await getJSON(`${CN}/countries/iso`);
      countries = (j.data || []).map(c => ({ name: c.name, iso2: (c.Iso2 || '').toLowerCase() }))
        .filter(c => c.name).sort((a, b) => a.name.localeCompare(b.name));
      try { localStorage.setItem(COUNTRIES_KEY, JSON.stringify(countries)); } catch (e) {}
    } catch (e) { countries = FALLBACK_COUNTRIES.slice(); }
    return countries;
  }

  async function loadCities(country, iso2) {
    if (cityCache[iso2]) return cityCache[iso2];
    try { const c = JSON.parse(localStorage.getItem(cityKey(iso2))); if (c && c.length) { cityCache[iso2] = c; return c; } } catch (e) {}
    const j = await getJSON(`${CN}/countries/cities/q?country=${encodeURIComponent(country)}`);
    const list = (j.data || []).filter(Boolean).sort((a, b) => a.localeCompare(b));
    cityCache[iso2] = list;
    try { localStorage.setItem(cityKey(iso2), JSON.stringify(list)); } catch (e) {}
    return list;
  }

  /* ---------- geocoding (Nominatim, structured) ---------- */
  async function geocode(city, country, iso2) {
    try {
      const params = new URLSearchParams({ format: 'json', limit: '1', city: city, country: country });
      if (iso2) params.set('countrycodes', iso2);
      const j = await getJSON(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { 'Accept': 'application/json' } });
      if (!j.length) return null;
      return { lat: +(+j[0].lat).toFixed(4), lng: +(+j[0].lon).toFixed(4) };
    } catch (e) { return null; }
  }
  async function reverseGeocode(lat, lng) {
    try {
      const j = await getJSON(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`, { headers: { 'Accept': 'application/json' } });
      const a = j.address || {};
      const city = a.city || a.town || a.village || a.county || '';
      return { city: city, country: a.country || '', iso2: (a.country_code || '').toLowerCase(), label: [city, a.country].filter(Boolean).join(', ') || `(${lat}, ${lng})` };
    } catch (e) { return { city: '', country: '', iso2: '', label: `(${lat}, ${lng})` }; }
  }

  /* ---------- combobox (type-to-filter dropdown over a string list) ---------- */
  function combo(inputId, listId, getItems, onPick) {
    const input = $(inputId), list = $(listId);
    let open = false, active = -1;

    function render(filter) {
      const items = getItems();
      const f = (filter || '').toLowerCase().trim();
      let matches = items;
      if (f) {
        const starts = [], has = [];
        for (const it of items) { const l = it.toLowerCase(); if (l.indexOf(f) === 0) starts.push(it); else if (l.indexOf(f) >= 0) has.push(it); }
        matches = starts.concat(has);
      }
      const shown = matches.slice(0, 80); // keep the DOM light for huge city lists
      active = -1;
      list.innerHTML = shown.length
        ? shown.map(m => `<li role="option" data-v="${esc(m)}">${esc(m)}</li>`).join('') +
          (matches.length > shown.length ? `<li class="combo__more">${PH.t('loc.more')}</li>` : '')
        : `<li class="combo__empty">${PH.t('loc.noMatch')}</li>`;
      list.classList.remove('hidden'); input.setAttribute('aria-expanded', 'true'); open = true;
    }
    function close() { list.classList.add('hidden'); input.setAttribute('aria-expanded', 'false'); open = false; active = -1; }
    function pick(v) { input.value = v; close(); onPick(v); }

    input.addEventListener('focus', () => render(input.value));
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', e => {
      const opts = Array.from(list.querySelectorAll('li[data-v]'));
      if (e.key === 'Enter') {
        e.preventDefault();
        const v = (active >= 0 && opts[active]) ? opts[active].dataset.v : input.value.trim();
        if (v) pick(v); // allow free-text too (fallback when the city API is down)
        return;
      }
      if (!open || !opts.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, opts.length - 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); }
      else if (e.key === 'Escape') { close(); return; }
      else return;
      opts.forEach((o, i) => o.classList.toggle('is-active', i === active));
      if (opts[active]) opts[active].scrollIntoView({ block: 'nearest' });
    });
    list.addEventListener('mousedown', e => { const li = e.target.closest('li[data-v]'); if (li) { e.preventDefault(); pick(li.dataset.v); } });
    document.addEventListener('click', e => { if (open && !input.parentNode.contains(e.target)) close(); });

    return { setValue: v => { input.value = v || ''; }, enable: on => { input.disabled = !on; }, close: close };
  }

  /* ---------- selection flow ---------- */
  async function chooseCountry(name) {
    const c = countries.find(x => x.name === name);
    sel.country = name; sel.iso2 = c ? c.iso2 : ''; sel.city = '';
    cityCombo.setValue(''); cityCombo.enable(true);
    $('locCityInput').setAttribute('placeholder', PH.t('loc.loadingCities'));
    status('');
    try {
      await loadCities(name, sel.iso2);
      $('locCityInput').setAttribute('placeholder', PH.t('loc.cityPhReady'));
      $('locCityInput').focus();
    } catch (e) {
      // API down → let the user type a city by hand; geocoding still works.
      $('locCityInput').setAttribute('placeholder', PH.t('loc.cityPhReady'));
      status(PH.t('loc.citiesFail'), 'warn');
      $('locCityInput').focus();
    }
  }

  async function chooseCity(name) {
    sel.city = name;
    status(PH.t('loc.resolving'));
    const geo = await geocode(name, sel.country, sel.iso2);
    const label = [name, sel.country].filter(Boolean).join(', ');
    fire({ lat: geo ? geo.lat : null, lng: geo ? geo.lng : null, city: name, country: sel.country, iso2: sel.iso2, label: label });
    status('');
    close();
  }

  function fire(loc) { if (onSelect) onSelect(loc); }

  /* ---------- GPS ---------- */
  function detect() {
    if (!navigator.geolocation) { PH.ui.toast(PH.t('loc.gpsUnsupported')); return; }
    PH.ui.toast(PH.t('loc.detecting'));
    navigator.geolocation.getCurrentPosition(async pos => {
      const lat = +pos.coords.latitude.toFixed(4), lng = +pos.coords.longitude.toFixed(4);
      const rg = await reverseGeocode(lat, lng);
      if (rg.country) { sel.country = rg.country; sel.iso2 = rg.iso2; countryCombo.setValue(rg.country); cityCombo.enable(true); }
      if (rg.city) cityCombo.setValue(rg.city);
      fire({ lat: lat, lng: lng, city: rg.city, country: rg.country, iso2: rg.iso2, label: rg.label });
      close();
    }, () => PH.ui.toast(PH.t('loc.gpsDenied')), { timeout: 8000, enableHighAccuracy: false });
  }

  /* ---------- modal ---------- */
  function status(msg, kind) { const el = $('locStatus'); if (el) { el.textContent = msg || ''; el.dataset.kind = kind || ''; } }
  function open() {
    $('locModal').classList.remove('hidden');
    status('');
    loadCountries().catch(() => {});
    const cur = getCurrent ? getCurrent() : {};
    if (cur.country) { sel.country = cur.country; const c = countries.find(x => x.name === cur.country); sel.iso2 = c ? c.iso2 : ''; countryCombo.setValue(cur.country); cityCombo.enable(true); if (sel.iso2) loadCities(cur.country, sel.iso2).catch(() => {}); }
    if (cur.city) { sel.city = cur.city; cityCombo.setValue(cur.city); }
    setTimeout(() => $('locCountryInput').focus(), 50);
  }
  function close() { $('locModal').classList.add('hidden'); countryCombo.close(); cityCombo.close(); }

  /* ---------- public ---------- */
  function init(opts) {
    onSelect = opts.onSelect; getCurrent = opts.getCurrent;
    if (bound) return; bound = true;
    countryCombo = combo('locCountryInput', 'locCountryList', () => countries.map(c => c.name), chooseCountry);
    cityCombo = combo('locCityInput', 'locCityList', () => (cityCache[sel.iso2] || []), chooseCity);
    cityCombo.enable(false);
    $('locClose').addEventListener('click', close);
    $('locModal').addEventListener('click', e => { if (e.target.id === 'locModal') close(); });
    $('locGeo').addEventListener('click', detect);
    loadCountries().catch(() => {}); // warm the cache so the picker is instant
  }

  // Sync the topbar button label with the current location.
  function refresh() {
    const cur = getCurrent ? getCurrent() : {};
    const el = $('locBtnLabel'); if (el) el.textContent = cur.locationLabel || '—';
  }

  return { init, open, close, detect, refresh };
})();
