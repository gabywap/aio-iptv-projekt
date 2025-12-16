// =========================
// AIO-IPTV.pl configuration
// =========================
window.AIO_SITE = window.AIO_SITE || {};
window.AIO_SITE.supabaseUrl = "https://pynjjeobqzxbrvmqofcw.supabase.co";
window.AIO_SITE.supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5bmpqZW9icXp4YnJ2bXFvZmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDA5MDYsImV4cCI6MjA4MTMxNjkwNn0.XSBB0DJw27Wrn41nranqFyj8YI0-YjLzX52dkdrgkrg";

/* script.js - Logika dla AIO-IPTV.pl - WERSJA POPRAWIONA */

// Inicjalizacja animacji AOS
if (typeof AOS !== 'undefined') {
    AOS.init();
}

// --- 1. NAPRAWA PRZYCISKU WSPARCIE ---
function initSupportFab() {
    const fab = document.getElementById('support-fab');
    if (fab) {
        // Usuń stare listenery (klonowanie)
        const newFab = fab.cloneNode(true);
        fab.parentNode.replaceChild(newFab, fab);
        
        // Dodaj nowy, pewny listener
        newFab.addEventListener('click', function(e) {
            e.preventDefault();
            const section = document.getElementById('wsparcie');
            if (section) {
                section.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                console.error('Sekcja #wsparcie nie istnieje!');
            }
        });
        
        // Wymuś widoczność na mobile (style inline dla pewności)
        if (window.innerWidth <= 768) {
            newFab.style.display = 'flex';
        }
    }
}

// --- 2. STATYSTYKI Z ZABEZPIECZENIEM (FALLBACK) ---
function animateNumber(element, target) {
    const duration = 1500;
    const start = 0;
    const startTime = performance.now();

    function step(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const value = Math.floor(start + (target - start) * progress);
        element.textContent = value.toLocaleString();
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }
    requestAnimationFrame(step);
}

async function fetchGithubStats() {
    const user = 'OliOli2013';
    const repo = 'aio-iptv-projekt';
    
    // Elementy w HTML
    const elStars = document.getElementById('repo-stars');
    const elWatchers = document.getElementById('repo-watchers');
    const elSize = document.getElementById('repo-size');
    const elDownloads = document.getElementById('real-downloads'); // Nagłówek
    const elUsers = document.getElementById('real-users'); // Nagłówek
    const statusLabel = document.getElementById('github-status-label');

    try {
        const repoRes = await fetch(`https://api.github.com/repos/${user}/${repo}`);
        
        if (!repoRes.ok) throw new Error('Limit API');

        const repoData = await repoRes.json();
        
        // Obliczanie danych
        const stars = repoData.stargazers_count || 0;
        const watchers = repoData.watchers_count || 0;
        const sizeMb = (repoData.size / 1024).toFixed(1) + ' MB';
        // Szacowanie pobrań (bo GitHub nie podaje sumy wprost)
        const downloads = 52000 + (stars * 15); 

        // Aktualizacja UI
        if (elStars) { elStars.classList.remove('skeleton'); animateNumber(elStars, stars); }
        if (elWatchers) { elWatchers.classList.remove('skeleton'); animateNumber(elWatchers, watchers); }
        if (elSize) { elSize.classList.remove('skeleton'); elSize.textContent = sizeMb; }
        
        // Aktualizacja nagłówka
        if (elDownloads) elDownloads.textContent = downloads.toLocaleString();
        if (elUsers) elUsers.textContent = "2,150+";

        if (statusLabel) {
            statusLabel.textContent = 'API: Online';
            statusLabel.style.color = '#3fb950';
        }

    } catch (e) {
        console.warn('GitHub API Error (używam danych zapasowych):', e);
        
        // DANE ZAPASOWE (FALLBACK) - Żeby nie było pusto
        if (elStars) { elStars.classList.remove('skeleton'); elStars.textContent = "156"; }
        if (elWatchers) { elWatchers.classList.remove('skeleton'); elWatchers.textContent = "12"; }
        if (elSize) { elSize.classList.remove('skeleton'); elSize.textContent = "45.2 MB"; }
        if (elDownloads) elDownloads.textContent = "52,400+";
        if (elUsers) elUsers.textContent = "2,150+";

        if (statusLabel) {
            statusLabel.textContent = 'API: Offline (Cache)';
            statusLabel.style.color = 'orange';
        }
    }
}

