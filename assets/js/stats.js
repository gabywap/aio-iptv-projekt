(function(){
  'use strict';

  const qs = (s, r=document) => r.querySelector(s);

  
  const lang = (document.documentElement.lang || navigator.language || 'pl').toLowerCase().startsWith('pl') ? 'pl' : 'en';
  const T = (lang === 'pl') ? {
    title: 'Statystyki odwiedzin',
    subtitle: 'Dane z Google Analytics (GA4).',
    note: 'Aby wyświetlić dane, ustaw statsEndpoint (API) lub looker_embed_url w data/analytics_config.json.',
    summary: 'Podsumowanie',
    top: 'Top strony',
    report: 'Raport (Looker Studio)',
    loading: 'Ładowanie statystyk…',
    error: 'Nie udało się pobrać statystyk.',
    page: 'Strona',
    views: 'Wyświetlenia',
    active: 'Aktywni użytkownicy',
    users: 'Użytkownicy',
    sessions: 'Sesje',
    pageviews: 'Odsłony'
  } : {
    title: 'Traffic statistics',
    subtitle: 'Data from Google Analytics (GA4).',
    note: 'To show data, set statsEndpoint (API) or looker_embed_url in data/analytics_config.json.',
    summary: 'Summary',
    top: 'Top pages',
    report: 'Report (Looker Studio)',
    loading: 'Loading statistics…',
    error: 'Failed to load statistics.',
    page: 'Page',
    views: 'Views',
    active: 'Active users',
    users: 'Users',
    sessions: 'Sessions',
    pageviews: 'Page views'
  };

  function setText(sel, text){
    const el = qs(sel);
    if(el) el.textContent = text;
  }

function esc(s){
    return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  async function fetchJSON(url){
    const u = new URL(url, document.baseURI).toString();
    const res = await fetch(u, { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP '+res.status);
    return await res.json();
  }

  
  function renderSummary(sum){
    const host = qs('#statsCards');
    if(!host) return;
    const items = [
      [T.active, sum.activeUsers],
      [T.users, sum.users],
      [T.sessions, sum.sessions],
      [T.pageviews, sum.pageviews]
    ];
    host.innerHTML = items.map(([label,val]) => (
      `<div class="card" style="padding:14px">
        <div style="font-size:.9rem;color:var(--muted)">${esc(label)}</div>
        <div style="font-size:1.8rem;font-weight:800;margin-top:6px">${esc(val ?? '—')}</div>
      </div>`
    )).join('');
  }

  function renderTopPages(pages){
    const host = qs('#statsTable');
    if(!host) return;
    const rows = (pages || []).slice(0, 15).map(p => (
      `<tr>
        <td style="padding:10px;border-bottom:1px solid rgba(148,163,184,.14)"><code>${esc(p.path || p.page || p.title || '')}</code></td>
        <td style="padding:10px;border-bottom:1px solid rgba(148,163,184,.14);text-align:right">${esc(p.views ?? p.pageviews ?? p.value ?? '')}</td>
      </tr>`
    )).join('');
    host.innerHTML = `
      <div class="card" style="padding:0;overflow:hidden">
        <div style="padding:14px 14px 8px;font-weight:800">${esc('Top pages')}</div>
        <div style="overflow:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left;padding:10px;border-bottom:1px solid rgba(148,163,184,.18);color:var(--muted);font-weight:700">{esc(T.page)}</th>
                <th style="text-align:right;padding:10px;border-bottom:1px solid rgba(148,163,184,.18);color:var(--muted);font-weight:700">{esc(T.views)}</th>
              </tr>
            </thead>
            <tbody>${rows || `<tr><td style="padding:12px" colspan="2" class="muted">—</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  function setStatus(msg){
    const el = qs('#statsStatus');
    if(el) el.textContent = msg;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    setText('[data-i18n="stats_title"]', T.title);
    setText('[data-i18n="stats_subtitle"]', T.subtitle);
    setText('[data-i18n="stats_note"]', T.note);
    setText('[data-i18n="stats_cards_title"]', T.summary);
    setText('[data-i18n="stats_table_title"]', T.top);
    setText('[data-i18n="stats_embed_title"]', T.report);
    try{
      const cfg = window.__AIO_ANALYTICS_CONFIG || await fetchJSON('./data/analytics_config.json');
      const embed = (cfg && (cfg.looker_embed_url || cfg.lookerStudioEmbedUrl || cfg.embed)) ? String(cfg.looker_embed_url || cfg.lookerStudioEmbedUrl || cfg.embed).trim() : '';
      const endpoint = (cfg && (cfg.statsEndpoint || cfg.stats_endpoint)) ? String(cfg.statsEndpoint || cfg.stats_endpoint).trim() : '';

      if(embed){
        const wrap = qs('#statsEmbedWrap');
        const iframe = qs('#statsEmbed');
        if(wrap && iframe){
          wrap.style.display = '';
          iframe.src = embed;
        }
      }

      if(!endpoint){
        setStatus(T.note);
        return;
      }

      setStatus(T.loading);
      const data = await fetchJSON(endpoint);

      renderSummary(data.summary || data.totals || {});
      renderTopPages(data.topPages || data.pages || []);
      setStatus('');
    }catch(e){
      console.error(e);
      setStatus(T.error);
    }
  });
})();
