/* ============================================================
   PrayerHub — i18n (English + Albanian / Shqip)
   Static text uses data-i18n / data-i18n-ph / data-i18n-title.
   Dynamic (JS-rendered) text uses PH.t('key').
   ============================================================ */
PH.i18n = (function () {
  const dict = {
    en: {
      'brand.subtitle': 'Worship Dashboard',
      'nav.dashboard': 'Dashboard', 'nav.tracking': 'Prayer Tracking', 'nav.analytics': 'Analytics',
      'nav.calendar': 'Monthly Calendar', 'nav.qibla': 'Qibla', 'nav.ramadan': 'Ramadan',
      'nav.mosques': 'Mosque Finder', 'nav.adhkar': "Adhkar & Du'as", 'nav.family': 'Family', 'nav.quran': 'Quran',
      'side.streak': 'day streak', 'side.note': 'Prototype · core slice of the PrayerHub blueprint',
      'top.searchCity': 'Search city…', 'top.country': 'Country', 'top.search': 'Search', 'top.auto': 'Auto',
      'auth.signIn': 'Sign in', 'auth.signOut': 'Sign out',
      'status.locating': 'Locating…', 'status.live': 'Live · AlAdhan', 'status.offline': 'Offline estimate',
      'hero.next': 'Next prayer', 'common.tomorrow': '(tomorrow)', 'common.days': 'days',
      'ram.day': 'Day', 'fam.ofGoal': "of this week's family goal", 'mosq.within': 'mosque(s) within 6 km', 'adh.progress': 'completed today',
      'dash.today': "Today's Prayers", 'dash.sunNight': 'Sun & Night',
      't.sunrise': 'Sunrise', 't.sunset': 'Sunset', 't.imsak': 'Imsak', 't.midnight': 'Midnight', 't.lastthird': 'Last third',
      'card.passed': 'passed', 'card.upcoming': 'upcoming', 'card.today': 'today', 'card.mark': 'mark prayed',
      'st.ontime': 'On time', 'st.jamaah': "Jama'ah", 'st.late': 'Late', 'st.qada': 'Qada', 'st.missed': 'Missed', 'st.none': 'not logged',
      'track.title': 'Prayer Tracking',
      'track.instr': "Tap a prayer to log it. On time → Late / Jama'ah → Qada → Missed → clear.",
      'track.logged': 'Logged today', 'track.score': 'Day score', 'track.streak': 'Current streak',
      'track.today': 'Today', 'track.yesterday': 'Yesterday', 'track.future': "Can't log future prayers.",
      'an.title': 'Worship Analytics', 'an.local': 'Local data on this device',
      'an.consistency': 'Consistency score', 'an.last30': 'last 30 days', 'an.streak': 'Current streak', 'an.inRow': 'days in a row',
      'an.best': 'Best streak', 'an.allTime': 'all time', 'an.total': 'Prayers logged',
      'an.last14': 'Last 14 days', 'an.last14Sub': 'prayers completed (of 5)', 'an.byPrayer': 'By prayer',
      'an.byPrayerSub': 'completion rate · 30 days', 'an.breakdown': 'Status breakdown', 'an.gen': 'Generate sample data', 'an.reset': 'Reset my data',
      'bd.none': 'Not logged',
      'cal.title': 'Monthly Prayer Calendar', 'cal.export': 'Export CSV',
      'cal.note': 'PDF/Excel export & annual export are in the Premium blueprint.', 'cal.date': 'Date', 'cal.loading': 'Loading month…',
      'qibla.title': 'Qibla Direction', 'qibla.bearing': 'Qibla bearing', 'qibla.dir': 'Compass direction',
      'qibla.dist': 'Distance to Kaaba', 'qibla.enable': 'Enable live compass',
      'qibla.hintStatic': 'North-up view. On mobile, tap “Enable live compass” and turn your device.',
      'qibla.hintLive': 'Live compass on — turn until the Kaaba aligns with the top marker ▲.',
      'qibla.hintNoLoc': 'Enable “Auto” location or search a city to compute the Qibla.',
      'qibla.atKaaba': 'At the Kaaba', 'qibla.atKaabaHint': "You're at the Sacred Mosque — face the Kaaba directly.",
      'qibla.tip': 'Tip: move your phone in a figure-8 to calibrate the magnetometer.',
      'ram.hijri': 'Hijri year', 'ram.beginsIn': 'Begins in', 'ram.remaining': 'Days remaining',
      'ram.iftarIn': 'Iftar in', 'ram.iftarTomorrow': 'Iftar tomorrow in', 'ram.imsak': 'Imsak', 'ram.suhoor': 'Suhoor ends', 'ram.iftar': 'Iftar',
      'ram.eid': 'Eid al-Fitr in', 'ram.trackers': 'Season Trackers', 'ram.fasts': 'Fasts kept', 'ram.taraweeh': 'Taraweeh nights',
      'ram.quran': 'Quran completion', 'ram.charity': 'Charity', 'ram.goal': 'Goal', 'ram.addFast': '+ Fast', 'ram.addNight': '+ Night',
      'mosq.title': 'Mosque Finder', 'mosq.nearby': 'Nearby', 'mosq.nearbySub': 'live data · OpenStreetMap', 'mosq.favs': 'Favorites',
      'mosq.directions': 'Directions ↗', 'mosq.searching': 'Searching OpenStreetMap for nearby mosques…',
      'mosq.none': 'No mosques found within 6 km. Try the city search for a denser area.',
      'mosq.noFavs': 'No favorite mosques yet — tap the heart on any result.',
      'mosq.error': "Couldn't reach the OpenStreetMap data service (it can be busy).", 'mosq.retry': 'Try again',
      'mosq.noLoc': 'Enable “Auto” location or search a city to find nearby mosques.',
      'adh.title': "Adhkar & Du'as", 'adh.morning': 'Morning', 'adh.evening': 'Evening', 'adh.sleep': 'Sleep',
      'adh.travel': 'Travel', 'adh.after': 'After Prayer', 'adh.tap': 'tap to count', 'adh.done': 'done — tap to repeat',
      'fam.title': 'Family', 'fam.invite': 'Invite member', 'fam.goal': 'Weekly family goal',
      'fam.streakLabel': 'family streak — days every member prayed', 'fam.members': 'Members', 'fam.inFamily': 'in your family',
      'fam.leaderboard': 'Leaderboard', 'fam.leaderboardSub': 'this week · prayers completed (of 35)',
      'role.leader': 'Leader', 'role.member': 'Member', 'role.child': 'Child', 'fam.you': 'you',
      'quran.title': 'Quran', 'quran.read': 'Read', 'quran.todayLbl': 'Today', 'quran.bookmarks': 'Bookmarks', 'quran.loading': 'Loading surah…',
      'quran.error': "Couldn't load this surah (network).",
      'auth.modalTitle': 'Sync your worship data',
      'auth.modalSub': 'Your prayer logs, streaks and favorites will sync across your devices.',
      'auth.password': 'Password (min 6 chars)', 'auth.create': 'Create account',
    },
    sq: {
      'brand.subtitle': 'Paneli i Ibadetit',
      'nav.dashboard': 'Paneli', 'nav.tracking': 'Gjurmimi i Namazit', 'nav.analytics': 'Analitika',
      'nav.calendar': 'Kalendari Mujor', 'nav.qibla': 'Kibla', 'nav.ramadan': 'Ramazani',
      'nav.mosques': 'Gjej Xhaminë', 'nav.adhkar': 'Dhikret & Lutjet', 'nav.family': 'Familja', 'nav.quran': 'Kurani',
      'side.streak': 'ditë rresht', 'side.note': 'Prototip · pjesë qendrore e planit PrayerHub',
      'top.searchCity': 'Kërko qytetin…', 'top.country': 'Shteti', 'top.search': 'Kërko', 'top.auto': 'Auto',
      'auth.signIn': 'Kyçu', 'auth.signOut': 'Çkyçu',
      'status.locating': 'Duke gjetur vendndodhjen…', 'status.live': 'Drejtpërdrejt · AlAdhan', 'status.offline': 'Vlerësim jashtë linje',
      'hero.next': 'Namazi i radhës', 'common.tomorrow': '(nesër)', 'common.days': 'ditë',
      'ram.day': 'Dita', 'fam.ofGoal': 'e synimit javor të familjes', 'mosq.within': 'xhami brenda 6 km', 'adh.progress': 'përfunduar sot',
      'dash.today': 'Namazet e Sotme', 'dash.sunNight': 'Dielli & Nata',
      't.sunrise': 'Lindja', 't.sunset': 'Perëndimi', 't.imsak': 'Imsaku', 't.midnight': 'Mesnata', 't.lastthird': 'Tretja e fundit',
      'card.passed': 'kaloi', 'card.upcoming': 'vjen', 'card.today': 'sot', 'card.mark': 'shëno si falur',
      'st.ontime': 'Në kohë', 'st.jamaah': 'Me xhemat', 'st.late': 'Vonë', 'st.qada': 'Kaza', 'st.missed': 'Humbur', 'st.none': 'pa regjistruar',
      'track.title': 'Gjurmimi i Namazit',
      'track.instr': 'Prek një namaz për ta regjistruar. Në kohë → Vonë / Me xhemat → Kaza → Humbur → pastro.',
      'track.logged': 'Regjistruar sot', 'track.score': 'Rezultati ditor', 'track.streak': 'Seria aktuale',
      'track.today': 'Sot', 'track.yesterday': 'Dje', 'track.future': 'Nuk mund të regjistrosh namaze të ardhshme.',
      'an.title': 'Analitika e Ibadetit', 'an.local': 'Të dhëna lokale në këtë pajisje',
      'an.consistency': 'Qëndrueshmëria', 'an.last30': '30 ditët e fundit', 'an.streak': 'Seria aktuale', 'an.inRow': 'ditë rresht',
      'an.best': 'Seria më e mirë', 'an.allTime': 'gjithë kohën', 'an.total': 'Namaze të regjistruara',
      'an.last14': '14 ditët e fundit', 'an.last14Sub': 'namaze të kryera (nga 5)', 'an.byPrayer': 'Sipas namazit',
      'an.byPrayerSub': 'shkalla e kryerjes · 30 ditë', 'an.breakdown': 'Ndarja sipas statusit', 'an.gen': 'Gjenero të dhëna shembull', 'an.reset': 'Rivendos të dhënat',
      'bd.none': 'Pa regjistruar',
      'cal.title': 'Kalendari Mujor i Namazit', 'cal.export': 'Eksporto CSV',
      'cal.note': 'Eksporti PDF/Excel dhe ai vjetor janë në planin Premium.', 'cal.date': 'Data', 'cal.loading': 'Duke ngarkuar muajin…',
      'qibla.title': 'Drejtimi i Kiblës', 'qibla.bearing': 'Këndi i Kiblës', 'qibla.dir': 'Drejtimi i busullës',
      'qibla.dist': 'Largësia deri te Qabja', 'qibla.enable': 'Aktivizo busullën',
      'qibla.hintStatic': 'Pamje me veri lart. Në celular, prek “Aktivizo busullën” dhe rrotullo pajisjen.',
      'qibla.hintLive': 'Busulla aktive — rrotullohu derisa Qabja të përputhet me shenjën lart ▲.',
      'qibla.hintNoLoc': 'Aktivizo vendndodhjen “Auto” ose kërko një qytet për të llogaritur Kiblën.',
      'qibla.atKaaba': 'Te Qabja', 'qibla.atKaabaHint': 'Je te Xhamia e Shenjtë — drejtohu nga Qabja.',
      'qibla.tip': 'Këshillë: lëviz telefonin në formë tetëshe për të kalibruar busullën.',
      'ram.hijri': 'Viti hixhri', 'ram.beginsIn': 'Fillon për', 'ram.remaining': 'Ditë të mbetura',
      'ram.iftarIn': 'Iftari për', 'ram.iftarTomorrow': 'Iftari nesër për', 'ram.imsak': 'Imsaku', 'ram.suhoor': 'Syfyri mbaron', 'ram.iftar': 'Iftari',
      'ram.eid': 'Fitër Bajrami për', 'ram.trackers': 'Gjurmuesit e Sezonit', 'ram.fasts': 'Agjërime', 'ram.taraweeh': 'Net teravie',
      'ram.quran': 'Përfundimi i Kuranit', 'ram.charity': 'Sadaka', 'ram.goal': 'Synimi', 'ram.addFast': '+ Agjërim', 'ram.addNight': '+ Natë',
      'mosq.title': 'Gjej Xhaminë', 'mosq.nearby': 'Afër teje', 'mosq.nearbySub': 'të dhëna live · OpenStreetMap', 'mosq.favs': 'Të preferuarat',
      'mosq.directions': 'Drejtimet ↗', 'mosq.searching': 'Duke kërkuar xhami afër në OpenStreetMap…',
      'mosq.none': 'Nuk u gjetën xhami brenda 6 km. Provo kërkimin e qytetit për një zonë më të dendur.',
      'mosq.noFavs': 'Ende pa xhami të preferuara — prek zemrën te çdo rezultat.',
      'mosq.error': 'Nuk u arrit shërbimi i të dhënave OpenStreetMap (mund të jetë i zënë).', 'mosq.retry': 'Provo sërish',
      'mosq.noLoc': 'Aktivizo vendndodhjen “Auto” ose kërko një qytet për të gjetur xhamitë afër.',
      'adh.title': 'Dhikret & Lutjet', 'adh.morning': 'Mëngjesi', 'adh.evening': 'Mbrëmja', 'adh.sleep': 'Gjumi',
      'adh.travel': 'Udhëtimi', 'adh.after': 'Pas Namazit', 'adh.tap': 'prek për të numëruar', 'adh.done': 'u krye — prek për të përsëritur',
      'fam.title': 'Familja', 'fam.invite': 'Fto anëtar', 'fam.goal': 'Synimi javor i familjes',
      'fam.streakLabel': 'seria familjare — ditët kur çdo anëtar u fal', 'fam.members': 'Anëtarë', 'fam.inFamily': 'në familjen tënde',
      'fam.leaderboard': 'Renditja', 'fam.leaderboardSub': 'këtë javë · namaze të kryera (nga 35)',
      'role.leader': 'Udhëheqës', 'role.member': 'Anëtar', 'role.child': 'Fëmijë', 'fam.you': 'ti',
      'quran.title': 'Kurani', 'quran.read': 'Lexuar', 'quran.todayLbl': 'Sot', 'quran.bookmarks': 'Faqeshënues', 'quran.loading': 'Duke ngarkuar suren…',
      'quran.error': 'Nuk u ngarkua kjo sure (rrjeti).',
      'auth.modalTitle': 'Sinkronizo të dhënat e ibadetit',
      'auth.modalSub': 'Regjistrimet e namazit, seritë dhe të preferuarat sinkronizohen mes pajisjeve.',
      'auth.password': 'Fjalëkalimi (min 6 shkronja)', 'auth.create': 'Krijo llogari',
    },
  };

  let lang = 'en';

  function t(key) { return (dict[lang] && dict[lang][key]) || dict.en[key] || key; }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.setAttribute('placeholder', t(el.dataset.i18nPh)); });
    document.querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.dataset.i18nTitle); });
    document.documentElement.setAttribute('lang', lang);
  }

  function setLang(l) { lang = dict[l] ? l : 'en'; apply(); }

  return { t, apply, setLang, get lang() { return lang; }, available: ['en', 'sq'] };
})();
PH.t = k => PH.i18n.t(k);
