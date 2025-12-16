# AIO-IPTV – Local Bridge (API)

Ten folder jest przygotowany pod „prawdziwe dane” z tunera w Dashboardzie, bez problemów CORS na GitHub Pages.

## Dlaczego to jest potrzebne?

Przeglądarka (strona na GitHub Pages) nie może bezpośrednio:
- logować się do tunera przez FTP/SSH
- pobierać danych z endpointów, jeśli blokuje to CORS / polityka sieci prywatnej

Rozwiązaniem jest mały serwer lokalny (proxy) uruchomiony na Twoim PC w tej samej sieci co tuner.

## Wymagania

- Node.js 18+ (zalecane)
- tuner Enigma2 w tej samej sieci LAN
- włączony FTP i OpenWebif w tunerze

## Instalacja

Wejdź do folderu `api/` i wykonaj:

```bash
npm init -y
npm install express cors basic-ftp
```

## Uruchomienie

```bash
node bridge-server.js
```

Domyślnie działa na: `http://localhost:8787`

## Konfiguracja w stronie

W Dashboardzie (sekcja „Połączenie z tunerem (LAN)”):
- Bridge URL: `http://localhost:8787`
- IP tunera: np. `192.168.1.20`
- Login: `root`
- Hasło: Twoje hasło FTP (root)

Po połączeniu, „Monitor Zasobów” oraz „Diagnostyka” pobierają dane z tunera.

## Zmiana portu i CORS (opcjonalnie)

Port:
```bash
PORT=8787 node bridge-server.js
```

Dopuszczone originy (jeśli chcesz ograniczyć CORS):
```bash
ALLOWED_ORIGINS=https://olioli2013.github.io,http://localhost:8000 node bridge-server.js
```

## Endpointy

- `GET /api/health`
- `POST /api/session` → tworzy sesję (testuje FTP)
- `DELETE /api/session/:token` → usuwa sesję
- `GET /api/tuner/status?token=...` → CPU/RAM/Dysk (OpenWebif)
- `GET /api/tuner/diagnostic?token=...`
- `POST /api/tuner/log` → pobierz plik logów przez FTP

## Ważne bezpieczeństwo

Nie wystawiaj tego serwera do Internetu. To ma działać tylko lokalnie w LAN.