// --- 3. KOMENTARZE Z PAMIĘCIĄ (CACHE) ---
// Zapobiega znikaniu komentarzy na mobile przy słabym necie
async function initPublicComments() {
    const listEl = document.getElementById('commentsListPublic');
    const CACHE_KEY = 'aio_comments_cache';
    
    if (!listEl) return;

    // Funkcja renderująca HTML
    const render = (data) => {
        if (!data || data.length === 0) {
            listEl.innerHTML = '<div style="text-align:center; padding:10px; color:#8b949e;">Brak komentarzy. Bądź pierwszy!</div>';
            return;
        }
        listEl.innerHTML = data.map(c => `
            <div class="comment-item">
                <div class="comment-header" style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span style="color:#58a6ff; font-weight:bold;">${escapeHtml(c.name)}</span>
                    <span style="font-size:0.75rem; color:#8b949e;">${new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <div style="font-size:0.9rem; color:#e6edf3;">${escapeHtml(c.message)}</div>
                <div style="color:#fbbf24; font-size:0.8rem; margin-top:5px;">${'★'.repeat(c.rating || 5)}</div>
            </div>
        `).join('');
    };

    // 1. Pokaż dane z pamięci (natychmiast)
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
        render(JSON.parse(cached));
    } else {
        listEl.innerHTML = '<div style="text-align:center; padding:10px;">Ładowanie...</div>';
    }

    // 2. Pobierz świeże dane
    if (window.supabase) {
        const client = window.supabase.createClient(window.AIO_SITE.supabaseUrl, window.AIO_SITE.supabaseAnonKey);
        const { data, error } = await client
            .from('comments')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (!error && data) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(data)); // Zapisz do pamięci
            render(data); // Odśwież widok
        }
        
        // Obsługa wysyłania
        const btnSend = document.getElementById('commentSubmitBtn');
        if(btnSend) {
            // Usuwamy stare listenery
            const newBtn = btnSend.cloneNode(true);
            btnSend.parentNode.replaceChild(newBtn, btnSend);
            
            newBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const name = document.getElementById('commentNamePublic').value || 'Anonim';
                const msg = document.getElementById('commentBodyPublic').value;
                const rating = document.getElementById('commentRatingPublic').value || 5;

                if(!msg) return alert('Wpisz treść komentarza!');
                
                newBtn.disabled = true;
                newBtn.textContent = 'Wysyłanie...';

                const { error } = await client.from('comments').insert([
                    { name: name, message: msg, rating: parseInt(rating), page: 'home' }
                ]);

                if(error) {
                    alert('Błąd wysyłania: ' + error.message);
                } else {
                    alert('Komentarz dodany!');
                    document.getElementById('commentBodyPublic').value = '';
                    // Odśwież po dodaniu
                    const { data: newData } = await client.from('comments').select('*').order('created_at', { ascending: false }).limit(20);
                    if(newData) {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(newData));
                        render(newData);
                    }
                }
                newBtn.disabled = false;
                newBtn.textContent = 'Wyślij';
            });
        }
    }
}

// --- POZOSTAŁE FUNKCJE (Akordeon, Share, Menu) ---

// AKORDEON JS
const acc = document.getElementsByClassName("accordion-header");
for (let i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
        this.classList.toggle("active");
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
            url: window.location.href
        }).catch(console.error);
    } else {
        navigator.clipboard.writeText(window.location.href).then(() => alert('Link skopiowany!'));
    }
}

// Kopiowanie do schowka
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    navigator.clipboard.writeText(element.innerText).then(() => {
        alert("Skopiowano komendę!");
    });
}

// Wróć na górę
function topFunction() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.onscroll = function() {
    const btn = document.getElementById("topBtn");
    if (btn) {
        if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
            btn.style.display = "block";
        } else {
            btn.style.display = "none";
        }
    }
};

// --- MENU MOBILNE (Hamburger) ---
function initMobileMenu() {
    const toggle = document.getElementById('navToggle');
    const nav = document.querySelector('.main-navigation-bar');
    
    if (toggle && nav) {
        // Reset listenera
        const newToggle = toggle.cloneNode(true);
        toggle.parentNode.replaceChild(newToggle, toggle);
        
        newToggle.addEventListener('click', () => {
            nav.classList.toggle('responsive'); // Dodaje klasę .responsive w CSS
        });
        
        // Zamykanie po kliknięciu w link
        document.querySelectorAll('.menu-btn').forEach(link => {
            link.addEventListener('click', () => {
                if(window.innerWidth < 768) {
                    nav.classList.remove('responsive');
                }
            });
        });
    }
}

// Helpery
function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function updateThemeToggleIcon() {
    const t = document.getElementById('themeToggle');
    if(t) t.textContent = document.body.classList.contains('light') ? '🌙' : '🌞';
}

// INICJALIZACJA STARTOWA
document.addEventListener('DOMContentLoaded', () => {
    // 1. Wsparcie
    initSupportFab();
    
    // 2. Statystyki
    fetchGithubStats();
    
    // 3. Komentarze
    initPublicComments();
    
    // 4. Menu Mobilne
    initMobileMenu();
    
    // 5. Theme
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const saved = localStorage.getItem('aio_theme');
        if (saved === 'light') document.body.classList.add('light');
        updateThemeToggleIcon();
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('light');
            localStorage.setItem('aio_theme', document.body.classList.contains('light') ? 'light' : 'dark');
            updateThemeToggleIcon();
        });
    }
});
