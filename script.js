/* script.js - Logika dla AIO-IPTV.pl - WERSJA ULEPSZONA */

// Inicjalizacja animacji AOS
AOS.init();

// AKORDEON JS
const acc = document.getElementsByClassName("accordion-header");
for (let i = 0; i < acc.length; i++) {
    acc[i].addEventListener("click", function() {
        // Zamknij wszystkie inne otwarte
        const currentActive = document.querySelector(".accordion-item.active");
        if (currentActive && currentActive !== this.parentElement) {
            currentActive.classList.remove("active");
            currentActive.querySelector(".accordion-content").style.maxHeight = null;
        }

        // Przełącz kliknięty
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
        })
        .catch((error) => console.log('Błąd udostępniania', error));
    } else {
        navigator.clipboard.writeText(window.location.href).then(function() {
            alert('Link do strony został skopiowany do schowka!');
        }, function(err) {
            alert('Nie udało się skopiować linku.');
        });
    }
}

// Funkcja Kopiowania Komend
function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    const text = element.innerText || element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        // Efekt wizualny na przycisku
        const btn = element.nextElementSibling; // Zakładamy, że button jest zaraz po divie
        if(btn && btn.tagName === 'BUTTON') {
            const originalText = btn.innerText;
            btn.innerText = "✅ Skopiowano!";
            btn.style.backgroundColor = "#238636";
            btn.style.color = "white";
            
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.backgroundColor = ""; // Reset do stylów CSS
                btn.style.color = "";
            }, 2000);
        } else {
            alert("Skopiowano komendę do schowka!");
        }
    }).catch(err => {
        console.error('Błąd kopiowania:', err);
        alert("Nie udało się skopiować automatycznie. Zaznacz tekst ręcznie.");
    });
}

// POBIERANIE STATYSTYK Z GITHUB (Nowość)
async function fetchGithubStats() {
    const user = 'OliOli2013';
    const repo = 'aio-iptv-projekt';
    
    try {
        // 1. Pobierz info o repozytorium (gwiazdki, rozmiar)
        const repoRes = await fetch(`https://api.github.com/repos/${user}/${repo}`);
        if (!repoRes.ok) return; // Jeśli błąd, przerywamy cicho

        const repoData = await repoRes.json();
        
        // Wypełnij pola statystyk (jeśli istnieją w HTML)
        const elStars = document.getElementById('repo-stars');
        const elWatchers = document.getElementById('repo-watchers');
        const elSize = document.getElementById('repo-size');
        const elDate = document.getElementById('repo-date');

        if(elStars) elStars.innerText = repoData.stargazers_count || 0;
        if(elWatchers) elWatchers.innerText = repoData.watchers_count || 0;
        if(elSize) elSize.innerText = (repoData.size / 1024).toFixed(1) + ' MB';

        // 2. Data aktualizacji (używamy push_at dla dokładności)
        if(elDate && repoData.pushed_at) {
            const dateObj = new Date(repoData.pushed_at);
            const formattedDate = dateObj.toLocaleDateString('pl-PL', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            elDate.innerHTML = `Ostatnia aktualizacja repozytorium: <strong>${formattedDate}</strong>`;
        }

    } catch (e) {
        console.log('Błąd pobierania statystyk GitHub:', e);
    }
}
// Uruchom pobieranie po załadowaniu
document.addEventListener('DOMContentLoaded', fetchGithubStats);


// ULEPSZONA WYSZUKIWARKA
function filterList() {
    const input = document.getElementById('searchBox');
    const filter = input.value.toLowerCase();

    // 1. Filtruj listy plików
    const lists = document.querySelectorAll('.file-list li');
    lists.forEach(item => {
        if (item.closest('.accordion-content')) return;
        const txtValue = item.textContent || item.innerText;
        if (txtValue.toLowerCase().indexOf(filter) > -1) {
            item.style.display = "";
        } else {
            item.style.display = "none";
        }
    });

    // 2. Filtruj Akordeony
    const accordions = document.querySelectorAll('.accordion-item');
    accordions.forEach(item => {
        const header = item.querySelector('.accordion-header');
        const content = item.querySelector('.accordion-content');
        const text = (header.textContent + content.textContent).toLowerCase();

        if (text.indexOf(filter) > -1) {
            item.style.display = "";
            if (filter !== "") {
                item.classList.add("active");
                content.style.maxHeight = content.scrollHeight + "px";
            } else {
                item.classList.remove("active");
                content.style.maxHeight = null;
            }
        } else {
            item.style.display = "none";
        }
    });
}

// Funkcja Wróć na górę
let mybutton = document.getElementById("topBtn");
window.onscroll = function() {scrollFunction()};

function scrollFunction() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        mybutton.style.display = "block";
    } else {
        mybutton.style.display = "none";
    }
}

function topFunction() {
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

// Auto-hide header
let lastScroll = 0;
const header = document.querySelector('header');

window.addEventListener('scroll', () => {
    if (window.innerWidth > 600) return; 

    const currentScroll = window.pageYOffset;
    if (currentScroll <= 0) {
        header.classList.remove('hide');
        return;
    }
    if (currentScroll > lastScroll && currentScroll > 50) {
        header.classList.add('hide');
    } else {
        header.classList.remove('hide');
    }
    lastScroll = currentScroll;
});

// Przewijanie do pola wyszukiwania
document.getElementById('searchBox').addEventListener('focus', function () {
    if (window.innerWidth <= 600) {
        setTimeout(() => {
            this.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }
});

// Prosty lokalny licznik wizyt
document.addEventListener('DOMContentLoaded', () => {
    const counterElement = document.getElementById('local-visit-counter');
    if (!counterElement) return;

    const storageKey = 'aio_iptv_visit_count';
    let count = parseInt(localStorage.getItem(storageKey) || '0', 10);
    count += 1;
    localStorage.setItem(storageKey, String(count));
    counterElement.textContent = count;
});
