AIO-IPTV / Enigma2 Hub

Nowoczesne centrum dla użytkowników Enigma2: pliki do pobrania, poradniki, narzędzia oraz wygodny panel webowy działający na GitHub Pages. Projekt jest tworzony z myślą o image’ach OpenATV / OpenPLi / Egami oraz narzędziach typu OSCam.

Co dostajesz

Stronę w stylu nowoczesnego panelu (GitHub Pages, bez backendu)

Wtyczki, listy kanałów i paczki – w jednym miejscu

Centrum wiedzy Enigma2: wyszukiwarka + tagi + mini-tutoriale

Narzędzia Enigma2: gotowe komendy i akcje (z przyciskiem „kopiuj”)

AI-Chat Enigma2 (offline): szybkie podpowiedzi o piconach, listach, OSCam, logach, restartach GUI itd.

Powiadomienia (dzwoneczek): changelog zmian na stronie + licznik nieprzeczytanych

PWA / Offline: szybsze ładowanie i podstawowa praca bez internetu

Oficjalna strona

AIO-IPTV.pl – pobieranie, poradniki i narzędzia w jednym panelu.

Jak to działa technicznie

Projekt jest w pełni statyczny:

działa na GitHub Pages

bez kluczy API i bez serwera

dane (wiedza, narzędzia, zmiany) są w plikach data/*.json

Najważniejsze pliki

index.html – strona

script_modern.js – logika (AI-Chat, powiadomienia, wyszukiwarka, kopiowanie)

home_modern.css / style.css – UI

data/knowledge.json – baza wiedzy Enigma2

data/tools.json – narzędzia/komendy

data/updates.json – powiadomienia/changelog

manifest.json, service-worker.js, offline.html – PWA

Autor

Paweł Pawełek
Kontakt: msisystem@t.pl

Licencja: MIT
