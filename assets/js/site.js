(function () {
  'use strict';

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  // -----------------------------
  // Base URL helpers (GitHub Pages safe)
  // -----------------------------
  function getRootBase() {
    try {
      const cs = document.currentScript;
      if (cs && cs.src) {
        const u = new URL(cs.src);
        // strip ".../assets/js/site.js"
        u.pathname = u.pathname.replace(/\/assets\/js\/site\.js(\?.*)?$/i, '/');
        u.search = '';
        u.hash = '';
        return u.toString();
      }
    } catch (_) {}
    // fallback: document base
    return new URL('.', document.baseURI).toString();
  }
  const ROOT = getRootBase();
  const absRoot = (p) => new URL(p.replace(/^\//, ''), ROOT).toString();

  // -----------------------------
  // Lightweight i18n
  // -----------------------------
  const LANG_KEY = 'aio_lang';
  const lang = (() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'pl' || saved === 'en') return saved;
    const l = String(navigator.language || 'pl').toLowerCase();
    return l.startsWith('pl') ? 'pl' : 'en';
  })();
  document.documentElement.setAttribute('lang', lang);

  // -----------------------------
  // Safe fetch utilities
  // -----------------------------
  async function safeFetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }
  async function safeFetchText(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.text();
  }
  async function postJSON(url, payload, headers = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(payload)
    });
    const txt = await res.text();
    let data = null;
    try { data = JSON.parse(txt); } catch (_) { data = { text: txt }; }
    if (!res.ok) {
      const msg = (data && (data.error || data.message)) || ('HTTP ' + res.status);
      throw new Error(msg);
    }
    return data;
  }

  // -----------------------------
  // Inject small CSS patch for accordions (non-invasive)
  // -----------------------------
  (function injectAccordionCSS() {
    if (qs('link[data-aio-accordion-css]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = absRoot('assets/css/accordion-fix.css') + '?v=' + Date.now();
    link.setAttribute('data-aio-accordion-css', '1');
    document.head.appendChild(link);
  })();

  // -----------------------------
  // Accordion / FAQ / Guides: universal toggle
  // Supports many markups:
  // - <details><summary>...</summary>...</details> (native)
  // - .accordion-item with a header/button and a content panel
  // - button[aria-controls="..."] controlling an element id
  // -----------------------------
  function findAccordionParts(headerEl) {
    // 1) aria-controls
    const ctrl = headerEl.getAttribute && headerEl.getAttribute('aria-controls');
    if (ctrl) {
      const panel = document.getElementById(ctrl);
      if (panel) return { item: headerEl.closest('.accordion-item, .faq-item, .guide-item, .kb-item') || headerEl, panel };
    }
    // 2) closest item container + find common panel selectors
    const item = headerEl.closest('.accordion-item, .faq-item, .guide-item, .kb-item, .accordion, .faq, .guide') || headerEl.parentElement;
    if (!item) return null;

    const panel =
      qs('.accordion-panel, .accordion-content, .accordion-body, .panel, .content, .answer, .body', item) ||
      (headerEl.nextElementSibling && headerEl.nextElementSibling.matches('.accordion-panel, .accordion-content, .accordion-body, .panel, .content, .answer, .body') ? headerEl.nextElementSibling : null);

    if (!panel) return null;
    return { item, panel };
  }

  function setPanelOpen(item, panel, open) {
    item.classList.toggle('is-open', open);
    panel.classList.toggle('is-open', open);

    // smooth height transition if the panel uses max-height technique
    panel.style.overflow = 'hidden';
    panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';
    panel.style.opacity = open ? '1' : '0';
    panel.style.pointerEvents = open ? 'auto' : 'none';

    // accessibility
    const header = qs('[aria-expanded]', item);
    if (header) header.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function initAccordions() {
    // Prepare panels initial state
    qsa('.accordion-panel, .accordion-content, .accordion-body, .panel, .answer, .content').forEach((p) => {
      const item = p.closest('.accordion-item, .faq-item, .guide-item, .kb-item');
      if (!item) return;
      const open = item.classList.contains('is-open') || item.classList.contains('open');
      p.style.maxHeight = open ? p.scrollHeight + 'px' : '0px';
      p.style.overflow = 'hidden';
      p.style.opacity = open ? '1' : '0';
      p.style.pointerEvents = open ? 'auto' : 'none';
    });

    document.addEventListener('click', (ev) => {
      const header = ev.target.closest(
        'summary, .accordion-header, .accordion-title, .faq-q, .faq-question, .guide-title, .kb-title, .acc-header, button[aria-controls], button[data-accordion], [data-accordion-header]'
      );
      if (!header) return;

      // Native <details> case: ensure it works even if CSS tries to hide it
      if (header.tagName && header.tagName.toLowerCase() === 'summary') {
        const details = header.closest('details');
        if (details) {
          // Let browser toggle open; then adjust any custom panels inside
          setTimeout(() => {
            const open = details.hasAttribute('open');
            details.classList.toggle('is-open', open);
          }, 0);
        }
        return;
      }

      const parts = findAccordionParts(header);
      if (!parts) return;

      ev.preventDefault();
      const { item, panel } = parts;
      const isOpen = item.classList.contains('is-open') || panel.classList.contains('is-open');

      // If it's within a group and you want "single open", uncomment:
      // const group = item.parentElement && item.parentElement.matches('.accordion-group, .faq-list, .guide-list') ? item.parentElement : null;
      // if (group) qsa('.accordion-item.is-open, .faq-item.is-open, .guide-item.is-open, .kb-item.is-open', group).forEach(x => { if (x!==item){ const p=qs('.accordion-panel,.accordion-content,.accordion-body,.panel,.content,.answer',x); if(p) setPanelOpen(x,p,false);} });

      setPanelOpen(item, panel, !isOpen);
    });

    // Recalculate heights on resize
    window.addEventListener('resize', () => {
      qsa('.accordion-item.is-open, .faq-item.is-open, .guide-item.is-open, .kb-item.is-open').forEach((item) => {
        const panel = qs('.accordion-panel, .accordion-content, .accordion-body, .panel, .content, .answer', item);
        if (panel) panel.style.maxHeight = panel.scrollHeight + 'px';
      });
    });
  }

  // -----------------------------
  // AI-Chat widget (config + online/offline)
  // -----------------------------
  async function initAiChat() {
    const fab = qs('#aichatFab, .aichat-fab, [data-aichat-fab]');
    const panel = qs('#aichatPanel, .aichat-panel, [data-aichat-panel]');
    const form = qs('#aichatForm, form[data-aichat-form]');
    const input = qs('#aichatInput, input[data-aichat-input], textarea[data-aichat-input]');
    const messages = qs('#aichatMessages, .aichat-messages, [data-aichat-messages]');
    const meta = qs('#aichatMeta, .aichat-meta, [data-aichat-meta]');
    if (!panel || !form || !input || !messages) return;

    // render helpers
    const escapeHtml = (s) =>
      String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
    function render(role, text) {
      const bubble = document.createElement('div');
      bubble.className = 'aichat-msg ' + (role === 'user' ? 'user' : 'bot');
      bubble.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');
      messages.appendChild(bubble);
      messages.scrollTop = messages.scrollHeight;
    }

    // load config with robust fallbacks
    let cfg = { mode: 'offline', endpoint: '' };
    const cfgUrls = [
      absRoot('data/aichat_config.json'),
      new URL('data/aichat_config.json', document.baseURI).toString(),
      new URL('./data/aichat_config.json', document.baseURI).toString()
    ];
    for (const u of cfgUrls) {
      try {
        cfg = await safeFetchJSON(u + (u.includes('?') ? '&' : '?') + 'v=' + Date.now());
        break;
      } catch (_) {}
    }

    const isOnline = String(cfg.mode || '').toLowerCase() === 'online' && String(cfg.endpoint || '').trim();
    if (meta) meta.textContent = isOnline ? (lang === 'pl' ? 'Tryb: ONLINE' : 'Mode: ONLINE') : (lang === 'pl' ? 'Tryb: OFFLINE (baza wiedzy)' : 'Mode: OFFLINE (knowledge base)');

    // load offline KB (optional)
    let kb = [];
    try {
      const kbData = await safeFetchJSON(absRoot('data/knowledge.json') + '?v=' + Date.now());
      kb = Array.isArray(kbData) ? kbData : Array.isArray(kbData.items) ? kbData.items : Array.isArray(kbData.knowledge) ? kbData.knowledge : [];
    } catch (_) {
      kb = [];
    }

    function offlineAnswer(q) {
      const query = String(q || '').toLowerCase();
      if (!query || kb.length === 0) {
        return lang === 'pl'
          ? 'Nie znalazłem dokładnej odpowiedzi w bazie offline.\nSpróbuj doprecyzować: model tunera / image (OpenATV/OpenPLi) / błąd z logu.'
          : 'I could not find an exact match in the offline KB.\nTry adding: tuner model / image (OpenATV/OpenPLi) / error from logs.';
      }
      // very simple scoring by title/keywords/summary
      const scored = kb
        .map((it) => {
          const t = String(it.title || '').toLowerCase();
          const s = String(it.summary || it.text || '').toLowerCase();
          const k = Array.isArray(it.tags) ? it.tags.join(' ').toLowerCase() : '';
          let score = 0;
          if (t.includes(query)) score += 5;
          if (k.includes(query)) score += 3;
          if (s.includes(query)) score += 2;
          return { it, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      if (!scored.length) {
        return lang === 'pl'
          ? 'Nie znalazłem dokładnej odpowiedzi w bazie offline.\nSpróbuj doprecyzować: model tunera / image (OpenATV/OpenPLi) / błąd z logu.'
          : 'I could not find an exact match in the offline KB.\nTry adding: tuner model / image (OpenATV/OpenPLi) / error from logs.';
      }

      const out = [];
      out.push(lang === 'pl' ? 'Najbardziej pasujące tematy:' : 'Best matching topics:');
      scored.forEach((x, i) => {
        out.push(`${i + 1}) ${x.it.title || ''}`);
        const body = x.it.body || x.it.text || x.it.answer || x.it.content || '';
        if (body) out.push(String(body).slice(0, 600));
      });
      return out.join('\n');
    }

    async function askOnline(question) {
      const ep = String(cfg.endpoint || '').trim();
      if (!ep) throw new Error('No endpoint');

      const headers = {};
      if (cfg.apikey) headers.apikey = String(cfg.apikey);
      if (cfg.anon_key) headers.Authorization = 'Bearer ' + String(cfg.anon_key);

      const payload = { query: question, message: question, lang };
      const data = await postJSON(ep, payload, headers);
      const reply = data.reply || data.text || data.answer || data.output || '';
      return String(reply || '').trim();
    }

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const q = String(input.value || '').trim();
      if (!q) return;
      input.value = '';
      render('user', q);

      if (isOnline) {
        try {
          const r = await askOnline(q);
          if (r) {
            render('bot', r);
            return;
          }
        } catch (_) {
          render('bot', lang === 'pl' ? 'Nie udało się połączyć z trybem ONLINE. Odpowiadam z bazy offline.' : 'Could not reach ONLINE mode. Answering from offline KB.');
        }
      }
      render('bot', offlineAnswer(q));
    });

    // Allow opening/closing panel via FAB (if present)
    if (fab) {
      fab.addEventListener('click', () => {
        panel.classList.toggle('open');
      });
    }
  }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    try { initAccordions(); } catch (e) { console.warn('Accordion init failed', e); }
    try { initAiChat(); } catch (e) { console.warn('AI-Chat init failed', e); }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();