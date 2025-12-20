(function(){
  'use strict';

  const qs = (s, r=document) => r.querySelector(s);

  const lang = (document.documentElement.lang || navigator.language || 'pl').toLowerCase().startsWith('pl') ? 'pl' : 'en';
  const T = (lang === 'pl') ? {
    select_ph: '-- Wybierz model --',
    status_pick: 'Wybierz dwa tunery, aby zobaczyć porównanie.',
    status_loaded: 'Załadowano: {n} modeli.',
    status_filtered: 'Filtrowanie: {n} modeli.',
    error_load: 'Nie udało się załadować bazy tunerów.',
    labels: { tuners:'Tunery', video:'Wideo', lanwifi:'LAN/Wi‑Fi', ports:'Porty', price:'Cena' }
  } : {
    select_ph: '-- Select model --',
    status_pick: 'Select two tuners to see the comparison.',
    status_loaded: 'Loaded: {n} models.',
    status_filtered: 'Filtering: {n} models.',
    error_load: 'Failed to load tuner database.',
    labels: { tuners:'Tuners', video:'Video', lanwifi:'LAN/Wi‑Fi', ports:'Ports', price:'Price' }
  };

  
  function setText(sel, text){
    const el = qs(sel);
    if(el) el.textContent = text;
  }
  function setPlaceholder(sel, text){
    const el = qs(sel);
    if(el) el.setAttribute('placeholder', text);
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

  function formatTags(tags){
    if(!Array.isArray(tags) || !tags.length) return '';
    return `<div class="tags" style="margin-top:10px">` + tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('') + `</div>`;
  }

  function renderTunerCard(t){
    if(!t) return `<div class="muted">${esc(T.status_pick)}</div>`;
    const title = `${t.brand||''} ${t.model||''}`.trim();
    return `
      <h3 style="margin:0 0 8px">${esc(title || '—')}</h3>
      <div style="color:var(--muted);margin-bottom:10px">${esc(t.cpu||'')}${t.ram?` • ${esc(t.ram)}`:''}${t.flash?` • ${esc(t.flash)}`:''}</div>

      <div style="display:grid;gap:8px">
        <div><strong style="color:var(--text)">${esc(T.labels.tuners)}:</strong> ${esc(t.tuners||'—')}</div>
        <div><strong style="color:var(--text)">${esc(T.labels.video)}:</strong> ${esc(t.resolution||'—')}</div>
        <div><strong style="color:var(--text)">${esc(T.labels.lanwifi)}:</strong> ${esc(t.lan||'—')} / ${esc(t.wifi||'—')}</div>
        <div><strong style="color:var(--text)">${esc(T.labels.ports)}:</strong> ${esc(t.ports||'—')}</div>
        <div><strong style="color:var(--text)">${esc(T.labels.price)}:</strong> ${esc(t.price||'—')}</div>
      </div>
      ${formatTags(t.tags)}
    `;
  }

  function updateStatus(text){
    const el = qs('#compareStatus');
    if(el) el.textContent = text || '';
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    const s1 = qs('#tuner1-select');
    const s2 = qs('#tuner2-select');
    const search = qs('#tunerSearch');
    const left = qs('#compareLeft');
    const right = qs('#compareRight');
    // Localize labels/placeholders on this page (independent of global i18n)
    setText('[data-i18n="tuners_title"]', lang === 'pl' ? 'Porównywarka tunerów' : 'Tuner comparison');
    setText('[data-i18n="tuners_subtitle"]', lang === 'pl' ? 'Wybierz dwa modele i porównaj specyfikację.' : 'Pick two models and compare specifications.');
    setText('[data-i18n="tuner1_label"]', lang === 'pl' ? 'Tuner 1' : 'Tuner 1');
    setText('[data-i18n="tuner2_label"]', lang === 'pl' ? 'Tuner 2' : 'Tuner 2');
    setText('[data-i18n="tuners_search_label"]', lang === 'pl' ? 'Szukaj' : 'Search');
    setPlaceholder('#tunerSearch', lang === 'pl' ? 'Np. 4K, VU+, gigabit, DVB-S2X' : 'e.g., 4K, VU+, gigabit, DVB-S2X');

    if(!s1 || !s2 || !left || !right) return;

    let all = [];
    try{
      const json = await fetchJSON('./data/tuners.json');
      all = (json && json.tuners) ? json.tuners.slice() : [];
    }catch(e){
      console.error(e);
      updateStatus(T.error_load);
      left.innerHTML = `<div class="muted">—</div>`;
      right.innerHTML = `<div class="muted">—</div>`;
      return;
    }

    all.sort((a,b)=>((a.brand||'')+(a.model||'')).localeCompare((b.brand||'')+(b.model||'')));

    function buildOptions(list){
      let html = `<option value="">${esc(T.select_ph)}</option>`;
      for(const t of list){
        html += `<option value="${esc(t.id)}">${esc((t.brand||'')+' '+(t.model||''))}</option>`;
      }
      return html;
    }

    function applyFilter(){
      const q = (search && search.value || '').trim().toLowerCase();
      if(!q) return all;

      return all.filter(t=>{
        const hay = [
          t.brand, t.model, t.cpu, t.ram, t.flash, t.tuners, t.resolution, t.lan, t.wifi, t.ports, t.price,
          Array.isArray(t.tags) ? t.tags.join(' ') : ''
        ].join(' ').toLowerCase();
        return hay.includes(q);
      });
    }

    function repopulate(){
      const filtered = applyFilter();
      const prev1 = s1.value;
      const prev2 = s2.value;

      s1.innerHTML = buildOptions(filtered);
      s2.innerHTML = buildOptions(filtered);

      if(prev1 && filtered.some(x=>String(x.id)===String(prev1))) s1.value = prev1;
      if(prev2 && filtered.some(x=>String(x.id)===String(prev2))) s2.value = prev2;

      if(!search || !(search.value||'').trim()){
        updateStatus(T.status_loaded.replace('{n}', String(all.length)));
      }else{
        updateStatus(T.status_filtered.replace('{n}', String(filtered.length)));
      }
    }

    function getById(id){
      return all.find(x=>String(x.id)===String(id)) || null;
    }

    function render(){
      const t1 = getById(s1.value);
      const t2 = getById(s2.value);

      left.innerHTML = renderTunerCard(t1);
      right.innerHTML = renderTunerCard(t2);

      if(!t1 && !t2){
        updateStatus(T.status_pick);
      }
    }

    repopulate();
    render();

    if(search){
      search.addEventListener('input', ()=>{
        repopulate();
        render();
      });
    }

    s1.addEventListener('change', render);
    s2.addEventListener('change', render);
  });
})();
