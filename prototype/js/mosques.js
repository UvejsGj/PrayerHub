/* ============================================================
   PrayerHub — Mosque finder
   Leaflet (OpenStreetMap) interactive map + live nearby-mosque
   search via the Overpass API. Favorites persist locally.
   ============================================================ */
PH.mosques = (function () {
  const $ = id => document.getElementById(id);
  const FAV_KEY = 'prayerhub.favmosques.v1';
  let map, markers = [], userMarker, lastResults = [];

  const toRad = d => d * Math.PI / 180;
  function distance(aLat, aLng, bLat, bLng) {
    const R = 6371, dφ = toRad(bLat - aLat), dλ = toRad(bLng - aLng);
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function loadFavs() { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch (e) { return []; } }
  function saveFavs(f) { localStorage.setItem(FAV_KEY, JSON.stringify(f)); }
  function isFav(id) { return loadFavs().some(m => m.id === id); }
  function toggleFav(m) {
    let f = loadFavs();
    f = isFav(m.id) ? f.filter(x => x.id !== m.id) : [...f, m];
    saveFavs(f);
    return isFav(m.id);
  }

  async function fetchNearby(lat, lng, radius = 6000) {
    const q = `[out:json][timeout:20];(` +
      `node["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});` +
      `way["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});` +
      `relation["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${lat},${lng});` +
      `);out center 60;`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 18000);
    try {
      const r = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST', body: 'data=' + encodeURIComponent(q), signal: ctrl.signal,
      });
      if (!r.ok) throw new Error('Overpass ' + r.status);
      const j = await r.json();
      return (j.elements || []).map(e => {
        const la = e.lat != null ? e.lat : e.center && e.center.lat;
        const lo = e.lon != null ? e.lon : e.center && e.center.lon;
        if (la == null) return null;
        const tags = e.tags || {};
        return {
          id: e.type[0] + e.id, name: tags.name || tags['name:en'] || 'Mosque (unnamed)',
          lat: la, lng: lo,
          addr: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', '),
          denom: tags.denomination || '',
        };
      }).filter(Boolean);
    } finally { clearTimeout(t); }
  }

  function initMap(p) {
    if (typeof L === 'undefined') return;
    if (!map) {
      map = L.map('mosqueMap', { attributionControl: true });
      PH.mapTiles(L).addTo(map);
    }
    map.setView([p.lat, p.lng], 14);
    if (userMarker) userMarker.setLatLng([p.lat, p.lng]);
    else userMarker = L.marker([p.lat, p.lng], {
      icon: L.divIcon({ html: '<span class="material-symbols-outlined" style="color:#0ea5e9;font-size:32px">person_pin_circle</span>', className: 'ph-marker', iconSize: [32, 32] }),
    }).addTo(map).bindPopup('You are here');
    setTimeout(() => map && map.invalidateSize(), 150);
  }

  function clearMarkers() { markers.forEach(m => map.removeLayer(m)); markers = []; }

  function addMarkers(list, userLat, userLng) {
    if (!map) return;
    clearMarkers();
    const icon = L.divIcon({ html: '<span class="material-symbols-outlined" style="color:#10b981;font-size:30px">mosque</span>', className: 'ph-marker', iconSize: [30, 30] });
    list.forEach(m => {
      const mk = L.marker([m.lat, m.lng], { icon }).addTo(map)
        .bindPopup(`<b>${esc(m.name)}</b><br>${(distance(userLat, userLng, m.lat, m.lng)).toFixed(1)} km`);
      mk.on('click', () => focusRow(m.id));
      markers.push(mk);
    });
  }

  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function rowHtml(m) {
    const fav = isFav(m.id);
    return `<div class="mosque-row glass-soft" data-id="${m.id}">
      <div class="mosque-row__main">
        <strong>${esc(m.name)}</strong>
        <span class="muted">${m.dist.toFixed(1)} km${m.denom ? ' · ' + esc(m.denom) : ''}${m.addr ? ' · ' + esc(m.addr) : ''}</span>
      </div>
      <div class="mosque-row__actions">
        <button class="icon-btn mosque-fav ${fav ? 'is-fav' : ''}" title="Favorite" data-id="${m.id}"><span class="material-symbols-outlined">${fav ? 'favorite' : 'favorite_border'}</span></button>
        <a class="btn btn--ghost" target="_blank" rel="noopener"
           href="https://www.openstreetmap.org/directions?to=${m.lat}%2C${m.lng}">${PH.t('mosq.directions')}</a>
      </div>
    </div>`;
  }

  function focusRow(id) {
    const row = document.querySelector(`.mosque-row[data-id="${id}"]`);
    if (row) { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1200); }
  }

  function renderList(list) {
    const el = $('mosqueList');
    if (!list.length) { el.innerHTML = `<p class="muted">${PH.t('mosq.none')}</p>`; return; }
    el.innerHTML = `<p class="muted">${list.length} ${PH.t('mosq.within')}</p>` + list.map(rowHtml).join('');
    el.querySelectorAll('.mosque-fav').forEach(b => b.addEventListener('click', () => {
      const m = lastResults.find(x => x.id === b.dataset.id);
      const nowFav = toggleFav(m);
      b.classList.toggle('is-fav', nowFav); b.innerHTML = `<span class="material-symbols-outlined">${nowFav ? 'favorite' : 'favorite_border'}</span>`;
      renderFavs();
      PH.ui.toast(nowFav ? 'Added to favorites.' : 'Removed from favorites.');
    }));
  }

  function renderFavs() {
    const favs = loadFavs();
    const el = $('mosqueFavs');
    if (!favs.length) { el.innerHTML = `<p class="muted">${PH.t('mosq.noFavs')}</p>`; return; }
    el.innerHTML = favs.map(m => `<div class="mosque-row glass-soft">
      <div class="mosque-row__main"><strong>★ ${esc(m.name)}</strong></div>
      <div class="mosque-row__actions">
        <a class="btn btn--ghost" target="_blank" rel="noopener" href="https://www.openstreetmap.org/directions?to=${m.lat}%2C${m.lng}">${PH.t('mosq.directions')}</a>
      </div></div>`).join('');
  }

  async function render() {
    const p = PH.state.prefs;
    $('mosqueLoc').textContent = p.locationLabel || '';
    renderFavs();
    if (p.lat == null) {
      $('mosqueList').innerHTML = `<p class="muted">${PH.t('mosq.noLoc')}</p>`;
      return;
    }
    initMap(p);
    $('mosqueList').innerHTML = `<p class="muted">${PH.t('mosq.searching')}</p>`;
    try {
      const raw = await fetchNearby(p.lat, p.lng);
      lastResults = raw.map(m => ({ ...m, dist: distance(p.lat, p.lng, m.lat, m.lng) }))
        .sort((a, b) => a.dist - b.dist);
      renderList(lastResults);
      addMarkers(lastResults, p.lat, p.lng);
    } catch (e) {
      $('mosqueList').innerHTML =
        `<p class="muted">${PH.t('mosq.error')}</p>
         <button class="btn" id="mosqueRetry">↻ ${PH.t('mosq.retry')}</button>`;
      const rb = $('mosqueRetry'); if (rb) rb.addEventListener('click', render);
    }
  }

  return { render };
})();
