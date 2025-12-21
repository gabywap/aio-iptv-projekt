(function () {
  'use strict';

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  // -------------------------
  // Small logger (adds a panel at bottom)
  // -------------------------
  function ensureLogPanel() {
    let wrap = qs('#flLog');
    if (wrap) return wrap;

    const main = qs('main.container') || document.body;
    wrap = document.createElement('section');
    wrap.className = 'fl-log';
    wrap.id = 'flLog';
    wrap.innerHTML = `
      <div class="fl-log__head">
        <div class="fl-log__title">Future Lab — log</div>
        <div style="display:flex; gap:8px">
          <button type="button" class="btn" id="flLogCopy">Kopiuj</button>
          <button type="button" class="btn" id="flLogClear">Wyczyść</button>
        </div>
      </div>
      <div class="fl-log__body" id="flLogBody"></div>
    `;
    main.appendChild(wrap);

    const body = qs('#flLogBody');
    const copyBtn = qs('#flLogCopy');
    const clrBtn = qs('#flLogClear');

    copyBtn && copyBtn.addEventListener('click', async () => {
      const text = (body?.innerText || '').trim();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch (_) {}
    });

    clrBtn && clrBtn.addEventListener('click', () => {
      if (body) body.innerHTML = '';
    });

    return wrap;
  }

  function logLine(message, level = 'info') {
    ensureLogPanel();
    const body = qs('#flLogBody');
    if (!body) return;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const div = document.createElement('div');
    div.className = 'fl-log__line' + (level === 'warn' ? ' fl-log__line--warn' : level === 'err' ? ' fl-log__line--err' : '');
    div.textContent = `[${ts}] ${message}`;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
  }

  // -------------------------
  // Helpers
  // -------------------------
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"]|'/g, (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]
    );
  }

  async function readFile(input) {
    const f = input?.files?.[0];
    if (!f) return '';
    return await f.text();
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toBaseUrl(path) {
    return new URL(path, document.baseURI).toString();
  }

  // -------------------------
  // Config Diff
  // Supports Enigma2 settings and simple key=value / key: value configs.
  // -------------------------
  function parseKeyValue(text) {
    const map = new Map();
    const lines = String(text || '').split(/\r?\n/);

    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#') || line.startsWith(';')) continue;

      let idx = line.indexOf('=');
      if (idx < 1) idx = line.indexOf(':');
      if (idx < 1) continue;

      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      if (!key) continue;
      map.set(key, val);
    }

    return map;
  }

  function renderDiff(beforeMap, afterMap) {
    const table = qs('#cfgDiffTable');
    const tbody = table ? qs('tbody', table) : null;
    const summary = qs('#cfgDiffSummary');

    const keys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
    const rows = [];
    let added = 0,
      removed = 0,
      changed = 0,
      same = 0;

    for (const k of Array.from(keys).sort((a, b) => a.localeCompare(b))) {
      const b = beforeMap.get(k);
      const a = afterMap.get(k);
      if (b === undefined && a !== undefined) {
        added++;
        rows.push({ type: 'ADDED', key: k, before: '', after: a });
      } else if (b !== undefined && a === undefined) {
        removed++;
        rows.push({ type: 'REMOVED', key: k, before: b, after: '' });
      } else if (b !== a) {
        changed++;
        rows.push({ type: 'CHANGED', key: k, before: b, after: a });
      } else {
        same++;
      }
    }

    const headline = `Zmiany: +${added} / -${removed} / Δ${changed} / =${same}`;
    if (summary) summary.textContent = headline;

    if (tbody) {
      tbody.innerHTML = rows
        .map((r) => {
          const cls = r.type.toLowerCase();
          return `
            <tr class="${cls}">
              <td>${escapeHtml(r.type)}</td>
              <td>${escapeHtml(r.key)}</td>
              <td class="mono">${escapeHtml(r.before)}</td>
              <td class="mono">${escapeHtml(r.after)}</td>
            </tr>
          `;
        })
        .join('');

      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="4" class="muted">Brak zmian do pokazania.</td></tr>`;
      }
    }

    const report = [];
    report.push('AIO‑IPTV — Future Lab / Config Diff');
    report.push(headline);
    report.push('');
    for (const r of rows) {
      report.push(`[${r.type}] ${r.key}`);
      if (r.type !== 'ADDED') report.push(`  BEFORE: ${r.before}`);
      if (r.type !== 'REMOVED') report.push(`  AFTER : ${r.after}`);
      report.push('');
    }

    const dl = qs('#cfgDiffDownload');
    if (dl) {
      dl.disabled = false;
      dl.dataset.report = report.join('\n');
    }

    logLine(`Config Diff: ${headline}`);
  }

  function bindConfigDiff() {
    const runBtn = qs('#cfgDiffBtn');
    const dlBtn = qs('#cfgDiffDownload');
    const beforeInput = qs('#cfgBefore');
    const afterInput = qs('#cfgAfter');

    if (!runBtn || !beforeInput || !afterInput) return;

    runBtn.addEventListener('click', async () => {
      try {
        const beforeTxt = await readFile(beforeInput);
        const afterTxt = await readFile(afterInput);

        if (!beforeTxt || !afterTxt) {
          alert('Wybierz oba pliki: „przed” i „po”.');
          return;
        }

        const beforeMap = parseKeyValue(beforeTxt);
        const afterMap = parseKeyValue(afterTxt);

        renderDiff(beforeMap, afterMap);
      } catch (e) {
        logLine(`Config Diff: błąd — ${String(e)}`, 'err');
      }
    });

    dlBtn &&
      dlBtn.addEventListener('click', () => {
        const report = dlBtn.dataset.report || '';
        if (!report) return;
        downloadText('config-diff-report.txt', report);
        logLine('Config Diff: pobrano raport');
      });
  }

  // -------------------------
  // Auto‑Checklist
  // -------------------------
  async function tryFetch(url, ms = 6000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      const txt = await res.text().catch(() => '');
      clearTimeout(timer);
      return { ok: res.ok, status: res.status, text: txt };
    } catch (e) {
      clearTimeout(timer);
      return { ok: false, error: String(e) };
    }
  }

  function badge(ok) {
    return ok
      ? '<span class="pill" style="background:rgba(34,197,94,.14);border-color:rgba(34,197,94,.28)">OK</span>'
      : '<span class="pill" style="background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.28)">BŁĄD</span>';
  }

  function buildRecommendedCmds() {
    return [
      'echo "=== AIO Future Lab: Auto‑Checklist ==="',
      'ip a || ifconfig',
      'ping -c 3 8.8.8.8 || ping -c 3 1.1.1.1',
      'nslookup github.com 8.8.8.8 || nslookup github.com',
      'date',
      'which ntpdate >/dev/null 2>&1 && ntpdate -q pool.ntp.org || echo "ntpdate brak"',
      'df -h',
      'opkg update || echo "opkg update nie działa"',
      'python3 -c "import ssl; print(ssl.OPENSSL_VERSION)" 2>/dev/null || python -c "import ssl; print(ssl.OPENSSL_VERSION)"',
      'wget -S --spider https://github.com 2>&1 | head -n 20'
    ].join(' && \\\n');
  }

  async function runChecklist() {
    const out = qs('#checkResults');

    const set = (html) => {
      if (out) out.innerHTML = html;
    };

    set('Testuję…');
    logLine('Auto‑Checklist: start');

    const results = {
      net: { ok: false, msg: '' },
      dns: { ok: false, msg: '' },
      time: { ok: false, msg: '' },
      space: { ok: true, msg: '' }
    };

    // 1) Network/TLS
    const net = await tryFetch('https://cloudflare.com/cdn-cgi/trace');
    results.net.ok = !!net.ok;
    results.net.msg = net.ok ? 'HTTPS działa (Cloudflare trace)' : 'Brak odpowiedzi (sieć / CORS / blokada)';

    // 2) DNS
    const dns = await tryFetch('https://dns.google/resolve?name=github.com&type=A');
    let dnsOk = false;
    if (dns.ok) {
      try {
        const j = JSON.parse(dns.text);
        dnsOk = Array.isArray(j.Answer) && j.Answer.some((a) => String(a.data || '').match(/\d+\.\d+\.\d+\.\d+/));
      } catch (_) {
        dnsOk = false;
      }
    }
    results.dns.ok = dnsOk;
    results.dns.msg = dnsOk ? 'DNS resolve github.com (dns.google)' : 'Błąd DNS / brak odpowiedzi';

    // 3) Time
    const tm = await tryFetch('https://worldtimeapi.org/api/ip');
    let timeMsg = 'Błąd (time API)';
    let timeOk = false;
    if (tm.ok) {
      try {
        const j = JSON.parse(tm.text);
        const remote = j.unixtime ? j.unixtime * 1000 : Date.now();
        const local = Date.now();
        const diffSec = Math.round((local - remote) / 1000);
        timeOk = Math.abs(diffSec) <= 120;
        timeMsg = `Różnica czasu: ${diffSec}s (${timeOk ? 'OK' : 'sprawdź NTP'})`;
      } catch (_) {
        timeOk = false;
        timeMsg = 'Błąd parsowania czasu';
      }
    }
    results.time.ok = timeOk;
    results.time.msg = timeMsg;

    // 4) Storage estimate
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const used = est.usage || 0;
        const quota = est.quota || 0;
        const pct = quota ? Math.round((used / quota) * 100) : 0;
        results.space.ok = pct < 90;
        results.space.msg = quota ? `Pamięć przeglądarki: ${pct}%` : 'Pamięć przeglądarki: brak danych';
      } else {
        results.space.ok = true;
        results.space.msg = 'Storage API niedostępne — pomijam';
      }
    } catch (e) {
      results.space.ok = false;
      results.space.msg = `Błąd Storage API: ${String(e)}`;
    }

    const html = `
      <div style="display:grid; gap:10px">
        <div>${badge(results.net.ok)} <strong>Sieć/HTTPS:</strong> ${escapeHtml(results.net.msg)}</div>
        <div>${badge(results.dns.ok)} <strong>DNS:</strong> ${escapeHtml(results.dns.msg)}</div>
        <div>${badge(results.time.ok)} <strong>Czas:</strong> ${escapeHtml(results.time.msg)}</div>
        <div>${badge(results.space.ok)} <strong>Storage:</strong> ${escapeHtml(results.space.msg)}</div>
      </div>
    `;

    set(html);
    logLine(
      `Auto‑Checklist: net=${results.net.ok ? 'OK' : 'ERR'} dns=${results.dns.ok ? 'OK' : 'ERR'} time=${results.time.ok ? 'OK' : 'ERR'} storage=${results.space.ok ? 'OK' : 'ERR'}`
    );

    const cmds = qs('#checkCmds');
    if (cmds) cmds.textContent = buildRecommendedCmds();
  }

  function bindChecklist() {
    const runBtn = qs('#checkRun');
    const copyBtn = qs('#checkCopy');

    if (runBtn) {
      runBtn.addEventListener('click', async () => {
        runBtn.disabled = true;
        try {
          await runChecklist();
        } finally {
          runBtn.disabled = false;
        }
      });
    }

    copyBtn &&
      copyBtn.addEventListener('click', async () => {
        const txt = (qs('#checkCmds')?.textContent || '').trim();
        if (!txt) return;
        try {
          await navigator.clipboard.writeText(txt);
          logLine('Auto‑Checklist: skopiowano komendy');
        } catch (_) {
          logLine('Auto‑Checklist: nie udało się skopiować (brak uprawnień)', 'warn');
        }
      });
  }

  // -------------------------
  // ServiceRef Explorer
  // -------------------------
  function parseLamedb(text) {
    const lines = String(text || '').split(/\r?\n/);
    const services = [];
    let inServices = false;

    for (let i = 0; i < lines.length; i++) {
      const l = (lines[i] || '').trim();
      if (l === 'services') {
        inServices = true;
        continue;
      }
      if (inServices && l === 'end') break;
      if (!inServices) continue;

      const ref = l;
      if (!ref) continue;
      const name = (lines[i + 1] || '').trim();
      const prov = (lines[i + 2] || '').trim();
      services.push({ ref, name, prov });
      i += 2;
    }

    return services;
  }

  function piconNameFromRef(ref) {
    let r = String(ref || '').trim();
    while (r.endsWith(':')) r = r.slice(0, -1);
    r = r.replace(/:/g, '_');
    r = r.replace(/[^0-9A-Za-z_]/g, '_');
    return r + '.png';
  }

  function refType(ref) {
    const r = String(ref || '').trim();
    // common IPTV markers in Enigma2 bouquets/lamedb: 4097, 5001, 5002, 8193
    if (/^(4097|5001|5002|8193):/.test(r)) return 'IPTV/STREAM';
    return 'DVB';
  }

  function renderServices(state) {
    const list = state.services || [];
    const q = String(qs('#srSearch')?.value || '').trim().toLowerCase();

    const filtered = !q
      ? list
      : list.filter((s) =>
          String(s.name || '').toLowerCase().includes(q) ||
          String(s.prov || '').toLowerCase().includes(q) ||
          String(s.ref || '').toLowerCase().includes(q)
        );

    const tbody = qs('#srTable tbody');
    if (!tbody) return;

    tbody.innerHTML = filtered
      .slice(0, 700)
      .map((s) => {
        const picon = piconNameFromRef(s.ref);
        const tag = refType(s.ref);
        return `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <span class="pill" style="padding:4px 10px; font-size:11px;">${escapeHtml(tag)}</span>
                <div>
                  <div style="font-weight:900">${escapeHtml(s.name || '(brak nazwy)')}</div>
                  <div class="muted" style="font-size:12px">${escapeHtml(s.prov || '')}</div>
                </div>
              </div>
            </td>
            <td class="mono" title="Kliknij, aby skopiować" data-copy="${escapeHtml(s.ref)}">${escapeHtml(s.ref)}</td>
            <td class="mono" title="Kliknij, aby skopiować" data-copy="${escapeHtml(picon)}">${escapeHtml(picon)}</td>
          </tr>
        `;
      })
      .join('');

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="muted">Brak wyników.</td></tr>`;
    }

    const summary = qs('#srSummary');
    if (summary) {
      summary.textContent = `Wczytano: ${list.length} • Wynik: ${filtered.length}`;
    }

    // copy-on-click
    qsa('[data-copy]', tbody).forEach((td) => {
      td.addEventListener('click', async () => {
        const val = td.getAttribute('data-copy') || '';
        if (!val) return;
        try {
          await navigator.clipboard.writeText(val);
          logLine(`ServiceRef Explorer: skopiowano — ${val.slice(0, 80)}`);
        } catch (_) {
          logLine('ServiceRef Explorer: kopiowanie zablokowane przez przeglądarkę', 'warn');
        }
      });
    });
  }

  async function loadSampleLamedb() {
    const urls = [toBaseUrl('pliki/lamedb'), toBaseUrl('data/lamedb_sample.lamedb')];
    for (const u of urls) {
      try {
        const res = await fetch(u, { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const txt = await res.text();
        logLine(`ServiceRef Explorer: wczytano próbkę (${u.split('/').pop()})`);
        return txt;
      } catch (e) {
        logLine(`ServiceRef Explorer: nie można wczytać ${u} (${String(e)})`, 'warn');
      }
    }
    throw new Error('Brak pliku lamedb (repo)');
  }

  function exportCsv(services) {
    const lines = [];
    lines.push('name,provider,type,serviceRef,picon');
    for (const s of services) {
      const picon = piconNameFromRef(s.ref);
      const type = refType(s.ref);
      const row = [
        String(s.name || '').replace(/"/g, '""'),
        String(s.prov || '').replace(/"/g, '""'),
        type,
        String(s.ref || '').replace(/"/g, '""'),
        picon
      ].map((x) => `"${x}"`);
      lines.push(row.join(','));
    }
    return lines.join('\n');
  }

  function bindServiceRefExplorer() {
    const state = { services: [] };

    const search = qs('#srSearch');
    const file = qs('#srFile');
    const sampleBtn = qs('#srLoadSample');
    const exportBtn = qs('#srExport');

    if (!search || !sampleBtn || !exportBtn) return;

    const setServices = (services) => {
      state.services = services;
      exportBtn.disabled = services.length === 0;
      renderServices(state);
    };

    search.addEventListener('input', () => renderServices(state));

    file &&
      file.addEventListener('change', async () => {
        try {
          const txt = await readFile(file);
          if (!txt) return;
          const services = parseLamedb(txt);
          setServices(services);
          logLine(`ServiceRef Explorer: wczytano plik użytkownika (${services.length} usług)`);
        } catch (e) {
          logLine(`ServiceRef Explorer: błąd pliku — ${String(e)}`, 'err');
        }
      });

    sampleBtn.addEventListener('click', async () => {
      try {
        const txt = await loadSampleLamedb();
        const services = parseLamedb(txt);
        setServices(services);
      } catch (e) {
        alert('Nie udało się wczytać próbki lamedb z repo. Sprawdź, czy istnieje plik /pliki/lamedb.');
        logLine(`ServiceRef Explorer: błąd próbki — ${String(e)}`, 'err');
      }
    });

    exportBtn.addEventListener('click', () => {
      if (!state.services.length) return;
      const csv = exportCsv(state.services);
      downloadText('serviceref_picon_map.csv', csv);
      logLine(`ServiceRef Explorer: eksport CSV (${state.services.length} usług)`);
    });
  }

  // -------------------------
  // Init
  // -------------------------
  function init() {
    bindConfigDiff();
    bindChecklist();
    bindServiceRefExplorer();

    // Ensure log panel exists only if the page is actually Future Lab
    if (qs('#cfgDiffBtn') || qs('#srTable') || qs('#checkRun')) {
      ensureLogPanel();
      logLine('Future Lab: gotowe');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
