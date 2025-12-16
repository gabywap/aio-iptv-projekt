Co zmienia v2 (optymalizacja układu):

1) Karty w Dashboardzie nie rozciągają się do wysokości największej w wierszu.
   - Grid ma align-items:start (koniec sztucznego pustego miejsca).

2) Dashboard/Lab/Debugger są "rozwijane":
   - Dashboard: tylko "Monitor Zasobów" otwarty domyślnie, reszta zwinięta (kliknij nagłówek).
   - Lab + Debugger: na komputerze otwarte domyślnie, na telefonie zwinięte (żeby nie zajmowały ekranu).

3) Chat i Debugger nie wymuszają dużej wysokości:
   - chat-messages: max-height zamiast stałej wysokości
   - textarea/debug-results: mniejsze min-height

Wdrożenie:
- Podmień w repo: index.html, enhancements.css, enhancements.js
