/* ============================================================
   PrayerHub — Qibla module
   Great-circle bearing + distance to the Kaaba, a CSS compass
   that rotates with the device magnetometer (when available),
   and a Leaflet map view of the direction line.
   ============================================================ */
PH.qibla = (function () {
  const $ = id => document.getElementById(id);
  const KAABA = { lat: 21.4225021, lng: 39.8261818 };
  const DIRS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  let map, line, kaabaMarker, userMarker, listening = false, lastBearing = 0;

  const toRad = d => d * Math.PI / 180, toDeg = r => r * 180 / Math.PI;

  function bearingTo(lat, lng) {
    const φ1 = toRad(lat), φ2 = toRad(KAABA.lat), Δλ = toRad(KAABA.lng - lng);
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }
  function distanceTo(lat, lng) {
    const R = 6371, dφ = toRad(KAABA.lat - lat), dλ = toRad(KAABA.lng - lng);
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(KAABA.lat)) * Math.sin(dλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  const dirLabel = b => DIRS[Math.round(b / 22.5) % 16];

  function render() {
    const p = PH.state.prefs;
    $('qiblaLoc').textContent = p.locationLabel || '';
    if (p.lat == null) {
      $('qiblaBearing').textContent = '—';
      $('qiblaHint').textContent = PH.t('qibla.hintNoLoc');
      return;
    }
    const b = bearingTo(p.lat, p.lng), d = distanceTo(p.lat, p.lng);
    lastBearing = b;
    if (d < 3) { // standing at the Sacred Mosque — bearing is undefined
      $('qiblaBearing').innerHTML = '<span class="material-symbols-outlined" style="font-size:1.6rem">mosque</span>';
      $('qiblaDir').textContent = PH.t('qibla.atKaaba');
      $('qiblaDist').textContent = Math.round(d * 1000) + ' m';
      $('qiblaHint').textContent = PH.t('qibla.atKaabaHint');
      $('qiblaNeedle').style.transform = 'translateX(-50%) rotate(0deg)';
      initMap(p);
      return;
    }
    $('qiblaBearing').textContent = b.toFixed(1) + '°';
    $('qiblaDir').textContent = dirLabel(b);
    $('qiblaDist').textContent = Math.round(d).toLocaleString() + ' km';
    $('qiblaNeedle').style.transform = `translateX(-50%) rotate(${b}deg)`;
    $('qiblaHint').textContent = listening ? PH.t('qibla.hintLive') : PH.t('qibla.hintStatic');
    initMap(p);
  }

  function initMap(p) {
    if (typeof L === 'undefined') return;
    const el = $('qiblaMap');
    if (!map) {
      map = L.map(el, { zoomControl: false, attributionControl: true });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap', maxZoom: 18,
      }).addTo(map);
      const kaabaIcon = L.divIcon({ html: '<span class="material-symbols-outlined" style="color:#10b981;font-size:30px">mosque</span>', className: 'ph-marker', iconSize: [30, 30] });
      const userIcon = L.divIcon({ html: '<span class="material-symbols-outlined" style="color:#0ea5e9;font-size:30px">person_pin_circle</span>', className: 'ph-marker', iconSize: [30, 30] });
      userMarker = L.marker([p.lat, p.lng], { icon: userIcon }).addTo(map).bindPopup('You');
      kaabaMarker = L.marker([KAABA.lat, KAABA.lng], { icon: kaabaIcon }).addTo(map).bindPopup('Kaaba');
      line = L.polyline([[p.lat, p.lng], [KAABA.lat, KAABA.lng]], { color: '#10b981', weight: 2, dashArray: '6 6' }).addTo(map);
    } else {
      userMarker.setLatLng([p.lat, p.lng]);
      line.setLatLngs([[p.lat, p.lng], [KAABA.lat, KAABA.lng]]);
    }
    map.fitBounds(L.latLngBounds([[p.lat, p.lng], [KAABA.lat, KAABA.lng]]), { padding: [30, 30] });
    setTimeout(() => map && map.invalidateSize(), 150);
  }

  function onOrient(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;      // iOS
    else if (typeof e.alpha === 'number') h = 360 - e.alpha;                          // others (absolute)
    if (h == null) return;
    listening = true;
    $('qiblaRose').style.transform = `rotate(${-h}deg)`;
    // alignment feedback: how far the device heading is from the Qibla bearing
    const diff = Math.abs(((lastBearing - h + 540) % 360) - 180);
    $('qiblaCompass').classList.toggle('is-aligned', diff < 5);
  }

  function startListening() {
    if (listening) return;
    window.addEventListener('deviceorientationabsolute', onOrient, true);
    window.addEventListener('deviceorientation', onOrient, true);
  }

  function enable() {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
      DeviceOrientationEvent.requestPermission()
        .then(s => { if (s === 'granted') { startListening(); PH.ui.toast('Compass enabled — turn your device.'); } else PH.ui.toast('Compass permission denied.'); })
        .catch(() => PH.ui.toast('Compass not available on this device.'));
    } else {
      startListening();
      PH.ui.toast('Compass listening (needs a device with a magnetometer).');
    }
  }

  return { render, enable };
})();
