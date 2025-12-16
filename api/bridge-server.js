/**
 * api/bridge-server.js
 * ------------------------------------------------------------
 * Lokalny „bridge” pomiędzy stroną (GitHub Pages) a tunerem Enigma2 w LAN.
 *
 * Cel:
 * - realne dane do dashboardu (CPU/RAM/Dysk) z OpenWebif /api/statusinfo
 * - test logowania przez FTP (root + hasło FTP)
 * - pobieranie plików logów przez FTP (opcjonalnie)
 *
 * Bezpieczeństwo:
 * - serwer uruchamiasz TYLKO lokalnie w swojej sieci.
 * - NIE wystawiaj portu na Internet.
 */
'use strict';

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { Client } = require('basic-ftp');

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '0.0.0.0';

// Dozwolone originy (możesz dopisać swoją domenę)
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use(cors({
  origin: (origin, cb) => {
    // brak origin (np. curl) – zezwól
    if (!origin) return cb(null, true);
    if (!ALLOWED_ORIGINS.length) return cb(null, true); // domyślnie: zezwól na wszystko w LAN
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed'));
  },
  credentials: false
}));

/** token -> { ip, username, password, createdAt } */
const sessions = new Map();

function newToken() {
  return crypto.randomBytes(18).toString('base64url');
}

function getSession(req) {
  const token = req.query.token || req.params.token || (req.body && req.body.token);
  if (!token) return { error: 'Missing token' };
  const s = sessions.get(String(token));
  if (!s) return { error: 'Invalid token (session expired or not found)' };
  return { token: String(token), session: s };
}

async function ftpTestLogin({ ip, username, password }) {
  const client = new Client(5000);
  client.ftp.verbose = false;
  try {
    await client.access({
      host: ip,
      port: 21,
      user: username,
      password: password,
      secure: false
    });
    // proste sprawdzenie: listuj katalog główny
    await client.list('/');
    return { ok: true };
  } finally {
    try { client.close(); } catch {}
  }
}

async function ftpGetText({ ip, username, password, path }) {
  const client = new Client(10000);
  client.ftp.verbose = false;
  try {
    await client.access({
      host: ip,
      port: 21,
      user: username,
      password: password,
      secure: false
    });
    const chunks = [];
    await client.downloadTo(
      {
        write: (buf) => chunks.push(Buffer.from(buf)),
        end: () => {},
        once: () => {},
        on: () => {}
      },
      path
    );
    return Buffer.concat(chunks).toString('utf-8');
  } finally {
    try { client.close(); } catch {}
  }
}

async function openwebifFetchJSON(ip, endpoint, timeoutMs = 5000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `http://${ip}${endpoint}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`OpenWebif HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function percent(val) {
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, n));
}

/**
 * Wylicz RAM/Dysk z danych OpenWebif.
 * OpenWebif bywa różny w zależności od image/wtyczek – obsługujemy kilka formatów.
 */
function computeStatsFromStatusinfo(statusinfo) {
  // CPU: jeśli jest loadavg (np. "0.28 0.22 0.18"), zamieniamy na % w przybliżeniu
  let cpuPercent = null;
  const la = statusinfo?.loadavg;
  if (typeof la === 'string') {
    const first = Number(String(la).trim().split(/\s+/)[0]);
    if (Number.isFinite(first)) {
      // „heurystyka”: load 1.00 ~ 25% (tuner ma zwykle 4 wątki). Ograniczamy do 100.
      cpuPercent = percent(first * 25);
    }
  }

  // RAM: różne pola: memfree/memtotal, memory, ram (zależy od build)
  let ramPercent = null;
  const memFree = Number(statusinfo?.memfree ?? statusinfo?.mem_free ?? statusinfo?.memory?.free);
  const memTotal = Number(statusinfo?.memtotal ?? statusinfo?.mem_total ?? statusinfo?.memory?.total);
  if (Number.isFinite(memFree) && Number.isFinite(memTotal) && memTotal > 0) {
    ramPercent = percent(((memTotal - memFree) / memTotal) * 100);
  }

  // Dysk: statusinfo.hdd (często: { total, free }) – jednostki zależą od wersji
  let diskPercent = null;
  const hddTotal = Number(statusinfo?.hdd?.total ?? statusinfo?.hdd_total);
  const hddFree = Number(statusinfo?.hdd?.free ?? statusinfo?.hdd_free);
  if (Number.isFinite(hddTotal) && Number.isFinite(hddFree) && hddTotal > 0) {
    diskPercent = percent(((hddTotal - hddFree) / hddTotal) * 100);
  }

  return {
    cpu: cpuPercent ?? 0,
    ram: ramPercent ?? 0,
    disk: diskPercent ?? 0,
    source: 'openwebif',
    raw: statusinfo
  };
}

