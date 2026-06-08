# 🕌 PrayerHub

A modern, glassmorphism **Islamic prayer & worship dashboard** that runs in the browser with
**live prayer-time data** — no build step and no backend required.

## Features

- **Prayer times** — Fajr, Dhuhr, Asr, Maghrib, Isha + Sunrise, Sunset, Imsak, Midnight, Last third
- **Location** — automatic detection (geolocation + reverse-geocode) or manual city/country search
- **Calculation methods** — Muslim World League, Umm Al-Qura, ISNA, Egyptian, Karachi, Custom
- **Live clock**, **Gregorian + Hijri date**, and a **timezone-aware countdown** to the next prayer
- **Prayer tracking** — tap to log each prayer (On time / Jama'ah / Late / Qada / Missed)
- **Analytics** — daily streaks, consistency score, weekly/monthly stats, by-prayer rates, charts
- **Monthly calendar** with Hijri dates + CSV export
- **Qibla compass** — bearing & distance to the Kaaba, magnetometer support, map direction line
- **Ramadan** — countdown to Ramadan & Eid, fasting timetable, live Iftar countdown, season trackers
- **Mosque finder** — interactive OpenStreetMap map + live nearby-mosque search, favorites
- **Adhkar & Du'as** — morning/evening/sleep/travel/after-prayer with tap-to-count and progress
- **Light + dark mode**, fully **responsive / mobile-first**, accessible, with an **offline
  solar-calculation fallback** if the prayer-time API is unreachable

All your data (prayer logs, trackers, favorites) is stored **locally in your browser** — nothing is
uploaded. Use **“Generate sample data”** on the Analytics screen to populate demo history.

## Run it

No dependencies — it's static HTML/CSS/JS.

```bash
node dev-server.mjs
# → open http://localhost:4173
```

Or serve the folder with any static server, e.g. `npx serve prototype`.

## Project layout

```
PrayerHub/
├─ prototype/
│  ├─ index.html
│  ├─ css/styles.css
│  └─ js/{config,prayer-times,tracking,ui,qibla,ramadan,mosques,adhkar,app}.js
└─ dev-server.mjs        # zero-dependency static server
```

## Built with

Vanilla **HTML / CSS / JavaScript** · [Chart.js](https://www.chartjs.org/) (analytics) ·
[Leaflet](https://leafletjs.com/) (maps).

## Credits

- Prayer times by the [AlAdhan API](https://aladhan.com)
- Maps & mosque data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (Overpass API)

## License

MIT
