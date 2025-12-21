// =========================
// AIO-IPTV.pl configuration
// =========================
window.AIO_SITE = window.AIO_SITE || {};
window.AIO_SITE.supabaseUrl = "https://pynjjeobqzxbrvmqofcw.supabase.co";
window.AIO_SITE.supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5bmpqZW9icXp4YnJ2bXFvZmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDA5MDYsImV4cCI6MjA4MTMxNjkwNn0.XSBB0DJw27Wrn41nranqFyj8YI0-YjLzX52dkdrgkrg";

/* script.js - Logika dla AIO-IPTV.pl - WERSJA COMPLETE (REAL AI) */

// Helpers
const qs = (s, r = document) => r.querySelector(s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

// Inicjalizacja animacji AOS
if (typeof AOS !== 'undefined') { AOS.init(); }

// AKORDEON JS
const acc = document.getElementsByClassName("accordion-header");
for (let i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
        const currentActive = document.querySelector(".accordion-item.active");
        if (currentActive && currentActive !== this.parentElement) {
            currentActive.classList.remove("active");
            currentActive.querySelector(".accordion-content").style.maxHeight = null;
        }
        this.parentElement.classList.toggle("active");
        const panel = this.nextElementSibling;
        if (panel.style.maxHeight) {
            panel.style.maxHeight = null;
        } else {
            panel.style.maxHeight = panel.scrollHeight + "px";
        }
    });
}

// Funkcja Udostępniania
function sharePage() {
    if (navigator.share) {
        navigator.share({
            title: 'AIO-IPTV.pl',
            text: 'Autorskie wtyczki Enigma2, listy, porady – PawełPawełek',
            url: window.location.href
        }).catch((error) => console.log('Błąd udostępniania', error));
    } else {
        navigator.clipboard.writeText(window.location.href).then(function() {
            alert('Link skopiowany!');
        });
    }
}

// Mobile drawer (Hamburger menu logic)
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

// Fix Mobile Nav Portrait (ZMODYFIKOWANA)
function fixMobileNavPortrait() {
    const mq = window.matchMedia ? window.matchMedia('(max-width: 520px) and (orientation: portrait)') : null;
    const isPortraitSmall = mq ? mq.matches : (window.innerWidth <= 520);

    const toggle = qs('#navToggle');
    if (!toggle) return;

    // Styl CSS wstrzykiwany dynamicznie (zostawiamy to)
    let styleEl = qs('#aioMobileNavPortraitStyle');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'aioMobileNavPortraitStyle';
      styleEl.textContent = `
        @media (max-width: 520px) and (orientation: portrait) {
          body.aio-mobile-nav-wrap [data-aio-nav-row="1"] {
            display: flex !important; flex-wrap: wrap !important;
            overflow-x: visible !important; white-space: normal !important;
            gap: 10px !important; row-gap: 10px !important; align-items: center !important;
          }
          body.aio-mobile-nav-wrap [data-aio-nav-row="1"] a,
          body.aio-mobile-nav-wrap [data-aio-nav-row="1"] button {
            flex: 1 0 44% !important; min-width: 130px !important;
          }
        }
      `;
      document.head.appendChild(styleEl);
    }

    const topRoot = qs('.topbar') || qs('#topbar') || document.body;
    const containers = qsa('nav, .nav, .nav-links, .topbar-nav, ul', topRoot);
    let best = null;
    let bestN = 0;
    for (const el of containers) {
      const n = el.querySelectorAll('a').length;
      if (n > bestN) { best = el; bestN = n; }
    }
    if (best) best.setAttribute('data-aio-nav-row', '1');
    document.body.classList.toggle('aio-mobile-nav-wrap', !!isPortraitSmall);

    /* UWAGA: Poniższy kod został zakomentowany, ponieważ
       przenoszenie przycisków jest teraz obsługiwane przez CSS (order)
       w pliku style.css.
    */
    /*
    if (isPortraitSmall) {
      const coffee = qs('a[aria-label*="kaw" i]') || qs('button[aria-label*="kaw" i]');
      if (coffee && coffee.parentElement) {
        const p = coffee.parentElement;
        if (toggle.parentElement !== p) {
          try { p.insertBefore(toggle, coffee); } catch (_) {}
        }
        toggle.style.marginRight = '10px';
      }
    } else {
       // logic to restore position...
    }
    */
}

