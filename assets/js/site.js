(function () {
  'use strict';

  // =========================
  // KONFIGURACJA AIO-IPTV (DANE DOSTĘPOWE)
  // =========================
  window.AIO_SITE = window.AIO_SITE || {};
  
  // Dane wpisane na sztywno (gwarancja działania):
  window.AIO_SITE.supabaseUrl = "https://pynjjeobqzxbrvmqofcw.supabase.co";
  window.AIO_SITE.supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5bmpqZW9icXp4YnJ2bXFvZmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDA5MDYsImV4cCI6MjA4MTMxNjkwNn0.XSBB0DJw27Wrn41nranqFyj8YI0-YjLzX52dkdrgkrg";

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  // -------------------------
  // i18n (Języki)
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
      updates: 'Nowości',
      marquee_text: 'Wesprzyj AIO‑IPTV — kawa pomaga rozwijać stronę i autorskie wtyczki.',
      marquee_cta: 'Postaw kawę',
      holiday: 'Paweł Pawełek — życzy Zdrowych Wesołych Świąt',
      generator_hint: '# Zaznacz przynajmniej jedną opcję powyżej...',
      ai_placeholder: 'Zadaj pytanie o Enigma2…',
      ai_send: 'Wyślij',
      ai_hint: 'Podpowiedź: pytaj np. „jak zainstalować softcam?”',
      ai_mode_offline: 'Tryb: OFFLINE',
      ai_mode_online: 'Tryb: ONLINE'
    },
    en: {
      nav_home: 'Home',
      updates: 'Updates',
      marquee_text: 'Support AIO‑IPTV — coffee helps build the site.',
      marquee_cta: 'Buy coffee',
      holiday: 'Paweł Pawełek — wishes you a joyful holiday season',
      generator_hint: '# Select at least one option above...',
      ai_placeholder: 'Ask about Enigma2…',
      ai_send: 'Send',
      ai_hint: 'Tip: ask “how to install softcam?”',
      ai_mode_offline: 'Mode: OFFLINE',
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
  }

  // -------------------------
  // Helpers
  // -------------------------
  function escapeHtml(s) {
    return String(s || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function relUrl(path) {
    return new URL(path, document.baseURI).toString();
  }

  async function safeFetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  }

  // FUNKCJA ŁADUJĄCA SUPABASE (Przeniesiona na górę dla bezpieczeństwa)
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

    try {
      await navigator.clipboard.writeText(text);
      const btn = el.parentElement ? el.parentElement.querySelector('button.copy-btn') : null;
      if (btn) {
        const prev = btn.textContent;
        btn.textContent = '✅ Skopiowano!';
        setTimeout(() => btn.textContent = prev, 1500);
      } else {
        alert('Skopiowano!');
      }
    } catch (_) {
      alert('Nie udało się skopiować automatycznie. Zaznacz tekst ręcznie.');
    }
  };

  // -------------------------
  // Menu mobilne i jasna ikona
  // -------------------------
  function findCoffeeBtn() {
    const candidates = qsa('.nav-btn, .menu-btn, button');
    for (const el of candidates) {
      if ((el.textContent || '').includes('☕') || (el.href || '').includes('buycoffee')) return el;
    }
    return null;
  }

  function initMobileHeaderIcons() {
    const mq = window.matchMedia('(max-width: 900px)');
    
    const apply = () => {
      if (!mq.matches) return; // Tylko na mobilnych

      const topInner = qs('.top-info-bar .status-right'); 
      // Jeśli mamy dedykowany pasek statusu, używamy go, w przeciwnym razie szukamy headera
      const targetContainer = topInner || qs('header');
      if (!targetContainer) return;

      const nav = qs('.main-navigation-bar');
      const menuBtn = document.createElement('button');
      
      // Jeżeli już dodaliśmy, nie dodawaj ponownie
      if (qs('#mobileMenuToggle')) return;

      menuBtn.id = 'mobileMenuToggle';
      menuBtn.innerHTML = '☰';
      // STYLIZACJA IKONY MENU - BARDZO JASNA
      menuBtn.style.cssText = `
        background: transparent;
        border: 1px solid rgba(255,255,255,0.3);
        color: #ffffff;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 5px 10px;
        border-radius: 4px;
        filter: brightness(500%);
        margin-right: 10px;
        display: inline-block;
      `;
      
      menuBtn.onclick = () => {
        if (nav.style.display === 'flex') {
            nav.style.display = 'none';
        } else {
            nav.style.display = 'flex';
            nav.style.flexDirection = 'column';
            nav.style.position = 'absolute';
            nav.style.top = '60px';
            nav.style.left = '0';
            nav.style.right = '0';
            nav.style.zIndex = '9999';
        }
      };

      // Wstawiamy przycisk menu do paska statusu na górze
      if (topInner) {
          topInner.insertBefore(menuBtn, topInner.firstChild);
      }
    };

    apply();
    window.addEventListener('resize', apply);
  }

  // -------------------------
  // KOMENTARZE PUBLICZNE (SUPABASE) - POPRAWIONA LOGIKA
  // -------------------------
  function renderStars(n) {
    const v = Number(n);
    if (!v || v < 1 || v > 5) return '';
    return '★★★★★'.slice(0, v) + '☆☆☆☆☆'.slice(0, 5 - v);
  }

  async function initPublicComments() {
    const listEl = document.getElementById('commentsListPublic');
    const statusEl = document.getElementById('commentsStatus');
    
    // Jeśli nie ma elementu listy na tej podstronie, przerywamy
    if (!listEl) return;

    // 1. Czekamy na bibliotekę
    const ok = await ensureSupabaseV2();
    if (!ok) {
        if (statusEl) statusEl.textContent = 'Błąd: Biblioteka Supabase nie załadowała się.';
        return;
    }

    // 2. Pobieramy konfigurację z początku pliku
    const url = window.AIO_SITE.supabaseUrl;
    const key = window.AIO_SITE.supabaseAnonKey;

    if (!url || !key) {
        if (statusEl) statusEl.textContent = 'Błąd konfiguracji: Brak URL lub klucza API.';
        return;
    }

    // 3. Inicjalizacja klienta
    let client;
    try {
        client = window.supabase.createClient(url, key);
    } catch (err) {
        console.error(err);
        if (statusEl) statusEl.textContent = 'Błąd inicjalizacji klienta Supabase.';
        return;
    }

    const page = location.pathname.split('/').pop() || 'index.html';

    // Funkcja pobierania
    const loadComments = async () => {
        if (statusEl) statusEl.textContent = 'Ładowanie komentarzy...';
        
        const { data, error } = await client
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Błąd pobierania:', error);
            if (statusEl) statusEl.textContent = 'Błąd pobierania komentarzy.';
            return;
        }

        if (statusEl) statusEl.textContent = '';
        
        if (!data || data.length === 0) {
            listEl.innerHTML = '<div style="opacity:0.7; padding:10px;">Brak komentarzy. Bądź pierwszy!</div>';
            return;
        }

        listEl.innerHTML = data.map(c => {
            const nick = escapeHtml(c.name || 'Anonim');
            const msg = escapeHtml(c.message || '');
            const date = c.created_at ? new Date(c.created_at).toLocaleString('pl-PL') : '';
            const stars = c.rating ? `<span style="color:#d29922; margin-left:10px;">${renderStars(c.rating)}</span>` : '';
            
            return `
            <div class="comment-item">
                <div class="comment-header">
                    <span style="font-weight:bold; color:#58a6ff;">${nick}</span>
                    ${stars}
                    <span style="font-size:0.8em; opacity:0.7;">${date}</span>
                </div>
                <div class="comment-text" style="margin-top:5px; line-height:1.4;">${msg}</div>
            </div>`;
        }).join('');
    };

    // Funkcja wysyłania
    const btnSend = document.getElementById('commentSubmitBtn');
    if (btnSend) {
        btnSend.addEventListener('click', async (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('commentNamePublic');
            const msgInput = document.getElementById('commentBodyPublic');
            const rateInput = document.getElementById('commentRatingPublic');

            const name = nameInput.value.trim() || 'Anonim';
            const message = msgInput.value.trim();
            const rating = rateInput.value ? parseInt(rateInput.value) : null;

            if (message.length < 3) {
                alert('Komentarz jest za krótki.');
                return;
            }

            btnSend.disabled = true;
            btnSend.textContent = 'Wysyłanie...';

            const payload = { page: page, name: name, message: message };
            if (rating) payload.rating = rating;

            const { error } = await client.from('comments').insert(payload);

            if (error) {
                alert('Błąd wysyłania: ' + error.message);
            } else {
                msgInput.value = '';
                if(rateInput) rateInput.value = '';
                loadComments(); // Odśwież listę
            }
            btnSend.disabled = false;
            btnSend.textContent = 'Wyślij';
        });
    }

    // Załaduj na start
    loadComments();
    
    // Obsługa przycisku odśwież
    const btnRefresh = document.getElementById('commentRefreshBtn');
    if (btnRefresh) btnRefresh.addEventListener('click', loadComments);
  }

  // =========================
  // INICJALIZACJA
  // =========================
  document.addEventListener('DOMContentLoaded', () => {
    applyI18n();
    initMobileHeaderIcons();
    initPublicComments(); // Uruchomienie komentarzy
    
    // Inicjalizacja AOS jeśli dostępny
    if (typeof AOS !== 'undefined') AOS.init();
    
    // Particles.js
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
            "particles": { "number": { "value": 40 }, "size": { "value": 3 } }
        });
    }
  });

})();
