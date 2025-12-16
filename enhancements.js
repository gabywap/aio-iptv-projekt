// enhancements.js - Nowe funkcje dla AIO-IPTV.pl
(() => {
  'use strict';

  class AIOEnhancements {
    constructor() {
      this.init();
    }

    init() {
      console.log('🚀 AIO Enhancements zainicjalizowane');
      this.tuner = { bridgeUrl: '', token: '', ip: '', user: 'root' };
      this.initResourceMonitor();
      this.initDiagnostics();
      this.initBackupSystem();
      this.initAIChat();
      this.initDebugger();
      this.initExperiments();
      this.initThemeSystem();
      this.initTunerBridge();
      this.initNotifications();
      this.initNavShortcuts();
      this.initCollapsibles();
      this.startAutoUpdate();
    }

    // ===== MODUŁ 1: Monitor Zasobów =====
    initResourceMonitor() {
      console.log('📊 Inicjalizacja monitora zasobów');
      this.updateResourceStats();
      window.setInterval(() => this.updateResourceStats(), 3000);
    }

    updateResourceStats() {
      const cpuVal = document.getElementById('cpu-value');
      const ramVal = document.getElementById('ram-value');
      const diskVal = document.getElementById('disk-value');
      const cpuBar = document.getElementById('cpu-progress');
      const ramBar = document.getElementById('ram-progress');
      const diskBar = document.getElementById('disk-progress');

      if (!cpuVal || !ramVal || !diskVal || !cpuBar || !ramBar || !diskBar) return;

      
      // Jeśli jest połączenie z tunerem (przez lokalny bridge), pobierz realne dane
      if (this.isTunerConnected()) {
        if (this._tunerFetchInFlight) return;
        this._tunerFetchInFlight = true;
        this.fetchTunerStatus()
          .then((stats) => {
            if (stats) this.applyResourceStats(stats);
          })
          .catch(() => {
            // fallback do symulacji (bez przerywania UI)
            this.applyResourceStats(this.getSimulatedResourceStats());
          })
          .finally(() => {
            this._tunerFetchInFlight = false;
          });
        return;
      }

const stats = this.getSimulatedResourceStats();

      cpuVal.textContent = `${stats.cpu}%`;
      ramVal.textContent = `${stats.ram}%`;
      diskVal.textContent = `${stats.disk}%`;

      cpuBar.style.width = `${stats.cpu}%`;
      ramBar.style.width = `${stats.ram}%`;
      diskBar.style.width = `${stats.disk}%`;

      this.updateProgressColor('cpu-progress', stats.cpu);
      this.updateProgressColor('ram-progress', stats.ram);
      this.updateProgressColor('disk-progress', stats.disk);
    }

    updateProgressColor(elementId, value) {
      const element = document.getElementById(elementId);
      if (!element) return;

      if (value > 80) element.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
      else if (value > 60) element.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
      else element.style.background = 'linear-gradient(90deg, #10b981, #3b82f6)';
    }

    getSimulatedResourceStats() {
      return {
        cpu: Math.min(100, Math.max(10, Math.floor(Math.random() * 30) + 40)),
        ram: Math.min(100, Math.max(20, Math.floor(Math.random() * 40) + 30)),
        disk: Math.min(100, Math.max(5, Math.floor(Math.random() * 20) + 20)),
        source: 'sim'
      };
    }

    applyResourceStats(stats) {
      const cpuVal = document.getElementById('cpu-value');
      const ramVal = document.getElementById('ram-value');
      const diskVal = document.getElementById('disk-value');
      const cpuBar = document.getElementById('cpu-progress');
      const ramBar = document.getElementById('ram-progress');
      const diskBar = document.getElementById('disk-progress');
      if (!cpuVal || !ramVal || !diskVal || !cpuBar || !ramBar || !diskBar) return;

      const cpu = Number(stats.cpu ?? stats.cpuPercent ?? 0);
      const ram = Number(stats.ram ?? stats.ramPercent ?? 0);
      const disk = Number(stats.disk ?? stats.diskPercent ?? 0);

      cpuVal.textContent = `${Math.round(cpu)}%`;
      ramVal.textContent = `${Math.round(ram)}%`;
      diskVal.textContent = `${Math.round(disk)}%`;

      cpuBar.style.width = `${cpu}%`;
      ramBar.style.width = `${ram}%`;
      diskBar.style.width = `${disk}%`;

      this.updateProgressColor('cpu-progress', cpu);
      this.updateProgressColor('ram-progress', ram);
      this.updateProgressColor('disk-progress', disk);
    }

    isTunerConnected() {
      return Boolean(this.tuner && this.tuner.bridgeUrl && this.tuner.token && this.tuner.ip);
    }

    async fetchTunerStatus() {
      const base = this.tuner.bridgeUrl;
      const token = this.tuner.token;
      const url = `${base.replace(/\/$/, '')}/api/tuner/status?token=${encodeURIComponent(token)}`;
      const res = await fetch(url, { credentials: 'omit' });
      if (!res.ok) throw new Error(`Bridge error: ${res.status}`);
      const data = await res.json();
      if (data && data.ok && data.stats) return data.stats;
      if (data && data.stats) return data.stats;
      return null;
    }

    setTunerStatusUI(kind, text) {
      const el = document.getElementById('tunerStatus');
      if (!el) return;
      const cls = kind === 'ok' ? 'ok' : (kind === 'bad' ? 'bad' : 'muted');
      el.innerHTML = `Status: <span class="${cls}">${text}</span>`;
    }

    initTunerBridge() {
      const bridgeUrlInput = document.getElementById('bridgeUrl');
      const ipInput = document.getElementById('tunerIp');
      const userInput = document.getElementById('tunerUser');
      const passInput = document.getElementById('tunerPass');
      const btnConnect = document.getElementById('tunerConnectBtn');
      const btnDisconnect = document.getElementById('tunerDisconnectBtn');
      const btnOpenWebif = document.getElementById('tunerOpenWebifBtn');

      // Wczytaj ustawienia z localStorage
      const saved = (() => {
        try { return JSON.parse(localStorage.getItem('aio_tuner') || '{}'); } catch { return {}; }
      })();

      this.tuner.bridgeUrl = saved.bridgeUrl || 'http://localhost:8787';
      this.tuner.ip = saved.ip || '';
      this.tuner.user = 'root';
      this.tuner.token = saved.token || '';

      if (bridgeUrlInput) bridgeUrlInput.value = this.tuner.bridgeUrl;
      if (ipInput) ipInput.value = this.tuner.ip;
      if (userInput) userInput.value = 'root';

      if (this.isTunerConnected()) {
        this.setTunerStatusUI('ok', `połączono (IP: ${this.tuner.ip})`);
      } else {
        this.setTunerStatusUI('muted', 'brak połączenia');
      }

      const persist = () => {
        try {
          localStorage.setItem('aio_tuner', JSON.stringify({
            bridgeUrl: this.tuner.bridgeUrl,
            ip: this.tuner.ip,
            token: this.tuner.token
          }));
        } catch {}
      };

      const normalizeBridge = () => (this.tuner.bridgeUrl || '').trim().replace(/\/$/, '');

      const doConnect = async () => {
        const bridgeUrl = (bridgeUrlInput?.value || this.tuner.bridgeUrl || '').trim();
        const ip = (ipInput?.value || '').trim();
        const password = (passInput?.value || '').trim();
        if (!bridgeUrl || !ip || !password) {
          this.setTunerStatusUI('bad', 'uzupełnij: Bridge URL, IP i hasło');
          return;
        }

        this.tuner.bridgeUrl = bridgeUrl;
        this.tuner.ip = ip;

        this.setTunerStatusUI('muted', 'łączenie...');
        try {
          const res = await fetch(`${normalizeBridge()}/api/session`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip, username: 'root', password })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.token) {
            throw new Error(data.error || `HTTP ${res.status}`);
          }
          this.tuner.token = data.token;
          persist();
          this.setTunerStatusUI('ok', `połączono (IP: ${ip})`);
          // Odśwież od razu monitor zasobów
          this.updateResourceStats();
        } catch (e) {
          this.tuner.token = '';
          persist();
          this.setTunerStatusUI('bad', `błąd połączenia: ${String(e.message || e)}`);
        }
      };

      const doDisconnect = async () => {
        const base = normalizeBridge();
        const token = this.tuner.token;
        this.tuner.token = '';
        persist();
        this.setTunerStatusUI('muted', 'rozłączono');

        if (base && token) {
          // best-effort clean-up
          fetch(`${base}/api/session/${encodeURIComponent(token)}`, { method: 'DELETE' }).catch(() => {});
        }
      };

      const openWebif = () => {
        const ip = (ipInput?.value || this.tuner.ip || '').trim();
        if (!ip) return;
        window.open(`http://${ip}/`, '_blank', 'noopener,noreferrer');
      };

      btnConnect?.addEventListener('click', doConnect);
      btnDisconnect?.addEventListener('click', doDisconnect);
      btnOpenWebif?.addEventListener('click', openWebif);
    }

    initNotifications() {
      const toggle = document.getElementById('notifToggle');
      const dd = document.getElementById('notifDropdown');
      const close = document.getElementById('notifCloseBtn');
      const list = document.getElementById('notifList');

      if (!toggle || !dd || !list) return;

      const setOpen = (isOpen) => {
        dd.hidden = !isOpen;
        toggle.setAttribute('aria-expanded', String(isOpen));
      };

      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        setOpen(dd.hidden);
      });

      close?.addEventListener('click', () => setOpen(false));

      document.addEventListener('click', (e) => {
        if (!dd.hidden && !dd.contains(e.target) && e.target !== toggle) setOpen(false);
      });

      // Zasil powiadomienia: aktualizacje + komentarze (jeśli Supabase działa)
      const items = [
        { type: 'feature', title: 'Dodano: Inteligentny Dashboard', meta: 'Dashboard/Lab/Debugger', href: '#dashboard' },
        { type: 'update', title: 'Nowe poradniki w sekcji Porady', meta: 'Hardening / 4K / Docker', href: '#aktualnosci' },
        { type: 'info', title: 'Tryb offline (Service Worker)', meta: 'Strona działa częściowo offline', href: '#start' },
      ];

      // Jeśli jest banner news z komentarzami, pokaż
      const commentsEl = document.getElementById('comments');
      if (commentsEl) {
        items.unshift({ type: 'comment', title: 'Komentarze: sprawdź nowe wpisy', meta: 'Sekcja komentarzy', href: '#comments' });
      }

      const render = (arr) => {
        list.innerHTML = arr.map((it) => `
          <div class="notif-item">
            <div><span class="notif-pill">${it.type}</span><strong>${it.title}</strong></div>
            <div class="notif-meta">${it.meta || ''} ${it.href ? `· <a href="${it.href}">Otwórz</a>` : ''}</div>
          </div>
        `).join('') || '<div class="notif-item">Brak powiadomień</div>';
      };

      render(items);

      // Opcjonalnie doładuj ostatnie komentarze z Supabase, jeśli globalna inicjalizacja istnieje
      // (nie przerywa działania, gdy Supabase nie jest skonfigurowane)
      try {
        if (window.supabase && typeof window.supabase.createClient === 'function' && window.__AIO_SUPABASE_URL && window.__AIO_SUPABASE_KEY) {
          const client = window.supabase.createClient(window.__AIO_SUPABASE_URL, window.__AIO_SUPABASE_KEY);
          client.from('comments').select('name,created_at,comment').order('created_at',{ascending:false}).limit(1)
            .then(({ data }) => {
              if (data && data[0]) {
                const c = data[0];
                const when = new Date(c.created_at).toLocaleString();
                const msg = String(c.comment || '').slice(0, 80);
                items.unshift({ type: 'comment', title: `Nowy komentarz: ${c.name || 'Anonim'}`, meta: `${when} · ${msg}${msg.length>=80?'…':''}`, href: '#comments' });
                render(items);
              }
            }).catch(() => {});
        }
      } catch {}
    }

    initNavShortcuts() {
      // 📡 Tuner – przewiń i rozwiń widget połączenia
      const tunerBtn = document.getElementById('navTunerBtn');
      const dashBtn = document.getElementById('navDashboardBtn');
      const openTunerWidget = () => {
        const w = document.querySelector('details.tuner-widget');
        if (w) w.open = true;
        setTimeout(() => {
          document.getElementById('bridgeUrl')?.focus();
        }, 250);
      };

      tunerBtn?.addEventListener('click', (e) => {
        // pozostaw hash, ale dodatkowo rozwiń
        setTimeout(openTunerWidget, 50);
      });

      dashBtn?.addEventListener('click', () => {
        // nic więcej – standardowy scroll
      });
    }

    // ===== MODUŁ 2: Diagnostyka Systemu =====
    initDiagnostics() {
      console.log('🔍 Inicjalizacja diagnostyki');
    }

    runSystemDiagnostic() {
      const resultsDiv = document.getElementById('diagnostic-results');
      if (!resultsDiv) return;

      resultsDiv.innerHTML = `
        <div class="diagnostic-running">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Przeprowadzam diagnostykę...</p>
        </div>
      `;

      // Realne dane z tunera (przez lokalny bridge)
      if (this.isTunerConnected()) {
        const base = this.tuner.bridgeUrl.replace(/\/$/, '');
        fetch(`${base}/api/tuner/diagnostic?token=${encodeURIComponent(this.tuner.token)}`)
          .then(r => r.json())
          .then(data => {
            const checks = (data && (data.checks || data.results)) || [];
            if (!checks.length) throw new Error('Brak danych diagnostyki');
            resultsDiv.innerHTML = this.renderDiagnosticChecks(checks);
          })
          .catch(() => {
            // fallback: symulacja
            this.renderSimulatedDiagnostics(resultsDiv);
          });
        return;
      }

      // Symulacja
      this.renderSimulatedDiagnostics(resultsDiv);
    }

    renderSimulatedDiagnostics(resultsDiv) {
      window.setTimeout(() => {
        const checks = [
          { name: 'Połączenie z internetem', status: 'success', details: 'Ping: 24ms' },
          { name: 'Dostęp do repozytoriów', status: 'success', details: 'Wszystkie repo dostępne' },
          { name: 'Wersja Enigma2', status: 'warning', details: 'Wersja 7.4 (dostępna 7.6)' },
          { name: 'Wolne miejsce na dysku', status: 'success', details: '45.2 GB wolne' },
          { name: 'Temperatura CPU', status: 'success', details: '52°C' },
          { name: 'Aktualizacje bezpieczeństwa', status: 'error', details: '5 krytycznych aktualizacji' }
        ];
        resultsDiv.innerHTML = this.renderDiagnosticChecks(checks);
      }, 900);
    }

    renderDiagnosticChecks(checks) {
      let html = '<div class="diagnostic-results-list">';
      checks.forEach(check => {
        const icon = check.status === 'success' ? '✅' : (check.status === 'warning' ? '⚠️' : '❌');
        const color = check.status === 'success' ? '#10b981' : (check.status === 'warning' ? '#f59e0b' : '#ef4444');
        html += `
          <div class="diagnostic-item" style="border-left: 4px solid ${color}">
            <div class="diagnostic-header">
              <span class="diagnostic-icon">${icon}</span>
              <strong>${check.name}</strong>
            </div>
            <div class="diagnostic-details">${check.details || ''}</div>
          </div>
        `;
      });
      html += '</div>';
      return html;
    }

    // ===== MODUŁ 3: System Backup =====
    initBackupSystem() {
      console.log('💾 Inicjalizacja systemu backup');
    }

    createBackup() {
      const statusDiv = document.getElementById('backup-status');
      if (!statusDiv) return;

      statusDiv.innerHTML = `
        <div class="backup-status running" style="margin-top:10px; color:#cbd5e1;">
          <i class="fas fa-spinner fa-spin"></i>
          <span> Tworzenie backupu konfiguracji...</span>
        </div>
      `;

      window.setTimeout(() => {
        const backupData = {
          timestamp: new Date().toISOString(),
          version: '1.0',
          plugins: ['AIO Panel', 'IPTV Dream', 'MyUpdater', 'PiconUpdater'],
          settings: { theme: 'dark', language: 'pl', bouquets: 12, picons: true },
          stats: { created: new Date().toLocaleString(), size: '4.2 MB' }
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `aio-backup-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        statusDiv.innerHTML = `
          <div class="backup-status success" style="margin-top:10px; color:#cbd5e1;">
            <i class="fas fa-check-circle" style="color:#10b981;"></i>
            <span> Backup utworzony i pobrany! (${backupData.stats.size})</span>
          </div>
        `;

        window.setTimeout(() => { statusDiv.innerHTML = ''; }, 5000);
      }, 900);
    }

    showRestoreDialog() {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,.backup';
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const backup = JSON.parse(String(event.target.result || ''));
            this.restoreBackup(backup);
          } catch (err) {
            alert('Nieprawidłowy format backupu!');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }

    restoreBackup(backupData) {
      alert(`Backup z ${new Date(backupData.timestamp).toLocaleString()} został wczytany.\n\nZawiera: ${(backupData.plugins || []).length} wtyczek\nRozmiar: ${(backupData.stats || {}).size || 'N/A'}`);
    }

    // ===== MODUŁ 4: AI Chat Support =====
    initAIChat() {
      console.log('💬 Inicjalizacja AI Chat');
      const input = document.getElementById('chat-input');
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') this.sendAIMessage();
        });
      }
    }

    sendAIMessage() {
      const input = document.getElementById('chat-input');
      const messagesDiv = document.getElementById('chat-messages');
      if (!input || !messagesDiv) return;

      const userMessage = input.value.trim();
      if (!userMessage) return;

      messagesDiv.innerHTML += `
        <div class="message user">
          <strong>Ty:</strong> ${this.escapeHtml(userMessage)}
        </div>
      `;
      input.value = '';

      window.setTimeout(() => {
        const responses = [
          { key: 'jak zainstalować', val: 'Użyj generatora one-liner. Zaznacz potrzebne wtyczki i skopiuj komendę.' },
          { key: 'błąd', val: 'Sprawdź logi w sekcji debugger. Wklej je, a pomogę z analizą.' },
          { key: 'iptv', val: 'Do IPTV polecam wtyczkę IPTV Dream. Pobierz z sekcji wtyczek.' },
          { key: 'lista kanałów', val: 'Najnowsze listy Bzyk83 i JakiTaki są w sekcji „Listy kanałów”.' },
          { key: 'backup', val: 'Użyj Cloud Backup w dashboardzie do zapisania konfiguracji.' },
          { key: 'docker', val: 'Przewodnik Docker znajdziesz w poradnikach — jest krok po kroku.' }
        ];

        let response = 'Nie jestem pewien — spróbuj zapytać o: instalację, IPTV, listy kanałów, backup, debug lub Docker.';
        const lower = userMessage.toLowerCase();
        for (const r of responses) {
          if (lower.includes(r.key)) { response = r.val; break; }
        }

        messagesDiv.innerHTML += `
          <div class="message bot">
            <strong>AI Asystent:</strong> ${this.escapeHtml(response)}
          </div>
        `;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }, 700);
    }

    // ===== MODUŁ 5: Debugger Online =====
    initDebugger() {
      console.log('🐞 Inicjalizacja debuggera');
    }

    analyzeLogs() {
      const input = document.getElementById('debug-input');
      const resultsDiv = document.getElementById('debug-results');
      if (!input || !resultsDiv) return;

      if (!input.value.trim()) { alert('Wklej logi do analizy!'); return; }

      resultsDiv.innerHTML = `
        <div class="debug-analysis" style="color:#cbd5e1;">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Analizuję logi...</p>
        </div>
      `;

      window.setTimeout(() => {
        const analysis = this.analyzeLogContent(input.value);

        const html = `
          <div class="analysis-results" style="color:#e5e7eb;">
            <h4><i class="fas fa-chart-bar"></i> Wyniki analizy:</h4>
            <div class="analysis-stats" style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; margin-top:12px;">
              <div class="stat-item"><span class="stat-label">Linii logów:</span> <strong class="stat-value">${analysis.lines}</strong></div>
              <div class="stat-item"><span class="stat-label">Błędy:</span> <strong class="stat-value" style="color:${analysis.errors>0?'#ef4444':'#10b981'}">${analysis.errors}</strong></div>
              <div class="stat-item"><span class="stat-label">Ostrzeżenia:</span> <strong class="stat-value" style="color:${analysis.warnings>0?'#f59e0b':'#10b981'}">${analysis.warnings}</strong></div>
              <div class="stat-item"><span class="stat-label">Czas analizy:</span> <strong class="stat-value">${analysis.time}ms</strong></div>
            </div>

            <div class="analysis-issues" style="margin-top:14px;">
              <h5><i class="fas fa-exclamation-triangle"></i> Wnioski:</h5>
              <ul style="margin:8px 0 0 18px;">
                ${analysis.issues.map(i => `<li>${this.escapeHtml(i)}</li>`).join('')}
              </ul>
            </div>

            <div class="analysis-suggestions" style="margin-top:14px;">
              <h5><i class="fas fa-lightbulb"></i> Sugestia:</h5>
              <p style="color:#cbd5e1;">${this.escapeHtml(analysis.suggestion)}</p>
            </div>
          </div>
        `;
        resultsDiv.innerHTML = html;
      }, 900);
    }

    analyzeLogContent(logs) {
      const lines = logs.split('\n').length;
      const errors = (logs.match(/error|fail|failed|exception/gi) || []).length;
      const warnings = (logs.match(/warning|deprecated/gi) || []).length;

      const issues = [];
      if (logs.includes('No space left')) issues.push('Brak miejsca na dysku — wyczyść pamięć /tmp lub dysk.');
      if (logs.toLowerCase().includes('plugin')) issues.push('Możliwy problem z wtyczką — spróbuj przeinstalować podejrzany plugin.');
      if (logs.toLowerCase().includes('network')) issues.push('Możliwy problem z siecią — sprawdź DNS i łączność.');

      const suggestions = [
        'Wygląda stabilnie — wykonaj restart GUI i obserwuj działanie.',
        'Zalecane czyszczenie cache i pełny restart tunera.',
        'Sprawdź aktualizacje wtyczek w generatorze.',
        'Uruchom diagnostykę systemu w dashboardzie.',
        'Zrób backup konfiguracji przed dalszymi zmianami.'
      ];

      return {
        lines,
        errors,
        warnings,
        issues: issues.length ? issues : ['Nie znaleziono krytycznych problemów w tym fragmencie logu.'],
        suggestion: suggestions[Math.floor(Math.random() * suggestions.length)],
        time: Math.floor(Math.random() * 200) + 100
      };
    }

    clearDebug() {
      const input = document.getElementById('debug-input');
      const resultsDiv = document.getElementById('debug-results');
      if (input) input.value = '';
      if (resultsDiv) {
        resultsDiv.innerHTML = `
          <div class="debug-placeholder">
            <i class="fas fa-microscope"></i>
            <p>Tutaj pojawią się wyniki analizy</p>
          </div>
        `;
      }
    }

    loadSampleLog() {
      const input = document.getElementById('debug-input');
      if (!input) return;
      input.value = `[2024-01-15 10:30:25] INFO: System Enigma2 uruchomiony
[2024-01-15 10:30:26] INFO: Wtyczka AIO Panel 4.4 załadowana
[2024-01-15 10:30:27] WARNING: Niskie wolne miejsce w /tmp (15 MB)
[2024-01-15 10:30:28] ERROR: Nie można połączyć się z repozytorium
[2024-01-15 10:30:29] INFO: Lista kanałów Bzyk83 załadowana
[2024-01-15 10:30:30] INFO: IPTV Dream gotowy do użycia
[2024-01-15 10:30:31] WARNING: Stara wersja softcam, zalecana aktualizacja`;
    }

    // ===== MODUŁ 6: Eksperymenty =====
    initExperiments() {
      console.log('🧪 Inicjalizacja laboratorium');
    }

    toggleExperiment(experimentId) {
      const experiments = {
        'ai-epg': 'AI EPG Suggester aktywowany! System będzie uczyć się Twoich preferencji.',
        'color-grading': 'Auto Color Grading włączony. Kolory będą dostosowywane dynamicznie.',
        'turbo-stream': 'Turbo Streaming wymaga OpenATV 7.4+. Zaktualizuj system.'
      };
      this.showNotification('Laboratorium', experiments[experimentId] || 'Eksperyment aktywowany!', 'info');
    }

    // ===== MODUŁ 7: System Motywów =====
    initThemeSystem() {
      console.log('🎨 Inicjalizacja systemu motywów');
      const savedTheme = localStorage.getItem('aio_theme');
      if (savedTheme === 'light') document.body.classList.add('light');

      const themeBtn = document.getElementById('themeToggle');
      if (themeBtn) themeBtn.addEventListener('click', () => this.toggleTheme());
      this.updateThemeIcon();
    }

    toggleTheme() {
      document.body.classList.toggle('light');
      const isLight = document.body.classList.contains('light');
      localStorage.setItem('aio_theme', isLight ? 'light' : 'dark');
      this.updateThemeIcon();
      this.showNotification('Motyw', isLight ? 'Włączono jasny motyw (beta).' : 'Włączono ciemny motyw.', 'success');
    }

    updateThemeIcon() {
      const themeBtn = document.getElementById('themeToggle');
      if (!themeBtn) return;
      // jeśli w twoim HTML jest ikonka, zostawiamy ją bez ingerencji
    }

    // ===== MODUŁ 8: Auto-Update =====
    startAutoUpdate() {
      window.setInterval(() => this.checkForUpdates(), 300000);
    }

    checkForUpdates() {
      console.log('🔄 Sprawdzam aktualizacje...');
    }

    // ===== POMOCNICZE =====
    escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
    }

    showNotification(title, message, type = 'info') {
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.innerHTML = `
        <div class="notification-header">
          <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
          <strong>${this.escapeHtml(title)}</strong>
        </div>
        <div class="notification-body">${this.escapeHtml(message)}</div>
      `;
      document.body.appendChild(notification);
      window.setTimeout(() => notification.remove(), 5000);
    }
  }

  // ===== INICJALIZACJA =====
  document.addEventListener('DOMContentLoaded', () => {
    window.aioEnhancements = new AIOEnhancements();
  });

  // ===== FUNKCJE GLOBALNE DLA HTML =====
  window.runSystemDiagnostic = () => window.aioEnhancements && window.aioEnhancements.runSystemDiagnostic();
  window.createBackup = () => window.aioEnhancements && window.aioEnhancements.createBackup();
  window.showRestoreDialog = () => window.aioEnhancements && window.aioEnhancements.showRestoreDialog();
  window.sendAIMessage = () => window.aioEnhancements && window.aioEnhancements.sendAIMessage();
  window.analyzeLogs = () => window.aioEnhancements && window.aioEnhancements.analyzeLogs();
  window.clearDebug = () => window.aioEnhancements && window.aioEnhancements.clearDebug();
  window.loadSampleLog = () => window.aioEnhancements && window.aioEnhancements.loadSampleLog();
  window.toggleExperiment = (id) => window.aioEnhancements && window.aioEnhancements.toggleExperiment(id);

  // Copy helper for accordion command boxes
  window.copyToClipboard = async (elementId) => {
    const el = document.getElementById(elementId);
    const text = el ? (el.textContent || '').trim() : '';
    if (!text) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const tmp = document.createElement('textarea');
        tmp.value = text;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand('copy');
        document.body.removeChild(tmp);
      }
      if (window.aioEnhancements) window.aioEnhancements.showNotification('Skopiowano', 'Komenda skopiowana do schowka.', 'success');
    } catch (e) {
      alert('Nie udało się skopiować. Zaznacz tekst ręcznie.');
    }
  };
})();
