/* ==========================================================================
   Panoramă Financiară — Logic
   ========================================================================== */

(() => {
    'use strict';

    // ---------- THEME MANAGEMENT ----------
    const themeToggle = document.getElementById('themeToggle');
    const root = document.documentElement;

    const getPreferredTheme = () => {
        const saved = localStorage.getItem('theme');
        if (saved) return saved;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const applyTheme = (theme) => {
        root.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    };

    applyTheme(getPreferredTheme());

    themeToggle.addEventListener('click', () => {
        const current = root.getAttribute('data-theme') || 'light';
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });

    // ---------- UTILITIES ----------
    const fmtNumber = (num, decimals = 2) => {
        if (num === null || num === undefined || isNaN(num)) return '—';
        return Number(num).toLocaleString('ro-RO', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    };

    const fmtPercent = (num, decimals = 2) => {
        if (num === null || num === undefined || isNaN(num)) return '—';
        const sign = num >= 0 ? '+' : '';
        return `${sign}${num.toFixed(decimals)}%`;
    };

    const setChange = (el, pct) => {
        if (!el) return;
        if (pct === null || pct === undefined || isNaN(pct)) {
            el.textContent = '—';
            el.className = 'index-change neutral';
            return;
        }
        const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '•';
        el.textContent = `${arrow} ${fmtPercent(pct)}`;
        el.className = `index-change ${pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral'}`;
    };

    const setCommChange = (el, pct) => {
        if (!el) return;
        if (pct === null || pct === undefined || isNaN(pct)) {
            el.textContent = '—';
            el.className = 'comm-change neutral';
            return;
        }
        const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '•';
        el.textContent = `${arrow} ${fmtPercent(pct)} azi`;
        el.className = `comm-change ${pct > 0 ? 'up' : pct < 0 ? 'down' : 'neutral'}`;
    };

    // ---------- BNR CURS VALUTAR ----------
    const CORS_PROXY = 'https://corsproxy.io/?url=';

    const currencyMeta = {
        EUR: { name: 'Euro', flag: '🇪🇺' },
        USD: { name: 'Dolar american', flag: '🇺🇸' },
        GBP: { name: 'Liră sterlină', flag: '🇬🇧' },
        CHF: { name: 'Franc elvețian', flag: '🇨🇭' },
        JPY: { name: 'Yen japonez', flag: '🇯🇵' },
        CNY: { name: 'Yuan chinezesc', flag: '🇨🇳' },
    };

    const DISPLAY_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF', 'JPY', 'CNY'];

    async function fetchBNR() {
        try {
            const url = CORS_PROXY + encodeURIComponent('https://www.bnr.ro/nbrfxrates.xml');
            const res = await fetch(url);
            if (!res.ok) throw new Error('BNR fetch failed');
            const text = await res.text();
            const parser = new DOMParser();
            const xml = parser.parseFromString(text, 'text/xml');

            const cubeElement = xml.querySelector('Cube');
            const date = cubeElement ? cubeElement.getAttribute('date') : null;
            const rates = xml.querySelectorAll('Rate');

            const data = {};
            rates.forEach(r => {
                const currency = r.getAttribute('currency');
                const multiplier = parseInt(r.getAttribute('multiplier') || '1', 10);
                const value = parseFloat(r.textContent);
                data[currency] = { value, multiplier };
            });

            renderBNR(data, date);
        } catch (err) {
            console.error('Eroare BNR:', err);
            renderBNRError();
        }
    }

    function renderBNR(data, date) {
        const grid = document.getElementById('fxGrid');
        const dateEl = document.getElementById('bnrDate');

        if (date) {
            const d = new Date(date);
            dateEl.textContent = d.toLocaleDateString('ro-RO', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
        }

        grid.innerHTML = '';
        DISPLAY_CURRENCIES.forEach(code => {
            const entry = data[code];
            if (!entry) return;
            const meta = currencyMeta[code] || { name: code, flag: '' };
            const unit = entry.multiplier > 1 ? `per ${entry.multiplier} ${code}` : `per 1 ${code}`;

            const card = document.createElement('div');
            card.className = 'fx-card';
            card.innerHTML = `
                <div class="fx-symbol">${meta.flag} ${code} / RON</div>
                <div class="fx-name">${meta.name}</div>
                <div class="fx-value">${fmtNumber(entry.value, 4)}<span class="fx-unit">${unit}</span></div>
            `;
            // Click → chart (Yahoo folosește format CURRENCYRON=X)
            const yahooSymbol = `${code}RON=X`;
            card.addEventListener('click', () => openChart({
                symbol: yahooSymbol,
                title: `${code} / RON`,
                subtitle: meta.name,
                unit: '',
            }));
            card.style.cursor = 'pointer';
            grid.appendChild(card);
        });
    }

    function renderBNRError() {
        const grid = document.getElementById('fxGrid');
        grid.innerHTML = `
            <div class="fx-card" style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <div class="fx-name">Nu am putut încărca datele BNR.</div>
                <div class="fx-value" style="font-size: 0.9rem;">Verifică conexiunea sau consultă <a href="https://www.bnr.ro" target="_blank" style="color: var(--accent);">bnr.ro</a></div>
            </div>
        `;
    }

    // ---------- DOBÂNZI & INDICATORI ROMÂNIA ----------
    const RO_RATES = {
        keyRate: { value: 6.50, note: 'BNR' },
        robor3m: { value: 5.56, note: '' },
        robor6m: { value: 5.74, note: '' },
        ircc: { value: 5.58, note: 'T4 2025' },
        inflation: { value: 5.6, note: 'INS' },
        euribor3m: { value: 2.14, note: '' },
    };

    function renderRORates() {
        const setRate = (id, data, decimals = 2) => {
            const el = document.getElementById(id);
            if (el && data) el.textContent = `${fmtNumber(data.value, decimals)}%`;
        };
        setRate('keyRate', RO_RATES.keyRate);
        setRate('robor3m', RO_RATES.robor3m);
        setRate('robor6m', RO_RATES.robor6m);
        setRate('ircc', RO_RATES.ircc);
        setRate('inflation', RO_RATES.inflation, 1);
        setRate('euribor3m', RO_RATES.euribor3m);
    }

    // ---------- INDICI BURSIERI — YAHOO FINANCE ----------
    const INDICES = [
        { symbol: '^GDAXI', valueId: 'dax-value', changeId: 'dax-change', name: 'DAX', desc: 'Germania — 40 blue chips' },
        { symbol: '^FTSE',  valueId: 'ftse-value', changeId: 'ftse-change', name: 'FTSE 100', desc: 'UK — top 100 Londra' },
        { symbol: '^FCHI',  valueId: 'cac-value', changeId: 'cac-change', name: 'CAC 40', desc: 'Franța — Paris' },
        { symbol: '^STOXX50E', valueId: 'estoxx-value', changeId: 'estoxx-change', name: 'Euro Stoxx 50', desc: 'Zona euro' },
        { symbol: '^GSPC', valueId: 'sp500-value', changeId: 'sp500-change', name: 'S&P 500', desc: '500 mari companii SUA' },
        { symbol: '^IXIC', valueId: 'nasdaq-value', changeId: 'nasdaq-change', name: 'Nasdaq Composite', desc: 'Tech & growth SUA' },
        { symbol: '^DJI',  valueId: 'dow-value', changeId: 'dow-change', name: 'Dow Jones', desc: 'Industrial Average' },
        { symbol: '^RUT',  valueId: 'rut-value', changeId: 'rut-change', name: 'Russell 2000', desc: 'Small-cap SUA' },
        { symbol: '^N225', valueId: 'nikkei-value', changeId: 'nikkei-change', name: 'Nikkei 225', desc: 'Japonia — Tokyo' },
        { symbol: '000001.SS', valueId: 'sse-value', changeId: 'sse-change', name: 'SSE Composite', desc: 'China — Shanghai' },
        { symbol: '^HSI',  valueId: 'hsi-value', changeId: 'hsi-change', name: 'Hang Seng', desc: 'Hong Kong' },
        { symbol: '^BSESN', valueId: 'sensex-value', changeId: 'sensex-change', name: 'BSE Sensex', desc: 'India — Bombay 30' },
    ];

    const COMMODITIES = [
        { symbol: 'GC=F', valueId: 'gold-value', changeId: 'gold-change', decimals: 2, name: 'Aur', desc: 'USD / uncie', unit: '$' },
        { symbol: 'SI=F', valueId: 'silver-value', changeId: 'silver-change', decimals: 2, name: 'Argint', desc: 'USD / uncie', unit: '$' },
        { symbol: 'BZ=F', valueId: 'oil-value', changeId: 'oil-change', decimals: 2, name: 'Petrol Brent', desc: 'USD / baril', unit: '$' },
        { symbol: 'BTC-USD', valueId: 'btc-value', changeId: 'btc-change', decimals: 0, name: 'Bitcoin', desc: 'USD', unit: '$' },
        { symbol: 'ETH-USD', valueId: 'eth-value', changeId: 'eth-change', decimals: 0, name: 'Ethereum', desc: 'USD', unit: '$' },
    ];

    async function fetchYahooChart(symbol, { interval = '1d', range = '1mo' } = {}) {
        const url = CORS_PROXY + encodeURIComponent(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`
        );
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${symbol}`);
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) throw new Error(`No data for ${symbol}`);
        return result;
    }

    /**
     * FIX IMPORTANT PENTRU PROCENT:
     * Yahoo returnează în meta:
     *   - regularMarketPrice: prețul curent
     *   - previousClose / chartPreviousClose: închiderea zilei PRECEDENTE
     *
     * Problema veche: dacă ceri range=5d, chartPreviousClose e închiderea
     * de acum 5 zile, NU de ieri. De asta procentul arăta mult prea mare.
     *
     * Soluție: folosim `previousClose` din meta (ieri), iar dacă nu există,
     * luăm penultimul close valid din array-ul de închideri.
     */
    async function fetchCurrentQuote(symbol) {
        const result = await fetchYahooChart(symbol, { interval: '1d', range: '5d' });
        const meta = result.meta;
        const currentPrice = meta.regularMarketPrice;

        let previousClose = meta.previousClose;

        // Fallback 1: chartPreviousClose (dar doar dacă nu avem previousClose)
        if (previousClose == null) previousClose = meta.chartPreviousClose;

        // Fallback 2: penultimul close din array
        if (previousClose == null || previousClose === currentPrice) {
            const closes = result.indicators?.quote?.[0]?.close || [];
            for (let i = closes.length - 2; i >= 0; i--) {
                if (closes[i] != null && !isNaN(closes[i])) {
                    previousClose = closes[i];
                    break;
                }
            }
        }

        const changePct = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : null;
        return { price: currentPrice, previousClose, changePct };
    }

    async function renderIndex(item) {
        try {
            const { price, changePct } = await fetchCurrentQuote(item.symbol);
            const valueEl = document.getElementById(item.valueId);
            const changeEl = document.getElementById(item.changeId);
            if (valueEl) valueEl.textContent = fmtNumber(price, 2);
            setChange(changeEl, changePct);
        } catch (err) {
            console.warn(`Eroare pentru ${item.symbol}:`, err.message);
            const valueEl = document.getElementById(item.valueId);
            const changeEl = document.getElementById(item.changeId);
            if (valueEl && valueEl.textContent === '—') valueEl.textContent = 'n/a';
            if (changeEl) {
                changeEl.textContent = '—';
                changeEl.className = 'index-change neutral';
            }
        }
    }

    async function renderCommodity(item) {
        try {
            const { price, changePct } = await fetchCurrentQuote(item.symbol);
            const valueEl = document.getElementById(item.valueId);
            const changeEl = document.getElementById(item.changeId);
            const decimals = item.decimals ?? 2;
            if (valueEl) valueEl.textContent = `$${fmtNumber(price, decimals)}`;
            setCommChange(changeEl, changePct);
        } catch (err) {
            console.warn(`Eroare pentru ${item.symbol}:`, err.message);
            const valueEl = document.getElementById(item.valueId);
            const changeEl = document.getElementById(item.changeId);
            if (valueEl && valueEl.textContent === '—') valueEl.textContent = 'n/a';
            if (changeEl) {
                changeEl.textContent = '—';
                changeEl.className = 'comm-change neutral';
            }
        }
    }

    // ---------- BVB ----------
    const BVB_DATA = {
        'BET':    { value: 19245.50, changePct: 0.42 },
        'BET-TR': { value: 38210.15, changePct: 0.45 },
        'BET-NG': { value: 1485.30, changePct: -0.18 },
    };

    function renderBVB() {
        const mapping = [
            { key: 'BET', valueId: 'bet-value', changeId: 'bet-change' },
            { key: 'BET-TR', valueId: 'bettr-value', changeId: 'bettr-change' },
            { key: 'BET-NG', valueId: 'betng-value', changeId: 'betng-change' },
        ];
        mapping.forEach(m => {
            const d = BVB_DATA[m.key];
            if (!d) return;
            const v = document.getElementById(m.valueId);
            const c = document.getElementById(m.changeId);
            if (v) v.textContent = fmtNumber(d.value, 2);
            setChange(c, d.changePct);
        });
    }

    // ==========================================================================
    // MODAL CU GRAFIC
    // ==========================================================================

    const CHART_RANGES = [
        { id: '1d',  label: '1 Zi',    yahooRange: '1d',  yahooInterval: '5m'  },
        { id: '5d',  label: '1 Săpt.', yahooRange: '5d',  yahooInterval: '30m' },
        { id: '1mo', label: '1 Lună',  yahooRange: '1mo', yahooInterval: '1d'  },
        { id: '1y',  label: '1 An',    yahooRange: '1y',  yahooInterval: '1d'  },
        { id: '5y',  label: '5 Ani',   yahooRange: '5y',  yahooInterval: '1wk' },
    ];

    let modalEl = null;
    let currentChartSymbol = null;
    let currentChartUnit = '';
    let currentRangeId = '1mo';

    function createModal() {
        if (modalEl) return modalEl;
        modalEl = document.createElement('div');
        modalEl.className = 'chart-modal';
        modalEl.setAttribute('role', 'dialog');
        modalEl.setAttribute('aria-hidden', 'true');
        modalEl.innerHTML = `
            <div class="chart-modal-backdrop"></div>
            <div class="chart-modal-content">
                <button class="chart-modal-close" aria-label="Închide">✕</button>
                <div class="chart-modal-header">
                    <div class="chart-modal-info">
                        <div class="chart-modal-title" id="chart-title">—</div>
                        <div class="chart-modal-subtitle" id="chart-subtitle">—</div>
                    </div>
                    <div class="chart-modal-price">
                        <div class="chart-modal-current" id="chart-current">—</div>
                        <div class="chart-modal-change" id="chart-change">—</div>
                    </div>
                </div>
                <div class="chart-modal-tabs" id="chart-tabs"></div>
                <div class="chart-modal-canvas-wrap">
                    <div class="chart-loading" id="chart-loading">Se încarcă datele...</div>
                    <svg class="chart-svg" id="chart-svg" viewBox="0 0 800 300" preserveAspectRatio="none"></svg>
                    <div class="chart-tooltip" id="chart-tooltip"></div>
                </div>
                <div class="chart-modal-footer">
                    <div class="chart-period-info" id="chart-period-info">—</div>
                    <a class="chart-yahoo-link" id="chart-yahoo-link" target="_blank" rel="noopener">Yahoo Finance ↗</a>
                </div>
            </div>
        `;
        document.body.appendChild(modalEl);

        modalEl.querySelector('.chart-modal-close').addEventListener('click', closeChart);
        modalEl.querySelector('.chart-modal-backdrop').addEventListener('click', closeChart);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modalEl.classList.contains('open')) closeChart();
        });

        const tabsContainer = modalEl.querySelector('#chart-tabs');
        CHART_RANGES.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'chart-tab';
            btn.dataset.range = r.id;
            btn.textContent = r.label;
            btn.addEventListener('click', () => {
                currentRangeId = r.id;
                loadChartData();
            });
            tabsContainer.appendChild(btn);
        });

        return modalEl;
    }

    function openChart({ symbol, title, subtitle, unit = '' }) {
        createModal();
        currentChartSymbol = symbol;
        currentChartUnit = unit;
        currentRangeId = '1mo';

        modalEl.querySelector('#chart-title').textContent = title;
        modalEl.querySelector('#chart-subtitle').textContent = subtitle || '';
        modalEl.querySelector('#chart-yahoo-link').href = `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`;

        modalEl.classList.add('open');
        modalEl.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';

        loadChartData();
    }

    function closeChart() {
        if (!modalEl) return;
        modalEl.classList.remove('open');
        modalEl.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    async function loadChartData() {
        modalEl.querySelectorAll('.chart-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.range === currentRangeId);
        });

        const rangeConfig = CHART_RANGES.find(r => r.id === currentRangeId);
        const loading = modalEl.querySelector('#chart-loading');
        const svg = modalEl.querySelector('#chart-svg');

        loading.style.display = 'flex';
        loading.textContent = 'Se încarcă datele...';
        svg.innerHTML = '';

        try {
            const result = await fetchYahooChart(currentChartSymbol, {
                interval: rangeConfig.yahooInterval,
                range: rangeConfig.yahooRange,
            });
            const timestamps = result.timestamp || [];
            const closes = (result.indicators?.quote?.[0]?.close) || [];

            const points = [];
            for (let i = 0; i < timestamps.length; i++) {
                if (closes[i] != null && !isNaN(closes[i])) {
                    points.push({ t: timestamps[i] * 1000, v: closes[i] });
                }
            }

            if (points.length < 2) {
                loading.textContent = 'Nu sunt suficiente date pentru această perioadă.';
                return;
            }

            const firstVal = points[0].v;
            const lastVal = points[points.length - 1].v;
            const changePct = ((lastVal - firstVal) / firstVal) * 100;
            const min = Math.min(...points.map(p => p.v));
            const max = Math.max(...points.map(p => p.v));

            modalEl.querySelector('#chart-current').textContent = `${currentChartUnit}${fmtNumber(lastVal, 2)}`;
            const changeEl = modalEl.querySelector('#chart-change');
            const arrow = changePct > 0 ? '▲' : changePct < 0 ? '▼' : '•';
            changeEl.textContent = `${arrow} ${fmtPercent(changePct)} (${rangeConfig.label})`;
            changeEl.className = `chart-modal-change ${changePct > 0 ? 'up' : changePct < 0 ? 'down' : 'neutral'}`;

            const firstDate = new Date(points[0].t);
            const lastDate = new Date(points[points.length - 1].t);
            const fmtDate = (d) => d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
            modalEl.querySelector('#chart-period-info').innerHTML =
                `<strong>${fmtDate(firstDate)}</strong> → <strong>${fmtDate(lastDate)}</strong> ` +
                `· min: ${fmtNumber(min, 2)} · max: ${fmtNumber(max, 2)}`;

            loading.style.display = 'none';
            drawChart(points, { changePct, min, max });

        } catch (err) {
            console.error('Eroare chart:', err);
            loading.textContent = 'Nu am putut încărca graficul. Încearcă alt interval.';
        }
    }

    function drawChart(points, { changePct, min, max }) {
        const svg = modalEl.querySelector('#chart-svg');
        const tooltip = modalEl.querySelector('#chart-tooltip');

        const W = 800, H = 300;
        const PAD_L = 55, PAD_R = 20, PAD_T = 20, PAD_B = 30;
        const innerW = W - PAD_L - PAD_R;
        const innerH = H - PAD_T - PAD_B;

        const tMin = points[0].t, tMax = points[points.length - 1].t;
        const vRange = max - min || 1;
        const vPad = vRange * 0.08;
        const vMin = min - vPad;
        const vMax = max + vPad;

        const xOf = (t) => PAD_L + ((t - tMin) / (tMax - tMin || 1)) * innerW;
        const yOf = (v) => PAD_T + (1 - (v - vMin) / (vMax - vMin)) * innerH;

        let path = '';
        let areaPath = '';
        points.forEach((p, i) => {
            const x = xOf(p.t), y = yOf(p.v);
            path += (i === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2) + ' ';
            if (i === 0) areaPath = `M${x.toFixed(2)},${(H - PAD_B).toFixed(2)} L${x.toFixed(2)},${y.toFixed(2)} `;
            else areaPath += `L${x.toFixed(2)},${y.toFixed(2)} `;
        });
        areaPath += `L${xOf(points[points.length - 1].t).toFixed(2)},${(H - PAD_B).toFixed(2)} Z`;

        let gridLines = '';
        let yLabels = '';
        for (let i = 0; i <= 4; i++) {
            const value = vMin + (vMax - vMin) * (i / 4);
            const y = yOf(value);
            gridLines += `<line class="chart-grid" x1="${PAD_L}" y1="${y.toFixed(2)}" x2="${W - PAD_R}" y2="${y.toFixed(2)}"/>`;
            yLabels += `<text class="chart-y-label" x="${PAD_L - 8}" y="${(y + 4).toFixed(2)}" text-anchor="end">${fmtNumber(value, value > 1000 ? 0 : 2)}</text>`;
        }

        const xLabelCount = Math.min(5, points.length);
        let xLabels = '';
        for (let i = 0; i < xLabelCount; i++) {
            const idx = Math.floor((i / (xLabelCount - 1)) * (points.length - 1));
            const p = points[idx];
            const d = new Date(p.t);
            const range = CHART_RANGES.find(r => r.id === currentRangeId);
            let label;
            if (range.id === '1d') {
                label = d.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
            } else if (range.id === '5d' || range.id === '1mo') {
                label = d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
            } else {
                label = d.toLocaleDateString('ro-RO', { month: 'short', year: '2-digit' });
            }
            const x = xOf(p.t);
            xLabels += `<text class="chart-x-label" x="${x.toFixed(2)}" y="${H - 8}" text-anchor="middle">${label}</text>`;
        }

        const colorClass = changePct >= 0 ? 'up' : 'down';

        svg.innerHTML = `
            <defs>
                <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="currentColor" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
                </linearGradient>
            </defs>
            <g class="chart-${colorClass}">
                ${gridLines}
                <path class="chart-area" d="${areaPath}" fill="url(#area-grad)"/>
                <path class="chart-line" d="${path}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                ${yLabels}
                ${xLabels}
                <g class="chart-hover-group" style="opacity:0">
                    <line class="chart-hover-line" x1="0" y1="${PAD_T}" x2="0" y2="${H - PAD_B}"/>
                    <circle class="chart-hover-dot" r="5" cx="0" cy="0"/>
                </g>
            </g>
        `;

        const hoverGroup = svg.querySelector('.chart-hover-group');
        const hoverLine = hoverGroup.querySelector('.chart-hover-line');
        const hoverDot = hoverGroup.querySelector('.chart-hover-dot');

        const handleMove = (e) => {
            const rect = svg.getBoundingClientRect();
            const scaleX = W / rect.width;
            const mouseX = (e.clientX - rect.left) * scaleX;

            if (mouseX < PAD_L || mouseX > W - PAD_R) {
                hoverGroup.style.opacity = '0';
                tooltip.style.opacity = '0';
                return;
            }

            const tAtX = tMin + ((mouseX - PAD_L) / innerW) * (tMax - tMin);
            let closest = points[0];
            let minDiff = Math.abs(points[0].t - tAtX);
            for (let i = 1; i < points.length; i++) {
                const diff = Math.abs(points[i].t - tAtX);
                if (diff < minDiff) { minDiff = diff; closest = points[i]; }
            }
            const x = xOf(closest.t), y = yOf(closest.v);
            hoverGroup.style.opacity = '1';
            hoverLine.setAttribute('x1', x.toFixed(2));
            hoverLine.setAttribute('x2', x.toFixed(2));
            hoverDot.setAttribute('cx', x.toFixed(2));
            hoverDot.setAttribute('cy', y.toFixed(2));

            const wrap = modalEl.querySelector('.chart-modal-canvas-wrap');
            const wrapRect = wrap.getBoundingClientRect();
            const mouseXinWrap = e.clientX - wrapRect.left;
            const d = new Date(closest.t);
            const range = CHART_RANGES.find(r => r.id === currentRangeId);
            let dateStr;
            if (range.id === '1d') {
                dateStr = d.toLocaleString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
            } else {
                dateStr = d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'long', year: 'numeric' });
            }

            tooltip.innerHTML = `
                <div class="tt-date">${dateStr}</div>
                <div class="tt-value">${currentChartUnit}${fmtNumber(closest.v, 2)}</div>
            `;
            tooltip.style.opacity = '1';
            const ttLeft = Math.min(Math.max(mouseXinWrap - 70, 10), wrapRect.width - 150);
            tooltip.style.left = ttLeft + 'px';
        };

        const handleLeave = () => {
            hoverGroup.style.opacity = '0';
            tooltip.style.opacity = '0';
        };

        svg.onmousemove = handleMove;
        svg.onmouseleave = handleLeave;
        svg.ontouchmove = (e) => {
            if (e.touches[0]) { handleMove(e.touches[0]); e.preventDefault(); }
        };
        svg.ontouchend = handleLeave;
    }

    // ==========================================================================
    // Click handlers pe carduri
    // ==========================================================================

    function attachCardHandlers() {
        INDICES.forEach(item => {
            const card = document.querySelector(`.index-card[data-symbol="${item.symbol}"]`);
            if (card && !card.dataset.hasHandler) {
                card.style.cursor = 'pointer';
                card.dataset.hasHandler = '1';
                card.addEventListener('click', () => openChart({
                    symbol: item.symbol,
                    title: item.name,
                    subtitle: item.desc,
                    unit: '',
                }));
            }
        });

        COMMODITIES.forEach(item => {
            const card = document.getElementById(item.valueId)?.closest('.comm-card');
            if (card && !card.dataset.hasHandler) {
                card.style.cursor = 'pointer';
                card.dataset.hasHandler = '1';
                card.addEventListener('click', () => openChart({
                    symbol: item.symbol,
                    title: item.name,
                    subtitle: item.desc,
                    unit: item.unit || '',
                }));
            }
        });
    }

    // ---------- REFRESH ----------
    function updateTimestamp() {
        const now = new Date();
        const timeStr = now.toLocaleString('ro-RO', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });
        document.getElementById('lastUpdate').textContent = `Live • ${timeStr}`;
        document.getElementById('footerUpdate').textContent = timeStr;
    }

    async function loadAll() {
        updateTimestamp();
        renderRORates();
        renderBVB();
        fetchBNR();

        INDICES.forEach(idx => renderIndex(idx));
        COMMODITIES.forEach(c => renderCommodity(c));

        setTimeout(attachCardHandlers, 800);
    }

    loadAll();
    setInterval(loadAll, 5 * 60 * 1000);

})();
