(function () {
  'use strict';

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  // -------------------------
  // i18n (auto by device; PL fallback)
  // -------------------------
  const LANG_KEY = 'aio_lang';

  function detectLang() {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'pl' || saved === 'en') return saved;
    const l = String(navigator.language || 'pl').toLowerCase();
    return l.startsWith('pl') ? 'pl' : 'en';
  }

  const lang = detectLang();
  document.documentElement.setAttribute('lang', lang);

  const dict = {
    pl: {
      nav_home: 'Start',
      nav_ai: 'AI-Chat Enigma2',
      nav_plugins: 'Wtyczki',
      nav_lists: 'Listy kanałów',
      nav_guides: 'Poradniki',
      nav_tools: 'Narzędzia',
      nav_downloads: 'Pobieranie',
      nav_systems: 'Systemy',
      nav_contact: 'Kontakt',
      nav_support: 'Wsparcie',
      nav_stats: 'Statystyki',
      nav_futurelab: 'Future Lab',

      cta_update: 'Aktualizacja: AIO Panel v5.0',
      cta_download: 'Pobierz teraz',

      updates: 'Nowości',
      support: 'Wesprzyj projekt',

      marquee_text:
        'Wesprzyj AIO‑IPTV — kawa pomaga rozwijać stronę i autorskie wtyczki: AIO Panel, IPTV Dream i inne.',
      marquee_cta: 'Postaw kawę',
      holiday:
        'Paweł Pawełek — życzy Zdrowych Wesołych Świąt',

      generator_hint: '# Zaznacz przynajmniej jedną opcję powyżej...',
      show_more: 'Pokaż więcej',
      show_less: 'Pokaż mniej',

      file_before: 'Plik „przed”',
      file_after: 'Plik „po”',
      compare: 'Porównaj',
      download_report: 'Pobierz raport',
      clear: 'Wyczyść',

      checklist_run: 'Uruchom testy',
      checklist_copy: 'Kopiuj komendy',

      srv_load_sample: 'Wczytaj próbkę',
      srv_upload: 'Wczytaj plik lamedb',
      srv_export: 'Eksport CSV',
      srv_search: 'Szukaj kanału / ServiceRef…'
    },
    en: {
      nav_home: 'Home',
      nav_ai: 'AI-Chat Enigma2',
      nav_plugins: 'Plugins',
      nav_lists: 'Channel lists',
      nav_guides: 'Guides',
      nav_tools: 'Tools',
      nav_downloads: 'Downloads',
      nav_systems: 'Systems',
      nav_contact: 'Contact',
      nav_support: 'Support',
      nav_stats: 'Stats',
      nav_futurelab: 'Future Lab',

      cta_update: 'Update: AIO Panel v5.0',
      cta_download: 'Download now',

      updates: 'Updates',
      support: 'Support the project',

      marquee_text:
        'Support AIO‑IPTV — coffee helps build the site and original plugins: AIO Panel, IPTV Dream and more.',
      marquee_cta: 'Buy coffee',
      holiday:
        'Paweł Pawełek — wishes you a joyful holiday season',

      generator_hint: '# Select at least one option above...',
      show_more: 'Show more',
      show_less: 'Show less',

      file_before: '“Before” file',
      file_after: '“After” file',
      compare: 'Compare',
      download_report: 'Download report',
      clear: 'Clear',

      checklist_run: 'Run tests',
      checklist_copy: 'Copy commands',

      srv_load_sample: 'Load sample',
      srv_upload: 'Load lamedb file',
      srv_export: 'Export CSV',
      srv_search: 'Search channel / ServiceRef…'
    }
  };

  function t(key) {
    return (dict[lang] && dict[lang][key]) || (dict.pl && dict.pl[key]) || '';
  }

  function applyI18n() {
    qsa('[data-i18n]').forEach((el) => {
      const k = el.getAttribute('data-i18n');
      const v = t(k);
      if (v) el.textContent = v;
    });
    qsa('[data-i18n-placeholder]').forEach((el) => {
      const k = el.getAttribute('data-i18n-placeholder');
      const v = t(k);
      if (v) el.setAttribute('placeholder', v);
    });
    qsa('[data-i18n-aria]').forEach((el) => {
      const k = el.getAttribute('data-i18n-aria');
      const v = t(k);
      if (v) el.setAttribute('aria-label', v);
    });
  }

  // -------------------------
  // Helpers
  // -------------------------
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, (m) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]
    );
  }

  window.copyToClipboard = async function (elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = (el.innerText || el.textContent || '').trim();
    if (!text) return;

    const btn = (function () {
      // Expected layout: <div id="..."> + <button class="copy-btn">
      const maybe = el.parentElement ? el.parentElement.querySelector('button.copy-btn') : null;
      return maybe;
    })();

    const flash = () => {
      if (!btn) return;
      const prev = btn.textContent;
      btn.textContent = lang === 'pl' ? '✅ Skopiowano!' : '✅ Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = prev;
        btn.classList.remove('copied');
      }, 1100);
    };

    try {
      await navigator.clipboard.writeText(text);
      flash();
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch (e) {
        // ignore
      }
      document.body.removeChild(ta);
      flash();
    }
  };

  // -------------------------
  // Mobile drawer
  // -------------------------
  function initDrawer() {
    const btn = qs('#navToggle');
    const drawer = qs('#mobileDrawer');
    const back = qs('#drawerBackdrop');
    if (!btn || !drawer || !back) return;

    const open = () => {
      drawer.classList.add('open');
      back.classList.add('open');
      document.body.style.overflow = 'hidden';
      drawer.setAttribute('aria-hidden', 'false');
    };
    const close = () => {
      drawer.classList.remove('open');
      back.classList.remove('open');
      document.body.style.overflow = '';
      drawer.setAttribute('aria-hidden', 'true');
    };

    btn.addEventListener('click', open);
    back.addEventListener('click', close);
    qsa('[data-drawer-close]').forEach((x) => x.addEventListener('click', close));
    qsa('a', drawer).forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  // -------------------------
  // Active nav
  // -------------------------
  function setActiveNav() {
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    qsa('.nav a').forEach((a) => {
      const href = String(a.getAttribute('href') || '').toLowerCase();
      if (href === path) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  // -------------------------
  // Notifications bell
  // -------------------------
  function initUpdates() {
    const bell = qs('#bellBtn');
    const panel = qs('#notifPanel');
    if (!bell || !panel) return;

    async function load() {
      try {
        const res = await fetch('./data/updates.json', { cache: 'no-store' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const items = await res.json();
        panel.innerHTML = `<div style="font-weight:900;margin:4px 6px 10px">${escapeHtml(t('updates'))}</div>`;
        (Array.isArray(items) ? items : []).slice(0, 14).forEach((it) => {
          const div = document.createElement('div');
          div.className = 'notif-item';
          div.innerHTML = `
            <div style="width:26px;opacity:.9">🔔</div>
            <div>
              <div style="font-weight:900">${escapeHtml(it.title || '')}</div>
              <div class="date">${escapeHtml(it.date || '')}</div>
              ${it.details ? `<div style="margin-top:6px;opacity:.85;line-height:1.35">${escapeHtml(it.details)}</div>` : ''}
            </div>
          `;
          panel.appendChild(div);
        });
      } catch (e) {
        panel.innerHTML = `<div class="notif-item"><div>⚠️</div><div>${lang === 'pl' ? 'Nie udało się wczytać aktualizacji.' : 'Failed to load updates.'}</div></div>`;
      }
    }

    const toggle = async () => {
      if (!panel.dataset.loaded) {
        await load();
        panel.dataset.loaded = '1';
      }
      panel.classList.toggle('open');
    };

    bell.addEventListener('click', toggle);
    document.addEventListener('click', (e) => {
      if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== bell) {
        panel.classList.remove('open');
      }
    });
  }

  // -------------------------
  // PayPal obfuscation (personal)
  // -------------------------
  function initPayPal() {
    const btn = qs('#paypalSupportBtn');
    if (!btn) return;
    try {
      const b64 = btn.getAttribute('data-paypal');
      if (!b64) return;
      btn.setAttribute('href', atob(b64));
    } catch (_) {
      // ignore
    }
  }

  // -------------------------
  // Top marquee (coffee + holiday)
  // -------------------------
  function initMarquee() {
    if (qs('#aioMarqueeBar')) return;

    const bar = document.createElement('div');
    bar.className = 'marquee-bar';
    bar.id = 'aioMarqueeBar';
    bar.innerHTML = `
      <div class="container">
        <div class="marquee-inner">
          <span class="marquee-pill">☕</span>
          <div class="marquee-track" aria-label="marquee">
            <div class="marquee-text">${escapeHtml(t('marquee_text'))}</div>
            <div class="marquee-text">${escapeHtml(t('holiday'))}</div>
          </div>
          <a class="marquee-cta" href="support.html">${escapeHtml(t('marquee_cta'))}</a>
        </div>
      </div>
    `;

    document.body.insertBefore(bar, document.body.firstChild);
  }

  // -------------------------
  

  // (external visit counter removed)

// AI-Chat Enigma2 (drawer, offline KB + optional online endpoint)
  // -----------------------------
  function injectAIChatMarkup() {
    if (document.getElementById('ai-chat-fab')) return;

    const fab = document.createElement('button');
    fab.id = 'ai-chat-fab';
    fab.className = 'ai-fab';
    fab.type = 'button';
    fab.setAttribute('aria-label', 'AI Chat');
    fab.innerHTML = '<span class="ai-fab__icon">🤖</span><span class="ai-fab__text">AI Chat</span>';
    document.body.appendChild(fab);

    const backdrop = document.createElement('div');
    backdrop.id = 'ai-chat-backdrop';
    backdrop.className = 'ai-backdrop';
    document.body.appendChild(backdrop);

    const drawer = document.createElement('div');
    drawer.id = 'ai-chat-drawer';
    drawer.className = 'ai-drawer';
    drawer.innerHTML = `
      <div class="ai-drawer__head">
        <div class="ai-drawer__title">AI‑Chat Enigma2</div>
        <button type="button" class="ai-drawer__close" id="ai-chat-close" aria-label="Zamknij">✕</button>
      </div>
      <div class="ai-drawer__meta" id="ai-chat-meta"></div>
      <div class="ai-drawer__messages" id="aiChatMessages"></div>
      <form class="ai-drawer__form" id="aiChatForm" autocomplete="off">
        <input id="aiChatInput" class="ai-drawer__input" type="text" placeholder="Zadaj pytanie o Enigma2…" />
        <button class="ai-drawer__send" type="submit">Wyślij</button>
      </form>
      <div class="ai-drawer__hint">Podpowiedź: pytaj np. „jak zainstalować softcam feed?” albo „gdzie są picony?”.</div>
    `;
    document.body.appendChild(drawer);
  }

  function setAIChatOpen(open) {
    const drawer = document.getElementById('ai-chat-drawer');
    const backdrop = document.getElementById('ai-chat-backdrop');
    if (!drawer || !backdrop) return;
    drawer.classList.toggle('is-open', !!open);
    backdrop.classList.toggle('is-open', !!open);
    document.documentElement.classList.toggle('ai-lock', !!open);
  }

  function normText(s) {
    return (s || '').toString().toLowerCase()
      .replace(/[ąć]/g,'a').replace(/[ę]/g,'e').replace(/[ł]/g,'l')
      .replace(/[ń]/g,'n').replace(/[ó]/g,'o').replace(/[ś]/g,'s')
      .replace(/[żź]/g,'z')
      .replace(/[^a-z0-9\s_-]/g,' ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function scoreKBItem(item, q) {
    const nq = normText(q);
    if (!nq) return 0;
    const words = nq.split(' ').filter(w => w.length > 2).slice(0, 8);

    const title = normText(item.title);
    const tags = (item.tags || []).map(normText).join(' ');
    const summary = normText(item.summary);
    const body = normText((item.content || []).join(' '));

    let s = 0;
    for (const w of words) {
      if (title.includes(w)) s += 6;
      if (tags.includes(w)) s += 4;
      if (summary.includes(w)) s += 2;
      if (body.includes(w)) s += 1;
    }
    return s;
  }

  function buildOfflineReply(q, kb) {
    const scored = (kb || [])
      .map(it => ({ it, score: scoreKBItem(it, q) }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (!scored.length) {
      return [
        'Nie znalazłem dokładnej odpowiedzi w bazie offline.',
        'Spróbuj doprecyzować: model tunera / image (OpenATV/OpenPLi) / błąd z logu.',
        'Jeżeli masz tryb ONLINE (API), ustaw go w data/aichat_config.json.'
      ];
    }

    const out = [];
    out.push(`Znalazłem w bazie offline ${scored.length} pasujące tematy:`);
    scored.forEach((x, i) => {
      out.push(`${i + 1}) ${x.it.title}`);
      if (x.it.summary) out.push(`— ${x.it.summary}`);
      const cmds = (x.it.commands || []).slice(0, 3);
      if (cmds.length) {
        out.push('Polecenia (przykłady):');
        cmds.forEach(c => out.push(`$ ${c}`));
      }
    });
    return out;
  }

  function renderChatMessage(role, text) {
    const messages = document.getElementById('aiChatMessages');
    if (!messages) return;
    const el = document.createElement('div');
    el.className = 'ai-msg ' + (role === 'user' ? 'ai-msg--user' : 'ai-msg--bot');
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  async function safeFetchJSON(url) {
    const u = new URL(url, document.baseURI).toString();
    const res = await fetch(u, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  // -----------------------------
  // Google Analytics 4 (GA4)
  // -----------------------------
  async function initAnalytics() {
    try {
      const cfg = await safeFetchJSON('./data/analytics_config.json');
      window.__AIO_ANALYTICS_CONFIG = cfg || {};
      const mid = String((cfg && (cfg.measurement_id || cfg.measurementId)) || '').trim();
      if (!mid) return;

      if (document.querySelector('script[data-ga4="gtag"]')) return;

      const s1 = document.createElement('script');
      s1.async = true;
      s1.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(mid);
      s1.setAttribute('data-ga4', 'gtag');
      document.head.appendChild(s1);

      const s2 = document.createElement('script');
      s2.setAttribute('data-ga4', 'gtag');
      s2.text = [
        'window.dataLayer = window.dataLayer || [];',
        'function gtag(){dataLayer.push(arguments);}',
        "gtag('js', new Date());",
        "gtag('config', '" + mid.replace(/'/g, "\\'") + "', { anonymize_ip: true });"
      ].join('\n');
      document.head.appendChild(s2);
    } catch (e) {
      // ignore
    }
  }


  async function initAIChatDrawer() {
    injectAIChatMarkup();

    const fab = document.getElementById('ai-chat-fab');
    const closeBtn = document.getElementById('ai-chat-close');
    const backdrop = document.getElementById('ai-chat-backdrop');

    fab && fab.addEventListener('click', () => setAIChatOpen(true));
    closeBtn && closeBtn.addEventListener('click', () => setAIChatOpen(false));
    backdrop && backdrop.addEventListener('click', () => setAIChatOpen(false));

    const form = document.getElementById('aiChatForm');
    const input = document.getElementById('aiChatInput');
    const meta = document.getElementById('ai-chat-meta');

    let cfg = { mode: 'offline', endpoint: '', apikey: '', supabase_url: '', supabase_anon_key: '', function: 'ai-chat' };
    try { cfg = await safeFetchJSON('./data/aichat_config.json'); } catch (e) { cfg = cfg || {}; }

    const endpoint = String(
      (cfg && cfg.endpoint) ||
      ((cfg && cfg.supabase_url) ? (String(cfg.supabase_url).replace(/\/$/, '') + '/functions/v1/' + (cfg.function || 'ai-chat')) : '') ||
      ''
    ).trim();

    const apikey = String((cfg && (cfg.apikey || cfg.supabase_anon_key)) || '').trim();
    const onlineEnabled = (String(cfg && cfg.mode || '').toLowerCase() === 'online') && !!endpoint;

    meta.textContent = onlineEnabled ? 'Tryb: ONLINE' : 'Tryb: OFFLINE (baza wiedzy)';

    let kb = [];
    try { kb = await safeFetchJSON('./data/knowledge.json'); } catch (e) { kb = []; }

    form && form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const q = (input && input.value || '').trim();
      if (!q) return;
      if (input) input.value = '';
      renderChatMessage('user', q);

      if (onlineEnabled) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/json' }, apikey ? { apikey: apikey, Authorization: 'Bearer ' + apikey } : {}),
            body: JSON.stringify({ message: q, source: 'aio-iptv', locale: getLang() })
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const data = await res.json();
          const reply = (data.reply || data.text || '').toString().trim();
          renderChatMessage('bot', reply || 'Brak odpowiedzi z endpointu.');
          return;
        } catch (e) {
          renderChatMessage('bot', 'Nie udało się połączyć z trybem ONLINE. Odpowiadam z bazy offline.');
        }
      }

      // offline fallback
      const lines = buildOfflineReply(q, kb);
      lines.forEach(l => renderChatMessage('bot', l));
    });
  }


document.addEventListener('DOMContentLoaded', () => {
    applyI18n();
    initAnalytics();
    initDrawer();
    setActiveNav();
    initUpdates();
    initPayPal();
    initMarquee();
    initAIChatDrawer();
    initOneLinerGenerator();
  });
})();
