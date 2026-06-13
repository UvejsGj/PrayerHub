// Minimal zero-dependency static server for the PrayerHub prototype.
// Usage: node dev-server.mjs   (serves ./prototype on PORT or 4173)
//
// Security posture: read-only (GET/HEAD), strictly confined to ./prototype,
// generic error bodies, and the same security headers the production host
// should send (see prototype/_headers). HSTS is omitted here because this
// dev server is plain HTTP on localhost.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), 'prototype');
const PORT = process.env.PORT || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const CSP = [
  "default-src 'self'", "base-uri 'self'", "object-src 'none'",
  "script-src 'self' https://cdn.jsdelivr.net https://unpkg.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://*.tile.openstreetmap.org https://api.mapbox.com https://unpkg.com",
  "media-src 'self' https://verses.quran.com",
  "connect-src 'self' https://api.aladhan.com https://api.quran.com https://api.alquran.cloud https://nominatim.openstreetmap.org https://overpass-api.de https://*.supabase.co wss://*.supabase.co",
  "form-action 'self'", "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS = {
  'Content-Security-Policy': CSP,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(self), accelerometer=(self), gyroscope=(self), magnetometer=(self), camera=(), microphone=(), payment=(), usb=()',
  'Cross-Origin-Opener-Policy': 'same-origin',
};

createServer(async (req, res) => {
  // Read-only methods only.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain', ...SECURITY_HEADERS }).end('Method Not Allowed');
    return;
  }
  try {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = normalize(join(ROOT, urlPath));
    // Confine to ROOT: block both `../` traversal and `prototype-*` sibling-prefix escapes.
    if (filePath !== ROOT && !filePath.startsWith(ROOT + sep)) {
      res.writeHead(403, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS }).end('Forbidden');
      return;
    }
    const body = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': TYPES[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ...SECURITY_HEADERS });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain', ...SECURITY_HEADERS }).end('Not found');
  }
}).listen(PORT, () => console.log(`PrayerHub prototype running at http://localhost:${PORT}`));
