(function(){
  'use strict';

  // ---------------------------
  // Utilities
  // ---------------------------
  const qs = (s, r=document)=>r.querySelector(s);
  const esc = (v)=>String(v ?? '').replace(/[&<>"']/g, m=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[m]));
  const baseDir = ()=>location.pathname.replace(/[^\/]+$/, '') || '/';
  const abs = (p)=> new URL(p, location.origin + baseDir()).toString();

  async function fetchJSONSmart(){
    const candidates = [
      'data/tuners.json',
      './data/tuners.json',
      abs('data/tuners.json'),
      '/data/tuners.json',
      'data/tuner.json',
      'data/tuners_full.json'
    ];
    let lastErr;
    for(const p of candidates){
      try{
        const res = await fetch(p, { cache: 'no-store' });
        if(!res.ok) throw new Error(`HTTP ${res.status} for ${p}`);
        const j = await res.json();
        return j;
      }catch(e){ lastErr = e; }
    }
    throw lastErr || new Error('Fetch failed');
  }

  // ---------------------------
  // State
  // ---------------------------
  let tunersList = [];
  let selectedTuner1 = null;
  let selectedTuner2 = null;

  // ---------------------------
  // Parsing helpers (from base logic)
  // ---------------------------
  function extractNumber(str){
    if(!str) return 0;
    const m = String(str).replace(',', '.').match(/(\d+(\.\d+)?)/);
    if(!m) return 0;
    return Math.round(parseFloat(m[1]) * 1000) / 1000;
  }

  function extractPrice(str){
    if(!str) return 0;
    const s = String(str).replace(/\s/g,'');
    const m = s.match(/(\d+(\.\d+)?)/);
    if(!m) return 0;
    return parseFloat(m[1]);
  }

  function calculateScore(tuner){
    let score = 0;

    // RAM
    const ram = extractNumber(tuner.ram);
    if (ram >= 2) score += 30;
    else if (ram >= 1) score += 20;
    else if (ram >= 0.512) score += 10;

    // Flash
    const flash = extractNumber(tuner.flash);
    if (flash >= 16) score += 20;
    else if (flash >= 8) score += 15;
    else if (flash >= 4) score += 10;

    // Resolution
    if ((tuner.resolution || '').includes('4K')) score += 20;
    else if ((tuner.resolution || '').includes('Full')) score += 10;

    // LAN
    if ((tuner.lan || '').includes('Gigabit')) score += 10;

    // WiFi
    if ((tuner.wifi || '').toLowerCase().includes('tak') || (tuner.wifi || '').toLowerCase().includes('wifi')) score += 5;

    // Tuners (rough heuristic)
    const tuners = (tuner.tuners || '').toLowerCase();
    if (tuners.includes('dvb-s2x')) score += 10;
    if (tuners.includes('2x') || tuners.includes('dual')) score += 10;
    if (tuners.includes('4x') || tuners.includes('quad')) score += 15;

    return score;
  }

  function tagsHTML(tuner){
    const tags = Array.isArray(tuner.tags) ? tuner.tags : [];
    if(!tags.length) return '';
    return tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('');
  }

  function tunerLabel(t){
    return `${t.brand} ${t.model}`.trim();
  }

  function normalizeData(data){
    if(Array.isArray(data)) return data;
    if(data && Array.isArray(data.tuners)) return data.tuners;
    if(data && Array.isArray(data.items)) return data.items;
    return [];
  }

  // ---------------------------
  // UI functions
  // ---------------------------
  function buildOptions(list, selectedId){
    const opts = ['<option value="">— Wybierz model —</option>'];
    list.forEach(t=>{
      const sel = (selectedId && t.id === selectedId) ? ' selected' : '';
      opts.push(`<option value="${esc(t.id)}"${sel}>${esc(tunerLabel(t))}</option>`);
    });
    return opts.join('');
  }

  function applyFilter(){
    const q = (qs('#tunerSearch')?.value || '').trim().toLowerCase();
    if(!q) return tunersList;

    const tokens = q.split(/\s+/).filter(Boolean);
    return tunersList.filter(t=>{
      const hay = [
        t.brand, t.model, t.os, t.cpu, t.ram, t.flash, t.tuners, t.resolution, t.lan, t.wifi, t.slots, t.ports, t.price,
        ...(Array.isArray(t.tags)?t.tags:[])
      ].join(' ').toLowerCase();

      return tokens.every(tok=>hay.includes(tok));
    });
  }

  function refreshSelects(){
    const filtered = applyFilter().slice().sort((a,b)=>{
      const A=(a.brand+' '+a.model).toLowerCase();
      const B=(b.brand+' '+b.model).toLowerCase();
      return A.localeCompare(B);
    });

    const s1 = qs('#tuner1-select');
    const s2 = qs('#tuner2-select');

    if(!s1 || !s2) return;

    s1.innerHTML = buildOptions(filtered, selectedTuner1?.id);
    s2.innerHTML = buildOptions(filtered, selectedTuner2?.id);

    // Keep selections if they exist; otherwise reset to blank
    if(selectedTuner1 && !filtered.some(t=>t.id===selectedTuner1.id)) selectedTuner1 = null;
    if(selectedTuner2 && !filtered.some(t=>t.id===selectedTuner2.id)) selectedTuner2 = null;

    qs('#tagsA').innerHTML = selectedTuner1 ? tagsHTML(selectedTuner1) : '';
    qs('#tagsB').innerHTML = selectedTuner2 ? tagsHTML(selectedTuner2) : '';

    updateCompareButton();
  }

  function updateCompareButton(){
    const btn = qs('#compareBtn');
    const hint = qs('#compareHint');
    if(!btn) return;

    const ok = !!(selectedTuner1 && selectedTuner2 && selectedTuner1.id !== selectedTuner2.id);
    btn.disabled = !ok;

    if(hint){
      hint.textContent = ok ? 'Gotowe — kliknij „Porównaj”.' : 'Wybierz dwa różne modele.';
    }
  }

  function tableRow(param, v1, v2, win1, win2){
    const cls1 = win1 ? 'win' : (win2 ? 'lose' : '');
    const cls2 = win2 ? 'win' : (win1 ? 'lose' : '');
    return `<tr>
      <td><strong>${esc(param)}</strong></td>
      <td class="${cls1}">${esc(v1 || '—')}</td>
      <td class="${cls2}">${esc(v2 || '—')}</td>
    </tr>`;
  }

  function compareTuners(){
    if(!selectedTuner1 || !selectedTuner2) return;

    const t1 = selectedTuner1;
    const t2 = selectedTuner2;

    // Header labels
    qs('#tuner1-name').textContent = tunerLabel(t1);
    qs('#tuner2-name').textContent = tunerLabel(t2);
    qs('#badgeA').textContent = `A: ${tunerLabel(t1)}`;
    qs('#badgeB').textContent = `B: ${tunerLabel(t2)}`;

    const rows = [];

    // Numeric-ish heuristics
    const ram1 = extractNumber(t1.ram);
    const ram2 = extractNumber(t2.ram);
    rows.push(tableRow('RAM', t1.ram, t2.ram, ram1>ram2, ram2>ram1));

    const flash1 = extractNumber(t1.flash);
    const flash2 = extractNumber(t2.flash);
    rows.push(tableRow('Flash', t1.flash, t2.flash, flash1>flash2, flash2>flash1));

    const p1 = extractPrice(t1.price);
    const p2 = extractPrice(t2.price);
    // lower price is better (if both known)
    const priceWin1 = (p1 && p2) ? p1<p2 : false;
    const priceWin2 = (p1 && p2) ? p2<p1 : false;
    rows.push(tableRow('Cena (średnia)', t1.price, t2.price, priceWin1, priceWin2));

    // Qualitative rows (no win/lose by default)
    rows.push(tableRow('CPU', t1.cpu, t2.cpu, false, false));
    rows.push(tableRow('Tunery', t1.tuners, t2.tuners, false, false));
    rows.push(tableRow('Wideo', t1.resolution, t2.resolution, false, false));
    rows.push(tableRow('LAN', t1.lan, t2.lan, false, false));
    rows.push(tableRow('WiFi', t1.wifi, t2.wifi, false, false));
    rows.push(tableRow('Sloty', t1.slots, t2.slots, false, false));
    rows.push(tableRow('Porty', t1.ports, t2.ports, false, false));
    rows.push(tableRow('System', t1.os, t2.os, false, false));

    qs('#comparison-tbody').innerHTML = rows.join('');

    // AI-like recommendation (from base logic)
    generateAIAnalysis();

    const box = qs('#comparison-result');
    if(box) box.style.display = '';

    // scroll into view for convenience
    box?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function generateAIAnalysis(){
    const t1 = selectedTuner1;
    const t2 = selectedTuner2;
    const aiText = qs('#aiText');
    const recTag = qs('#recommendationTag');

    const price1 = extractPrice(t1.price);
    const price2 = extractPrice(t2.price);

    const score1 = calculateScore(t1);
    const score2 = calculateScore(t2);

    let analysis = '';
    let recommendation = '';

    if (score1 > score2) {
      analysis += `<strong>${esc(t1.brand)} ${esc(t1.model)}</strong> ma wyższą ocenę specyfikacji (wynik ${score1} vs ${score2}). `;
      recommendation = `Polecany wybór: ${t1.brand} ${t1.model}`;
    } else if (score2 > score1) {
      analysis += `<strong>${esc(t2.brand)} ${esc(t2.model)}</strong> ma wyższą ocenę specyfikacji (wynik ${score2} vs ${score1}). `;
      recommendation = `Polecany wybór: ${t2.brand} ${t2.model}`;
    } else {
      analysis += `Modele mają zbliżoną ocenę specyfikacji (wynik ${score1} vs ${score2}). `;
    }

    if (price1 && price2) {
      const ratio1 = score1 / price1;
      const ratio2 = score2 / price2;

      if (ratio1 > ratio2 * 1.05) {
        analysis += `<br><br><strong>Opłacalność:</strong> ${esc(t1.brand)} ${esc(t1.model)} wypada lepiej względem ceny.`;
        recommendation = `Najbardziej opłacalny: ${t1.brand} ${t1.model}`;
      } else if (ratio2 > ratio1 * 1.05) {
        analysis += `<br><br><strong>Opłacalność:</strong> ${esc(t2.brand)} ${esc(t2.model)} wypada lepiej względem ceny.`;
        recommendation = `Najbardziej opłacalny: ${t2.brand} ${t2.model}`;
      } else {
        analysis += `<br><br><strong>Opłacalność:</strong> podobna — wybierz pod preferencje (np. sloty, tunery).`;
      }
    }

    // Short highlights
    analysis += `<br><br><strong>Skrót:</strong> `
      + `RAM: ${esc(t1.ram)} vs ${esc(t2.ram)} • `
      + `Flash: ${esc(t1.flash)} vs ${esc(t2.flash)} • `
      + `Wideo: ${esc(t1.resolution)} vs ${esc(t2.resolution)}.`;

    if(aiText) aiText.innerHTML = analysis;
    if(recTag) recTag.textContent = recommendation || '—';
  }

  // ---------------------------
  // Boot
  // ---------------------------
  document.addEventListener('DOMContentLoaded', async ()=>{
    const loadedEl = qs('#tunersLoaded');
    const hostErr = (msg)=>{
      if(loadedEl) loadedEl.textContent = msg;
      const btn = qs('#compareBtn');
      if(btn) btn.disabled = true;
    };

    try{
      const data = await fetchJSONSmart();
      tunersList = normalizeData(data);

      if(!tunersList.length){
        hostErr('Brak danych tunerów (0).');
        return;
      }

      if(loadedEl) loadedEl.textContent = `Załadowano: ${tunersList.length} tunerów`;

      // Initial render
      refreshSelects();

      // Listeners
      qs('#tunerSearch')?.addEventListener('input', ()=>refreshSelects());

      qs('#tuner1-select')?.addEventListener('change', (e)=>{
        const id = e.target.value;
        selectedTuner1 = tunersList.find(t=>t.id===id) || null;
        qs('#tagsA').innerHTML = selectedTuner1 ? tagsHTML(selectedTuner1) : '';
        updateCompareButton();
      });

      qs('#tuner2-select')?.addEventListener('change', (e)=>{
        const id = e.target.value;
        selectedTuner2 = tunersList.find(t=>t.id===id) || null;
        qs('#tagsB').innerHTML = selectedTuner2 ? tagsHTML(selectedTuner2) : '';
        updateCompareButton();
      });

      qs('#compareBtn')?.addEventListener('click', compareTuners);

    }catch(e){
      console.error('[tuners] load failed', e);
      hostErr('Nie udało się wczytać bazy tunerów (data/tuners.json).');
    }
  });

})();