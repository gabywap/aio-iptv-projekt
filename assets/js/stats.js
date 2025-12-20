(function () {
  'use strict';

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  function relUrl(path) {
    return new URL(path, document.baseURI).toString();
  }

  async function safeFetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  function fmt(n) {
    if (n === null || n === undefined || n === '') return '—';
    const x = Number(n);
    if (!isFinite(x)) return String(n);
    return x.toLocaleString();
  }

  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = v;
  }

  async function loadGitHub(repo) {
    try {
      const res = await fetch('https://api.github.com/repos/' + repo, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const d = await res.json();
      setText('repoStars', fmt(d.stargazers_count));
      setText('repoWatchers', fmt(d.subscribers_count ?? d.watchers_count));
      setText('repoForks', fmt(d.forks_count));
      setText('repoUpdated', d.pushed_at ? new Date(d.pushed_at).toLocaleDateString() : '—');
      const a = qs('#repoLink');
      if (a) a.href = 'https://github.com/' + repo;
      const span = qs('#repoName');
      if (span) span.textContent = repo;
    } catch (_) {}
  }

  function renderTopPages(rows) {
    const tbody = qs('#topPagesBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    (rows || []).slice(0, 15).forEach((r, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td><code>${String(r.path || r.pagePath || '').replace(/</g, '&lt;')}</code></td>
        <td style="text-align:right">${fmt(r.views ?? r.screenPageViews ?? r.pageviews)}</td>
      `;
      tbody.appendChild(tr);
    });
    if (!tbody.children.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="3" style="opacity:.75;padding:14px 10px">Brak danych.</td>`;
      tbody.appendChild(tr);
    }
  }

  async function loadGA4(endpoint, range) {
    const status = qs('#gaStatus');
    const url = new URL(endpoint);
    url.searchParams.set('range', range);

    status && (status.textContent = 'Ładuję dane…');

    const data = await safeFetchJSON(url.toString());

    setText('kpiUsers', fmt(data.totals?.activeUsers));
    setText('kpiSessions', fmt(data.totals?.sessions));
    setText('kpiViews', fmt(data.totals?.screenPageViews));
    setText('kpiRange', data.rangeLabel || range);

    renderTopPages(data.topPages || []);
    status && (status.textContent = 'OK');
  }

  function initRangeButtons(endpoint) {
    const btns = qsa('[data-range]');
    const setActive = (r) => {
      btns.forEach((b) => b.classList.toggle('active', b.getAttribute('data-range') === r));
    };

    const run = async (r) => {
      setActive(r);
      try {
        await loadGA4(endpoint, r);
      } catch (e) {
        const status = qs('#gaStatus');
        status && (status.textContent = 'Błąd: nie udało się pobrać statystyk.');
      }
    };

    btns.forEach((b) => b.addEventListener('click', () => run(b.getAttribute('data-range'))));

    // default
    run('7d');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const cfg = await safeFetchJSON(relUrl('data/analytics_config.json'));
      const endpoint = (cfg.statsEndpoint || '').trim();
      const repo = (cfg.githubRepo || 'OliOli2013/aio-iptv-projekt').trim();

      loadGitHub(repo);

      if (!endpoint) {
        const status = qs('#gaStatus');
        status && (status.textContent = 'Brak skonfigurowanego endpointu API (data/analytics_config.json → statsEndpoint).');
        return;
      }

      initRangeButtons(endpoint);
    } catch (_) {
      // ignore
    }
  });
})();