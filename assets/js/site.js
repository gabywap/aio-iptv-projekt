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
      mark_read: 'Oznacz jako przeczytane',
      clear_cache: 'Wyczyść cache UI',
      reload: 'Odśwież',
      no_updates: 'Brak aktualności do wyświetlenia.',
      updates_failed: 'Nie udało się wczytać aktualizacji.',

      marquee_text:
        'Wesprzyj AIO‑IPTV — kawa pomaga rozwijać stronę i autorskie wtyczki: AIO Panel, IPTV Dream i inne.',
      marquee_cta: 'Postaw kawę',
      holiday:
        'Paweł Pawełek — życzy Zdrowych Wesołych Świąt',

      generator_hint: '# Zaznacz przynajmniej jedną opcję powyżej...',
      show_more: 'Pokaż więcej',
      show_less: 'Pokaż mniej',

      copy: 'Kopiuj',

      ai_placeholder: 'Zadaj pytanie o Enigma2…',
      ai_send: 'Wyślij',
      ai_mode_online: 'Tryb: ONLINE',
      ai_mode_offline: 'Tryb: OFFLINE (baza wiedzy)',

      back_to_top: 'Do góry'
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
      mark_read: 'Mark as read',
      clear_cache: 'Clear UI cache',
      reload: 'Reload',
      no_updates: 'No updates to display.',
      updates_failed: 'Failed to load updates.',

      marquee_text:
        'Support AIO‑IPTV — coffee helps build the site and original plugins: AIO Panel, IPTV Dream and more.',
      marquee_cta: 'Buy coffee',
      holiday:
        'Paweł Pawełek — wishes you a joyful holiday season',

      generator_hint: '# Select at least one option above...',
      show_more: 'Show more',
      show_less: 'Show less',

      copy: 'Copy',

      ai_placeholder: 'Ask about Enigma2…',
      ai_send: 'Send',
      ai_mode_online: 'Mode: ONLINE',
      ai_mode_offline: 'Mode: OFFLINE (knowledge base)',

      back_to_top: 'Back to top'
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

  function absUrl(pathLike) {
    // Always resolve via current document base (GitHub Pages subpaths safe)
    return new URL(pathLike, document.baseURI).toString();
  }

  function safeJsonParse(s) {
    try {
      return JSON.parse(s);
    } catch (_) {
      return null;
    }
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
  // Mobile drawer (hamburger)
  // -------------------------
  function initDrawer() {
    const btn = qs('#navToggle');
    const drawer = qs('#mobileDrawer');
    const back = qs('#drawerBackdrop');
    if (!btn || !drawer || !back) return;

    const open = () => {
      drawer.classList.add('open');
      back.classList.add('open');
      document.body.classList.add('no-scroll');
      drawer.setAttribute('aria-hidden', 'false');
    };
    const close = () => {
      drawer.classList.remove('open');
      back.classList.remove('open');
      document.body.classList.remove('no-scroll');
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
  // Accordions (Guides / Pomoc / Contact)
  // -------------------------
  function initAccordions() {
    // Supports markup:
    // <div class="accordion-item"><button class="accordion-header">..</button><div class="accordion-content">..</div></div>
    qsa('.accordion-item').forEach((item) => {
      const header = qs('.accordion-header', item);
      const content = qs('.accordion-content', item);
      if (!header || !content) return;
      if (header.dataset.bound === '1') return;
      header.dataset.bound = '1';

      // Ensure collapsed state is applied via class (CSS handles height)
      item.classList.remove('open');
      header.setAttribute('aria-expanded', 'false');

      header.addEventListener('click', () => {
        const isOpen = item.classList.toggle('open');
        header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
  }

  // -------------------------
  // Notifications bell (Updates Center)
  // -------------------------
  const UPDATES_SEEN_KEY = 'aio_updates_seen_ts';

  function parseDateToTs(dateStr) {
    // Accept YYYY-MM-DD
    const m = String(dateStr || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return 0;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(Date.UTC(y, mo, d, 12, 0, 0));
    return dt.getTime();
  }

  function initUpdatesCenter() {
    const bell = qs('#bellBtn');
    const panel = qs('#notifPanel');
    if (!bell || !panel) return;

    // Badge
    let badge = qs('.notif-badge', bell.parentElement || bell);
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'notif-badge';
      badge.textContent = '0';
      (bell.parentElement || bell).style.position = 'relative';
      (bell.parentElement || bell).appendChild(badge);
    }

    async function loadUpdates() {
      const res = await fetch(absUrl('data/updates.json'), { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const items = await res.json();
      return Array.isArray(items) ? items : [];
    }

    function getSeenTs() {
      return Number(localStorage.getItem(UPDATES_SEEN_KEY) || '0') || 0;
    }

    function setSeenTs(ts) {
      localStorage.setItem(UPDATES_SEEN_KEY, String(ts || Date.now()));
    }

    function computeTs(item) {
      if (item && typeof item.ts === 'number' && item.ts > 0) return item.ts;
      return parseDateToTs(item?.date);
    }

    function iconForType(type) {
      const t0 = String(type || '').toLowerCase();
      if (t0 === 'fix') return '🛠';
      if (t0 === 'change') return '✨';
      if (t0 === 'release') return '🚀';
      if (t0 === 'feature') return '🧩';
      return '🔔';
    }

    function renderPanel(items) {
      const seenTs = getSeenTs();
      const normalized = items
        .map((it) => ({ ...it, _ts: computeTs(it) }))
        .sort((a, b) => (b._ts || 0) - (a._ts || 0));

      const unread = normalized.filter((it) => (it._ts || 0) > seenTs);
      badge.textContent = String(unread.length);
      badge.classList.toggle('is-hidden', unread.length === 0);

      const head = `
        <div class="notif-head">
          <div class="notif-title">${escapeHtml(t('updates'))}</div>
          <div class="notif-actions">
            <button type="button" class="notif-action" data-action="read">${escapeHtml(t('mark_read'))}</button>
            <button type="button" class="notif-action" data-action="clear">${escapeHtml(t('clear_cache'))}</button>
            <button type="button" class="notif-action" data-action="reload">${escapeHtml(t('reload'))}</button>
          </div>
        </div>
      `;

      const body = normalized.length
        ? normalized.slice(0, 18).map((it) => {
            const icon = iconForType(it.type);
            const isUnread = (it._ts || 0) > seenTs;
            return `
              <div class="notif-item ${isUnread ? 'unread' : ''}">
                <div class="notif-ico">${icon}</div>
                <div>
                  <div class="notif-item-title">${escapeHtml(it.title || '')}</div>
                  <div class="notif-item-date">${escapeHtml(it.date || '')}</div>
                  ${it.details ? `<div class="notif-item-details">${escapeHtml(it.details)}</div>` : ''}
                </div>
              </div>
            `;
          }).join('')
        : `<div class="notif-empty">${escapeHtml(t('no_updates'))}</div>`;

      panel.innerHTML = head + body;

      qsa('button.notif-action', panel).forEach((btn) => {
        btn.addEventListener('click', () => {
          const act = btn.getAttribute('data-action');
          if (act === 'read') {
            // Mark as read to latest update timestamp
            const latest = normalized[0]?._ts || Date.now();
            setSeenTs(latest);
            renderPanel(items);
          } else if (act === 'clear') {
            // Clear only project UI keys (no destructive full clear)
            const keys = [
              UPDATES_SEEN_KEY,
              'aio_lang',
              'aio_ai_seen_hint',
              'aio_ai_mode'
            ];
            keys.forEach((k) => localStorage.removeItem(k));
            // Force a hard reload with cache buster
            location.href = location.pathname + '?v=' + Date.now();
          } else if (act === 'reload') {
            location.reload();
          }
        });
      });
    }

    let cachedItems = null;

    async function ensureLoaded() {
      if (cachedItems) return cachedItems;
      cachedItems = await loadUpdates();
      return cachedItems;
    }

    async function refreshBadgeOnly() {
      try {
        const items = await loadUpdates();
        cachedItems = items;
        const seenTs = getSeenTs();
        const unread = items.map((it) => computeTs(it)).filter((ts) => ts > seenTs);
        badge.textContent = String(unread.length);
        badge.classList.toggle('is-hidden', unread.length === 0);
      } catch (_) {
        // Keep silent
      }
    }

    // Initial badge compute
    refreshBadgeOnly();

    const toggle = async () => {
      const open = panel.classList.toggle('open');
      if (!open) return;
      try {
        const items = await ensureLoaded();
        renderPanel(items);
      } catch (e) {
        panel.innerHTML = `<div class="notif-empty">⚠️ ${escapeHtml(t('updates_failed'))}</div>`;
      }
    };

    bell.addEventListener('click', toggle);

    document.addEventListener('click', (e) => {
      if (!panel.classList.contains('open')) return;
      const target = e.target;
      if (panel.contains(target) || target === bell) return;
      panel.classList.remove('open');
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
  // Generator One-Liner
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

  // -----------------------------
  // Back to top
  // -----------------------------
  function initBackToTop() {
    if (qs('#backToTop')) return;
    const btn = document.createElement('button');
    btn.id = 'backToTop';
    btn.className = 'back-to-top';
    btn.type = 'button';
    btn.setAttribute('aria-label', t('back_to_top'));
    btn.innerHTML = '↑';
    document.body.appendChild(btn);

    const onScroll = () => {
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      btn.classList.toggle('show', y > 500);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // -----------------------------
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
        <input id="aiChatInput" class="ai-drawer__input" type="text" placeholder="${escapeHtml(t('ai_placeholder'))}" />
        <button class="ai-drawer__send" type="submit">${escapeHtml(t('ai_send'))}</button>
      </form>
      <div class="ai-drawer__hint">${
        lang === 'pl'
          ? 'Podpowiedź: pytaj np. „jak zainstalować softcam feed?” albo „gdzie są picony?”.'
          : 'Tip: ask e.g. “how to install softcam feed?” or “where are picons?”.'
      }</div>
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
    const words = nq
      .split(' ')
      .filter((w) => w.length > 2)
      .slice(0, 10);

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
      return lang === 'pl'
        ? [
            'Nie znalazłem dokładnej odpowiedzi w bazie offline.',
            'Spróbuj doprecyzować: model tunera / image (OpenATV/OpenPLi) / błąd z logu.',
            'Jeżeli masz tryb ONLINE (API), ustaw go w data/aichat_config.json.'
          ]
        : [
            'I could not find an exact match in the offline knowledge base.',
            'Try adding: tuner model / image (OpenATV/OpenPLi) / error from logs.',
            'If you have ONLINE mode (API), configure it in data/aichat_config.json.'
          ];
    }

    const out = [];
    out.push(lang === 'pl' ? 'Znalazłem w bazie offline pasujące tematy:' : 'I found matching topics in the offline KB:');
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

  async function safeFetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  async function postJSON(url, payload, headers = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(payload)
    });
    const txt = await res.text();
    if (!res.ok) throw new Error(txt || ('HTTP ' + res.status));
    return safeJsonParse(txt) || { reply: txt };
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

    let cfg = { mode: 'offline', endpoint: '' };
    try {
      cfg = await safeFetchJSON(absUrl('data/aichat_config.json'));
    } catch (_) {
      // keep offline
    }

    const isOnline = cfg && cfg.mode === 'online' && cfg.endpoint;
    meta.textContent = isOnline ? t('ai_mode_online') : t('ai_mode_offline');

    let kb = [];
    try {
      kb = await safeFetchJSON(absUrl('data/knowledge.json'));
    } catch (_) {
      kb = [];
    }

    // Online mode supports either:
    // 1) Supabase Edge Function (endpoint = https://.../functions/v1/ai-chat, apikey+anon optional)
    // 2) Generic endpoint returning {reply} or {text}

    async function askOnline(question) {
      const ep = String(cfg.endpoint || '').trim();
      if (!ep) throw new Error('No endpoint');

      // Supabase config: allow passing apikey + bearer (anon key)
      const headers = {};
      if (cfg.apikey) headers.apikey = String(cfg.apikey);
      if (cfg.anon_key) headers.Authorization = 'Bearer ' + String(cfg.anon_key);

      const payload = {
        query: question,
        message: question,
        lang
      };
      const data = await postJSON(ep, payload, headers);
      const reply = data.reply || data.text || data.answer || '';
      return String(reply || '').trim();
    }

    form &&
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const q = (input && input.value) || '';
        const question = q.trim();
        if (!question) return;
        if (input) input.value = '';

        renderChatMessage('user', question);

        if (isOnline) {
          try {
            const reply = await askOnline(question);
            if (reply) {
              renderChatMessage('bot', reply);
              return;
            }
          } catch (e) {
            // fall back to offline
            renderChatMessage(
              'bot',
              lang === 'pl'
                ? 'Nie udało się połączyć z trybem ONLINE. Odpowiadam z bazy offline.'
                : 'Could not reach ONLINE mode. Falling back to offline KB.'
            );
          }
        }

        const lines = buildOfflineReply(question, kb);
        renderChatMessage('bot', lines.join('\n'));
      });
  }

  // -----------------------------
  // Bootstrap
  // -----------------------------
  function boot() {
    applyI18n();
    initMarquee();
    initDrawer();
    setActiveNav();
    initPayPal();
    initUpdatesCenter();
    initOneLinerGenerator();
    initAccordions();
    initBackToTop();
    initAIChatDrawer();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
