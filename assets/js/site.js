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

  function getLang() {
    return lang;
  }

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

      // AI Chat
      ai_placeholder: 'Zadaj pytanie o Enigma2…',
      ai_send: 'Wyślij',
      ai_hint: 'Podpowiedź: pytaj np. „jak zainstalować softcam feed?” albo „gdzie są picony?”.',
      ai_mode_offline: 'Tryb: OFFLINE (baza wiedzy)',
      ai_mode_online: 'Tryb: ONLINE'
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

      // AI Chat
      ai_placeholder: 'Ask about Enigma2…',
      ai_send: 'Send',
      ai_hint: 'Tip: ask “how to install softcam feed?” or “where are picons?”.',
      ai_mode_offline: 'Mode: OFFLINE (knowledge base)',
      ai_mode_online: 'Mode: ONLINE'
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

  function relUrl(path) {
    // Works on GitHub Pages subpaths
    return new URL(path, document.baseURI).toString();
  }

  async function safeFetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  // Helper to ensure Supabase is loaded (Moved to top scope to fix errors)
  function ensureSupabaseV2() {
    return new Promise((resolve) => {
      if (window.supabase && typeof window.supabase.createClient === 'function') return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.async = true;
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.head.appendChild(s);
    });
  }

  window.copyToClipboard = async function (elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = (el.innerText || el.textContent || '').trim();
    if (!text) return;

    const btn = (function () {
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
      } catch (e) {}
      document.body.removeChild(ta);
      flash();
    }
  };

  // -------------------------
  // Analytics (GA4 tag injection)
  // -------------------------
  async function initAnalytics() {
    try {
      const cfg = await safeFetchJSON(relUrl('data/analytics_config.json'));
      const mid = (cfg && cfg.measurement_id) ? String(cfg.measurement_id).trim() : '';
      if (!mid) return;

      if (window.__aioGtagLoaded) return;

      window.dataLayer = window.dataLayer || [];
      function gtag(){ window.dataLayer.push(arguments); }
      window.gtag = window.gtag || gtag;

      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(mid);
      document.head.appendChild(s);

      gtag('js', new Date());
      gtag('config', mid, { anonymize_ip: true });

      window.__aioGtagLoaded = true;
    } catch (_) {
      // ignore
    }
  }

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
  function parseTs(it) {
    if (typeof it.ts === 'number' && isFinite(it.ts)) return it.ts;
    const d = Date.parse(it.date || '');
    return isNaN(d) ? 0 : d;
  }

  function iconForType(type) {
    const t = String(type || '').toLowerCase();
    if (t === 'fix') return '🛠';
    if (t === 'feature') return '✨';
    if (t === 'change') return '🔁';
    if (t === 'release') return '📦';
    return '🔔';
  }

  function initUpdates() {
    const bell = qs('#bellBtn');
    const panel = qs('#notifPanel');
    if (!bell || !panel) return;

    let badge = bell.querySelector('.bell-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'bell-badge';
      badge.style.display = 'none';
      bell.appendChild(badge);
    }

    const SEEN_KEY = 'aio_updates_seen_ts';
    const seenTs = () => Number(localStorage.getItem(SEEN_KEY) || '0') || 0;
    const setSeen = (ts) => localStorage.setItem(SEEN_KEY, String(ts || 0));

    let cachedItems = null;

    async function load() {
      try {
        const items = await safeFetchJSON(relUrl('data/updates.json'));
        cachedItems = Array.isArray(items) ? items : [];
        const newest = cachedItems.reduce((m, x) => Math.max(m, parseTs(x)), 0);
        const unread = cachedItems.filter((x) => parseTs(x) > seenTs()).length;

        if (unread > 0) {
          badge.textContent = unread > 99 ? '99+' : String(unread);
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }

        panel.innerHTML = `<div class="notif-title">${escapeHtml(t('updates'))}</div>`;
        cachedItems
          .slice()
          .sort((a, b) => parseTs(b) - parseTs(a))
          .slice(0, 20)
          .forEach((it) => {
            const div = document.createElement('div');
            div.className = 'notif-item';
            const ic = iconForType(it.type);
            div.innerHTML = `
              <div class="notif-ic">${escapeHtml(ic)}</div>
              <div>
                <div class="notif-h">${escapeHtml(it.title || '')}</div>
                <div class="date">${escapeHtml(it.date || '')}</div>
                ${it.details ? `<div class="notif-d">${escapeHtml(it.details)}</div>` : ''}
              </div>
            `;
            panel.appendChild(div);
          });

        panel.dataset.newestTs = String(newest || 0);
      } catch (e) {
        panel.innerHTML = `<div class="notif-item"><div>⚠️</div><div>${lang === 'pl' ? 'Nie udało się wczytać aktualizacji.' : 'Failed to load updates.'}</div></div>`;
      }
    }

    const openPanel = async () => {
      if (!panel.dataset.loaded) {
        await load();
        panel.dataset.loaded = '1';
      }
      panel.classList.add('open');
      const newest = Number(panel.dataset.newestTs || '0') || 0;
      if (newest > 0) setSeen(newest);
      badge.style.display = 'none';
    };

    const closePanel = () => panel.classList.remove('open');

    bell.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (panel.classList.contains('open')) closePanel();
      else await openPanel();
    });

    document.addEventListener('click', (e) => {
      if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== bell) {
        closePanel();
      }
    });

    load().catch(() => {});
  }

  // -------------------------
  // PayPal obfuscation
  // -------------------------
  function initPayPal() {
    const btn = qs('#paypalSupportBtn');
    if (!btn) return;
    try {
      const b64 = btn.getAttribute('data-paypal');
      if (!b64) return;
      btn.setAttribute('href', atob(b64));
    } catch (_) {}
  }

  // -------------------------
  // Top marquee
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

  // -----------------------------
  // AI-Chat Enigma2
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
        <button type="button" class="ai-drawer__close" id="ai-chat-close" aria-label="Close">✕</button>
      </div>
      <div class="ai-drawer__meta" id="ai-chat-meta"></div>
      <div class="ai-drawer__messages" id="aiChatMessages"></div>
      <form class="ai-drawer__form" id="aiChatForm" autocomplete="off">
        <input id="aiChatInput" class="ai-drawer__input" type="text" data-i18n-placeholder="ai_placeholder" placeholder="${escapeHtml(t('ai_placeholder'))}" />
        <button class="ai-drawer__send" type="submit" data-i18n="ai_send">${escapeHtml(t('ai_send'))}</button>
      </form>
      <div class="ai-drawer__hint" data-i18n="ai_hint">${escapeHtml(t('ai_hint'))}</div>
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
    return (s || '')
      .toString()
      .toLowerCase()
      .replace(/[ąć]/g, 'a')
      .replace(/[ę]/g, 'e')
      .replace(/[ł]/g, 'l')
      .replace(/[ń]/g, 'n')
      .replace(/[ó]/g, 'o')
      .replace(/[ś]/g, 's')
      .replace(/[żź]/g, 'z')
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function scoreKBItem(item, q) {
    const nq = normText(q);
    if (!nq) return 0;
    const words = nq.split(' ').filter((w) => w.length > 2).slice(0, 8);

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
      .map((it) => ({ it, score: scoreKBItem(it, q) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    if (!scored.length) {
      return [
        lang === 'pl'
          ? 'Nie znalazłem dokładnej odpowiedzi w bazie offline.'
          : 'I could not find an exact answer in the offline knowledge base.',
        lang === 'pl'
          ? 'Spróbuj doprecyzować: model tunera / image (OpenATV/OpenPLi) / błąd z logu.'
          : 'Try to уточнить: receiver model / image (OpenATV/OpenPLi) / error log.',
        lang === 'pl'
          ? 'Jeżeli masz tryb ONLINE (API), skonfiguruj go w data/aichat_config.json.'
          : 'If you have ONLINE mode (API), configure it in data/aichat_config.json.'
      ];
    }

    const out = [];
    out.push(
      (lang === 'pl' ? 'Znalazłem w bazie offline ' : 'Found in offline KB ') +
        scored.length +
        (lang === 'pl' ? ' pasujące tematy:' : ' matching topics:')
    );
    scored.forEach((x, i) => {
      out.push(`${i + 1}) ${x.it.title}`);
      if (x.it.summary) out.push(`— ${x.it.summary}`);
      const cmds = (x.it.commands || []).slice(0, 3);
      if (cmds.length) {
        out.push(lang === 'pl' ? 'Polecenia (przykłady):' : 'Commands (examples):');
        cmds.forEach((c) => out.push(`$ ${c}`));
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

  function makeOnlineClient(cfg) {
    const supa = cfg && cfg.supabase ? cfg.supabase : null;
    if (cfg && cfg.mode === 'online' && supa && supa.url && supa.anonKey) {
      const fn = supa.function || 'ai-chat';
      const endpoint = String(supa.url).replace(/\/+$/, '') + '/functions/v1/' + fn;
      const headers = {
        'Content-Type': 'application/json',
        apikey: String(supa.anonKey),
        Authorization: 'Bearer ' + String(supa.anonKey)
      };
      return { endpoint, headers };
    }

    if (cfg && cfg.mode === 'online' && cfg.endpoint) {
      const headers = Object.assign({ 'Content-Type': 'application/json' }, cfg.headers || {});
      return { endpoint: cfg.endpoint, headers };
    }

    return null;
  }

  async function initAIChatDrawer() {
    injectAIChatMarkup();
    applyI18n();

    const fab = document.getElementById('ai-chat-fab');
    const closeBtn = document.getElementById('ai-chat-close');
    const backdrop = document.getElementById('ai-chat-backdrop');

    fab && fab.addEventListener('click', () => setAIChatOpen(true));
    closeBtn && closeBtn.addEventListener('click', () => setAIChatOpen(false));
    backdrop && backdrop.addEventListener('click', () => setAIChatOpen(false));

    const form = document.getElementById('aiChatForm');
    const input = document.getElementById('aiChatInput');
    const meta = document.getElementById('ai-chat-meta');

    let cfg = { mode: 'offline' };
    try {
      cfg = await safeFetchJSON(relUrl('data/aichat_config.json'));
    } catch (_) {}

    const online = makeOnlineClient(cfg);
    meta.textContent = online ? t('ai_mode_online') : t('ai_mode_offline');

    let kb = [];
    try {
      kb = await safeFetchJSON(relUrl('data/knowledge.json'));
    } catch (_) {
      kb = [];
    }

    form &&
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const q = (input && input.value) || '';
        const query = q.trim();
        if (!query) return;
        if (input) input.value = '';
        renderChatMessage('user', query);

        if (online) {
          try {
            const res = await fetch(online.endpoint, {
              method: 'POST',
              headers: online.headers,
              body: JSON.stringify({ query: query, message: query, source: 'aio-iptv', locale: getLang() })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const reply = (data.reply || data.text || data.message || '').toString().trim();
            renderChatMessage('bot', reply || (lang === 'pl' ? 'Brak odpowiedzi z endpointu.' : 'No response from endpoint.'));
            return;
          } catch (e) {
            renderChatMessage(
              'bot',
              lang === 'pl'
                ? 'Nie udało się połączyć z trybem ONLINE. Odpowiadam z bazy offline.'
                : 'Failed to reach ONLINE mode. Falling back to offline KB.'
            );
          }
        }

        const lines = buildOfflineReply(query, kb);
        lines.forEach((l) => renderChatMessage('bot', l));
      });
  }

  // -------------------------
  // One-liner generator
  // -------------------------
  function initOneLinerGenerator() {
    const output = qs('#generator-output');
    if (!output) return;

    const checks = qsa('input[type="checkbox"][data-target]');
    if (!checks.length) return;

    const update = () => {
      const parts = [];
      for (const cb of checks) {
        if (!cb.checked) continue;
        const tid = cb.getAttribute('data-target');
        const src = tid ? document.getElementById(tid) : null;
        const txt = src ? String(src.innerText || src.textContent || '').trim() : '';
        if (txt) parts.push(txt);
      }
      output.textContent = parts.length ? parts.join(' && ') : t('generator_hint');
    };

    checks.forEach((cb) => cb.addEventListener('change', update));
    update();
  }

  // -------------------------
  // Mobile header icons (brightness fix & layout)
  // -------------------------
  function findCoffeeBtn() {
    const header = qs('.topbar') || qs('header') || document;
    const candidates = qsa('a,button', header);
    const score = (el) => {
      const t = (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '') + ' ' + (el.getAttribute('href') || '') + ' ' + (el.textContent || '');
      const s = t.toLowerCase();
      let p = 0;
      if (s.includes('kawa') || s.includes('coffee')) p += 4;
      if (s.includes('wspar') || s.includes('support')) p += 3;
      if ((el.textContent || '').includes('☕')) p += 5;
      if ((el.className || '').toLowerCase().includes('coffee')) p += 3;
      return p;
    };
    let best = null, bestP = 0;
    for (const el of candidates) {
      const p = score(el);
      if (p > bestP) { bestP = p; best = el; }
    }
    return bestP >= 3 ? best : null;
  }

  function initMobileHeaderIcons() {
    const mq = window.matchMedia('(max-width: 820px)');
    const isPortrait = () => window.innerHeight > window.innerWidth;

    const moved = new Map();
    const store = (el) => {
      if (!el || moved.has(el) || !el.parentNode) return;
      moved.set(el, { parent: el.parentNode, next: el.nextSibling });
    };

    const nav = () => qs('.nav');
    const hideNav = () => {
      const n = nav();
      if (!n) return;
      if (!n.dataset.origDisplay) n.dataset.origDisplay = n.style.display || '';
      n.style.display = 'none';
    };
    const restoreNav = () => {
      const n = nav();
      if (!n) return;
      if (n.dataset.origDisplay !== undefined) n.style.display = n.dataset.origDisplay;
      else n.style.display = '';
    };

    const restore = () => {
      const row = qs('#mobileIconRow');
      if (row) row.remove();
      for (const [el, info] of moved.entries()) {
        if (info.parent) info.parent.insertBefore(el, info.next || null);
        if (el && el.id === 'navToggle') {
          el.style.filter = '';
          el.style.opacity = '';
        }
      }
      moved.clear();
      restoreNav();
    };

    const apply = () => {
      if (!(mq.matches && isPortrait())) {
        restore();
        return;
      }

      const topInner = qs('.topbar-inner') || qs('.topbar') || qs('header');
      if (!topInner) return;

      const bell = qs('#bellBtn') || qs('#newsBellBtn') || qs('#notifBtn') || qs('.bell-btn');
      const menu = qs('#navToggle') || qs('.nav-toggle') || qs('button[aria-label*="Menu"]');
      const coffee = findCoffeeBtn();

      if (!menu || !coffee) {
        hideNav();
        return;
      }

      store(bell);
      store(menu);
      store(coffee);

      let row = qs('#mobileIconRow');
      if (!row) {
        row = document.createElement('div');
        row.id = 'mobileIconRow';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px';
        row.style.marginRight = '10px';
      }

      topInner.insertBefore(row, topInner.firstChild);

      if (bell) row.appendChild(bell);
      row.appendChild(menu);
      row.appendChild(coffee);

      // POPRAWIONE: Ikonka "hamburgera" całkowicie biała
      menu.style.filter = 'brightness(100) drop-shadow(0 0 2px rgba(0,0,0,0.5))';
      menu.style.opacity = '1';

      hideNav();
    };

    apply();
    window.addEventListener('resize', apply, { passive: true });
    window.addEventListener('orientationchange', apply, { passive: true });
  }

  // -------------------------
  // Public comments (Supabase)
  // -------------------------
  function getSupabaseConfig() {
    const cfg = window.AIO_SITE || {};
    return {
      url: (cfg.supabaseUrl || '').trim(),
      anon: (cfg.supabaseAnonKey || '').trim(),
    };
  }

  function renderStars(n) {
    const v = Number(n);
    if (!v || v < 1 || v > 5) return '';
    return '★★★★★'.slice(0, v) + '☆☆☆☆☆'.slice(0, 5 - v);
  }

  async function initPublicComments() {
    const root = document.getElementById('comments-public');
    if (!root) return;

    // Wait for Supabase lib
    const ok = await ensureSupabaseV2();
    if (!ok) {
        if(document.getElementById('commentsStatus')) document.getElementById('commentsStatus').textContent = 'Błąd ładowania biblioteki Supabase.';
        return;
    }

    const statusEl = document.getElementById('commentsStatus');
    const listEl = document.getElementById('commentsListPublic');
    const btnSend = document.getElementById('commentSubmitBtn');
    const btnRefresh = document.getElementById('commentRefreshBtn');

    const cfg = getSupabaseConfig();

    if (!window.supabase || !cfg.url || !cfg.anon) {
      if (statusEl) {
        statusEl.textContent = 'Komentarze publiczne wymagają konfiguracji. Uzupełnij AIO_SITE.supabaseUrl oraz AIO_SITE.supabaseAnonKey w script.js.';
      }
      if (btnSend) btnSend.disabled = true;
      return;
    }

    const client = window.supabase.createClient(cfg.url, cfg.anon);
    const page = location.pathname || '/';

    const load = async () => {
      if (statusEl) statusEl.textContent = 'Ładowanie komentarzy...';
      const { data, error } = await client
        .from('comments')
        .select('id,page,name,message,rating,created_at')
        .eq('page', page)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error(error);
        if (statusEl) statusEl.textContent = 'Nie udało się pobrać komentarzy. Sprawdź konfigurację Supabase oraz polityki RLS.';
        return;
      }

      if (statusEl) statusEl.textContent = data && data.length ? `Komentarze: ${data.length}` : 'Brak komentarzy. Bądź pierwszy.';
      if (listEl) {
        listEl.innerHTML = (data || []).map((c) => {
          const nick = escapeHtml(c.name || 'Anonim');
          const msg = escapeHtml(c.message || '');
          const stars = c.rating ? `<span class="comment-stars">${escapeHtml(renderStars(c.rating))}</span>` : '';
          const dt = c.created_at ? new Date(c.created_at).toLocaleString('pl-PL') : '';
          return `
            <div class="comment-item">
              <div class="comment-meta">
                <span class="comment-author">${nick}</span>
                ${stars}
                <span class="comment-date">${escapeHtml(dt)}</span>
              </div>
              <div class="comment-body">${msg.replaceAll('\n','<br>')}</div>
            </div>
          `;
        }).join('');
      }
    };

    const send = async () => {
      const nameEl = document.getElementById('commentNamePublic');
      const bodyEl = document.getElementById('commentBodyPublic');
      const ratingEl = document.getElementById('commentRatingPublic');

      const name = (nameEl && nameEl.value ? nameEl.value : (localStorage.getItem('aio_user_name') || '')) || 'Anonim';
      const message = (bodyEl && bodyEl.value || '').trim();
      const rating = ratingEl && ratingEl.value ? Number(ratingEl.value) : null;

      if (!message || message.length < 3) {
        if (statusEl) statusEl.textContent = 'Komentarz jest zbyt krótki.';
        return;
      }

      if (btnSend) btnSend.disabled = true;
      if (statusEl) statusEl.textContent = 'Wysyłanie...';

      const payload = { page, name: name.trim().slice(0, 40), message: message.slice(0, 2000) };
      if (rating && rating >= 1 && rating <= 5) payload.rating = rating;

      const { error } = await client.from('comments').insert(payload);
      if (error) {
        console.error(error);
        if (statusEl) statusEl.textContent = 'Nie udało się dodać komentarza. Sprawdź polityki RLS dla INSERT.';
        if (btnSend) btnSend.disabled = false;
        return;
      }

      if (bodyEl) bodyEl.value = '';
      if (ratingEl) ratingEl.value = '';
      if (statusEl) statusEl.textContent = 'Dodano komentarz.';
      if (btnSend) btnSend.disabled = false;

      await load();
    };

    // Prefill name from local login
    const nameEl = document.getElementById('commentNamePublic');
    if (nameEl) {
      const saved = localStorage.getItem('aio_user_name') || '';
      if (saved && !nameEl.value) nameEl.value = saved;
    }

    if (btnSend) btnSend.addEventListener('click', (e) => { e.preventDefault(); send(); });
    if (btnRefresh) btnRefresh.addEventListener('click', (e) => { e.preventDefault(); load(); });

    await load();
  }

  // -------------------------
  // Contact: Supabase comments
  // -------------------------
  function initContactComments() {
    const contact = qs('#kontakt');
    if (!contact) return;

    const cfg = window.AIO_SITE || {};
    const url = cfg.supabaseUrl;
    const anon = cfg.supabaseAnonKey;
    if (!url || !anon) return;

    removeContactTechBlock();

    let wrap = qs('#contactComments', contact);
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'contactComments';
      wrap.className = 'card';
      wrap.style.marginTop = '16px';
      wrap.innerHTML = `
        <h3 style="margin:0 0 10px 0;">Komentarze</h3>
        <p style="margin:0 0 12px 0; opacity:.85;">Dodaj komentarz lub opinię. Komentarze pojawiają się publicznie.</p>
        <div class="cc-form" style="display:flex; gap:10px; flex-wrap:wrap; align-items:flex-start;">
          <input id="ccName" type="text" placeholder="Twój nick" style="flex:1; min-width:180px;">
          <textarea id="ccMsg" rows="3" placeholder="Treść komentarza..." style="flex:2; min-width:240px;"></textarea>
          <button id="ccSend" class="btn">Dodaj</button>
        </div>
        <div id="ccStatus" style="margin-top:8px; opacity:.85;"></div>
        <div id="ccList" style="margin-top:14px; display:flex; flex-direction:column; gap:10px;"></div>
      `;
      contact.appendChild(wrap);
    }

    const elName = qs('#ccName', wrap);
    const elMsg = qs('#ccMsg', wrap);
    const elSend = qs('#ccSend', wrap);
    const elStatus = qs('#ccStatus', wrap);
    const elList = qs('#ccList', wrap);

    [elName, elMsg].forEach((el) => {
      if (!el) return;
      el.style.background = 'rgba(255,255,255,0.06)';
      el.style.border = '1px solid rgba(255,255,255,0.12)';
      el.style.borderRadius = '10px';
      el.style.color = 'inherit';
      el.style.padding = '10px 12px';
      el.style.outline = 'none';
    });

    let client = null;

    const render = (items) => {
      elList.innerHTML = '';
      if (!items || !items.length) {
        elList.innerHTML = `<div style="opacity:.75;">Brak komentarzy. Bądź pierwszy.</div>`;
        return;
      }
      for (const it of items) {
        const name = escapeHtml(String(it.name || 'Anonim'));
        const msg = escapeHtml(String(it.message || ''));
        const d = it.created_at ? new Date(it.created_at) : null;
        const when = d && !isNaN(d.getTime()) ? d.toLocaleString() : '';
        const card = document.createElement('div');
        card.className = 'cc-item';
        card.style.padding = '10px 12px';
        card.style.border = '1px solid rgba(255,255,255,0.10)';
        card.style.borderRadius = '12px';
        card.style.background = 'rgba(0,0,0,0.18)';
        card.innerHTML = `
          <div style="display:flex; justify-content:space-between; gap:10px;">
            <strong>${name}</strong>
            <span style="opacity:.7; font-size:12px;">${escapeHtml(when)}</span>
          </div>
          <div style="margin-top:6px; white-space:pre-wrap;">${msg}</div>
        `;
        elList.appendChild(card);
      }
    };

    const setStatus = (t, ok = true) => {
      elStatus.textContent = t || '';
      elStatus.style.color = ok ? 'inherit' : '#ffb3b3';
    };

    const load = async () => {
      try {
        setStatus('Ładowanie komentarzy...');
        const { data, error } = await client
          .from('comments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (error) throw error;
        render(Array.isArray(data) ? data : []);
        setStatus('');
      } catch (e) {
        setStatus('Nie udało się wczytać komentarzy.', false);
      }
    };

    const send = async () => {
      const name = (elName.value || '').trim() || 'Anonim';
      const message = (elMsg.value || '').trim();
      if (!message) return setStatus('Wpisz treść komentarza.', false);

      elSend.disabled = true;
      try {
        setStatus('Wysyłanie...');
        const payload = { page: 'kontakt', name, message };
        const { error } = await client.from('comments').insert(payload);
        if (error) throw error;

        elMsg.value = '';
        localStorage.setItem('aio_cc_name', name);
        setStatus('Dodano komentarz.');
        await load();
      } catch (e) {
        setStatus('Nie udało się dodać komentarza (sprawdź polityki RLS).', false);
      } finally {
        elSend.disabled = false;
      }
    };

    (async () => {
      const ok = await ensureSupabaseV2();
      if (!ok) return setStatus('Nie udało się załadować biblioteki komentarzy.', false);
      client = window.supabase.createClient(url, anon);
      elName.value = localStorage.getItem('aio_cc_name') || '';
      elSend.addEventListener('click', send);
      await load();
    })();
  }

  function removeContactTechBlock() {
    const contact = qs('#kontakt');
    if (!contact) return;
    const heads = qsa('h2,h3,h4', contact);
    const h = heads.find((x) => /technologie/i.test(x.textContent || ''));
    if (!h) return;
    const container = h.closest('.card, section, .panel, .box, div');
    if (container && /supabase/i.test(container.textContent || '')) {
      container.remove();
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyI18n();
    initAnalytics();
    initDrawer();
    initMobileHeaderIcons();
    setActiveNav();
    initUpdates();
    initContactComments();
    initPayPal();
    initMarquee();
    initAIChatDrawer();
    initOneLinerGenerator();
    initPublicComments();
  });
})();
