/* script_modern.js - Główne skrypty i UX */

const SUPABASE_URL = "https://pynjjeobqzxbrvmqofcw.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5bmpqZW9icXp4YnJ2bXFvZmN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3NDA5MDYsImV4cCI6MjA4MTMxNjkwNn0.XSBB0DJw27Wrn41nranqFyj8YI0-YjLzX52dkdrgkrg";

AOS.init();

// --- 4. KOMENTARZE Z CACHE (Mobile Fix) ---
async function loadComments() {
    const CACHE_KEY = 'aio_comments_cache';
    const list = document.getElementById('commentsListPublic');
    if(!list) return;

    // Najpierw pokaż z cache (natychmiast)
    const cached = localStorage.getItem(CACHE_KEY);
    if(cached) {
        renderComments(JSON.parse(cached));
    } else {
        list.innerHTML = '<div style="text-align:center; padding:10px">Ładowanie...</div>';
    }

    if (typeof supabase === 'undefined') return;
    const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    // Pobierz świeże
    const { data, error } = await client
        .from('comments')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (!error && data && data.length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        renderComments(data);
    } else if (error && !cached) {
        list.innerHTML = '<div style="text-align:center; color:red">Błąd pobierania (sprawdź sieć).</div>';
    }
}

function renderComments(data) {
    const list = document.getElementById('commentsListPublic');
    list.innerHTML = data.map(c => `
        <div class="comment-item">
            <div style="display:flex; justify-content:space-between; color:#58a6ff; font-size:0.8rem; margin-bottom:5px;">
                <strong>${escapeHtml(c.name)}</strong>
                <span>${new Date(c.created_at).toLocaleDateString()}</span>
            </div>
            <div style="font-size:0.9rem; color:#e6edf3;">${escapeHtml(c.message)}</div>
        </div>
    `).join('');
}

async function sendComment() {
    const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const name = document.getElementById('commentNamePublic').value || 'Gość';
    const msg = document.getElementById('commentBodyPublic').value;
    const btn = document.getElementById('commentSubmitBtn');

    if(!msg) return alert("Wpisz treść!");
    btn.disabled = true; btn.textContent = "Wysyłanie...";

    const { error } = await client.from('comments').insert([{ name: name, message: msg, rating: 5, page: 'home' }]);

    if(error) { 
        alert("Błąd wysyłania."); 
    } else { 
        alert("Komentarz dodany!"); 
        document.getElementById('commentBodyPublic').value = ''; 
        loadComments(); // Odśwież
    }
    btn.disabled = false; btn.textContent = "Wyślij";
}

// --- 5. HINTY DO ROZWIJANIA (UX) ---
function initCollapsibles() {
    document.querySelectorAll('.accordion-header').forEach(btn => {
        // Dodaj hint jeśli nie ma
        if(!btn.querySelector('.accordion-hint')) {
            const hint = document.createElement('span');
            hint.className = 'accordion-hint';
            hint.textContent = '(kliknij aby rozwinąć)';
            hint.style.fontSize = '0.7em';
            hint.style.color = '#94a3b8';
            hint.style.marginLeft = '10px';
            hint.style.fontWeight = 'normal';
            btn.appendChild(hint);
        }
        
        // Obsługa kliknięcia
        btn.addEventListener('click', function() {
            this.classList.toggle("active");
            const panel = this.nextElementSibling;
            if (panel.style.maxHeight) {
                panel.style.maxHeight = null;
            } else {
                panel.style.maxHeight = panel.scrollHeight + "px";
            }
        });
    });
}

// --- 6. MOBILE MENU & UTILS ---
function toggleMobileMenu() {
    const nav = document.querySelector('.main-navigation-bar');
    nav.classList.toggle('responsive');
}

function escapeHtml(text) {
    if (!text) return text;
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function topFunction() { window.scrollTo({top: 0, behavior: 'smooth'}); }
function copyToClipboard(id) {
    const el = document.getElementById(id);
    navigator.clipboard.writeText(el.innerText);
    alert("Skopiowano!");
}

// START
document.addEventListener('DOMContentLoaded', () => {
    fetchGithubStats(); // z enhancements.js
    loadComments();
    initCollapsibles();
    
    // Obsługa przycisku wysyłania komentarza
    const btn = document.getElementById('commentSubmitBtn');
    if(btn) btn.addEventListener('click', sendComment);

    // Hamburger Menu
    const toggle = document.getElementById('navToggle');
    if(toggle) toggle.addEventListener('click', toggleMobileMenu);
});