// Powiadomienia (Bell)
function initUpdates() {
    const bell = qs('#bellBtn'); // lub #newsBellBtn w zależności od HTML
    const panel = qs('#notifPanel');
    if (!bell || !panel) return;

    const togglePanel = (e) => {
        e.stopPropagation();
        panel.classList.toggle('open');
    };

    bell.addEventListener('click', togglePanel);
    document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && e.target !== bell) {
            panel.classList.remove('open');
        }
    });
}

// AI CHAT (Supabase Edge)
function initAIChat() {
    const sbUrl = window.AIO_SITE?.supabaseUrl;
    const sbKey = window.AIO_SITE?.supabaseAnonKey;
    const fab = document.getElementById('ai-chat-fab');
    const drawer = document.getElementById('ai-chat-drawer');
    const closeBtn = document.getElementById('ai-chat-close');
    const backdrop = document.getElementById('ai-chat-backdrop');
    const chatInput = document.getElementById('aiChatInput');
    const chatOutput = document.getElementById('aiChatMessages');
    const chatForm = document.getElementById('aiChatForm');

    if (!fab || !drawer || !chatInput || !chatOutput) return;

    let supabaseClient = null;
    if (window.supabase && sbUrl && sbKey) {
        supabaseClient = window.supabase.createClient(sbUrl, sbKey);
    }

    const openChat = () => {
        drawer.style.display = 'block';
        drawer.setAttribute('aria-hidden', 'false');
        drawer.classList.add('is-open'); // jeśli używasz tej klasy w CSS
        if(backdrop) backdrop.classList.add('is-open');
        chatInput.focus();
    };

    const closeChat = () => {
        drawer.style.display = 'none';
        drawer.setAttribute('aria-hidden', 'true');
        drawer.classList.remove('is-open');
        if(backdrop) backdrop.classList.remove('is-open');
    };

    fab.addEventListener('click', openChat);
    if (closeBtn) closeBtn.addEventListener('click', closeChat);
    if (backdrop) backdrop.addEventListener('click', closeChat);

    function addMessage(text, sender) {
        const div = document.createElement('div');
        div.className = `chat-message ${sender}`;
        let formatted = text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
            .replace(/\n/g, '<br>');
        div.innerHTML = formatted;
        chatOutput.appendChild(div);
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }

    async function askAI(query) {
        if (!supabaseClient) return "❌ Błąd: Brak biblioteki Supabase.";
        try {
            const { data, error } = await supabaseClient.functions.invoke('ai-chat', {
                body: { query: query }
            });
            if (error) return "⚠️ Wystąpił błąd połączenia z AI.";
            return data.reply || "🤔 Otrzymałem pustą odpowiedź.";
        } catch (e) {
            return "⚠️ Błąd sieci.";
        }
    }

    async function handleSend() {
        const txt = chatInput.value.trim();
        if (!txt) return;
        chatInput.value = '';
        addMessage(txt, 'user');
        
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot typing';
        typingDiv.innerText = 'AI myśli...';
        chatOutput.appendChild(typingDiv);
        chatOutput.scrollTop = chatOutput.scrollHeight;

        const response = await askAI(txt);
        typingDiv.remove();
        addMessage(response, 'bot');
    }

    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSend();
        });
    }
}

// Wróć na górę
let mybutton = document.getElementById("topBtn");
window.onscroll = function() {
    if (!mybutton) return;
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        mybutton.style.display = "block";
    } else {
        mybutton.style.display = "none";
    }
};

// Inicjalizacja po załadowaniu DOM
document.addEventListener('DOMContentLoaded', () => {
    initDrawer(); // Mobile drawer toggle
    initUpdates(); // Notifications
    initAIChat(); // AI Chat logic
    
    // Fix layout changes on resize/rotate
    fixMobileNavPortrait();
    window.addEventListener('resize', fixMobileNavPortrait);
    window.addEventListener('orientationchange', fixMobileNavPortrait);
});