// ---------- API ----------

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'aio-iptv-bridge', port: PORT, sessions: sessions.size });
});

/**
 * POST /api/session
 * body: { ip, username, password }
 * -> { token }
 */
app.post('/api/session', async (req, res) => {
  const ip = String(req.body?.ip || '').trim();
  const username = String(req.body?.username || 'root').trim();
  const password = String(req.body?.password || '').trim();

  if (!ip || !password) return res.status(400).json({ error: 'Missing ip or password' });

  try {
    // test FTP login (zgodnie z wymaganiem: root + hasło FTP)
    await ftpTestLogin({ ip, username, password });

    const token = newToken();
    sessions.set(token, { ip, username, password, createdAt: Date.now() });
    res.json({ token });
  } catch (e) {
    res.status(401).json({ error: `Login failed: ${String(e.message || e)}` });
  }
});

/**
 * DELETE /api/session/:token
 */
app.delete('/api/session/:token', (req, res) => {
  const token = String(req.params.token || '').trim();
  if (!token) return res.status(400).json({ error: 'Missing token' });
  sessions.delete(token);
  res.json({ ok: true });
});

/**
 * GET /api/tuner/status?token=...
 */
app.get('/api/tuner/status', async (req, res) => {
  const { error, session } = getSession(req);
  if (error) return res.status(401).json({ error });

  try {
    const statusinfo = await openwebifFetchJSON(session.ip, '/api/statusinfo', 6000);
    const stats = computeStatsFromStatusinfo(statusinfo);
    res.json({ ok: true, stats });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e) });
  }
});

/**
 * GET /api/tuner/diagnostic?token=...
 * Zwraca listę „checków” pod dashboard
 */
app.get('/api/tuner/diagnostic', async (req, res) => {
  const { error, session } = getSession(req);
  if (error) return res.status(401).json({ error });

  const checks = [];
  try {
    // OpenWebif /api/about
    const about = await openwebifFetchJSON(session.ip, '/api/about', 6000).catch(() => null);
    if (about) {
      checks.push({ name: 'OpenWebif /api/about', status: 'success', details: `OK · ${about?.about?.enigma2 || 'Enigma2'}` });
    } else {
      checks.push({ name: 'OpenWebif /api/about', status: 'warning', details: 'Brak odpowiedzi (sprawdź OpenWebif)' });
    }

    const statusinfo = await openwebifFetchJSON(session.ip, '/api/statusinfo', 6000);
    const stats = computeStatsFromStatusinfo(statusinfo);
    checks.push({ name: 'OpenWebif /api/statusinfo', status: 'success', details: `CPU≈${Math.round(stats.cpu)}% · RAM≈${Math.round(stats.ram)}% · Dysk≈${Math.round(stats.disk)}%` });

    // FTP login (to już jest sprawdzone przy sesji), ale pokaż jako check
    checks.push({ name: 'FTP: logowanie root', status: 'success', details: 'OK' });

    res.json({ ok: true, checks, stats });
  } catch (e) {
    checks.push({ name: 'Diagnostyka', status: 'error', details: String(e.message || e) });
    res.status(502).json({ ok: false, checks });
  }
});

/**
 * POST /api/tuner/log
 * body: { token, path }
 * -> { ok, text }
 */
app.post('/api/tuner/log', async (req, res) => {
  const { error, session } = getSession(req);
  if (error) return res.status(401).json({ error });

  const path = String(req.body?.path || '').trim();
  if (!path) return res.status(400).json({ error: 'Missing path' });

  try {
    const text = await ftpGetText({ ip: session.ip, username: session.username, password: session.password, path });
    res.json({ ok: true, text });
  } catch (e) {
    res.status(502).json({ ok: false, error: String(e.message || e) });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`✅ AIO-IPTV Bridge: http://${HOST}:${PORT}`);
  if (ALLOWED_ORIGINS.length) console.log('CORS allowed origins:', ALLOWED_ORIGINS);
});
