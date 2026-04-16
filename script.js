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
    // BNR publica zilnic un XML public la https://www.bnr.ro/nbrfxrates.xml
    // Folosim un proxy CORS pentru a-l putea citi din browser.

    const CORS_PROXY = 'https://corsproxy.io/?url=';

    const currencyMeta = {
        EUR: { name: 'Euro', flag: '🇪🇺' },
        USD: { name: 'Dolar american', flag: '🇺🇸' },
        GBP: { name: 'Liră sterlină', flag: '🇬🇧' },
        CHF: { name: 'Franc elvețian', flag: '🇨🇭' },
        JPY: { name: 'Yen japonez', flag: '🇯🇵' },
        CNY: { name: 'Yuan chinezesc', flag: '🇨🇳' },
        CAD: { name: 'Dolar canadian', flag: '🇨🇦' },
        AUD: { name: 'Dolar australian', flag: '🇦🇺' },
    };

    // Valuta pe care le afișăm, în ordine
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
    // Aceste valori se actualizează mai rar (zilnic/trimestrial).
    // Le poți edita manual în obiectul de mai jos când apar valori noi
    // sau le poți integra cu un backend propriu.

    const RO_RATES = {
        keyRate: { value: 6.50, note: 'BNR' },       // Rata dobânzii de politică monetară
        robor3m: { value: 5.56, note: '' },
        robor6m: { value: 5.74, note: '' },
        ircc: { value: 5.58, note: 'T4 2025' },
        inflation: { value: 5.6, note: 'INS' },     // Inflație anuală IPC
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
    // Folosim Yahoo Finance via proxy CORS pentru acces gratuit.
    // Simbolurile folosesc notația Yahoo (^GSPC pentru S&P 500 etc.)

    const INDICES = [
        // Europa
        { symbol: '^GDAXI', valueId: 'dax-value', changeId: 'dax-change' },
        { symbol: '^FTSE',  valueId: 'ftse-value', changeId: 'ftse-change' },
        { symbol: '^FCHI',  valueId: 'cac-value', changeId: 'cac-change' },
        { symbol: '^STOXX50E', valueId: 'estoxx-value', changeId: 'estoxx-change' },
        // SUA
        { symbol: '^GSPC', valueId: 'sp500-value', changeId: 'sp500-change' },
        { symbol: '^IXIC', valueId: 'nasdaq-value', changeId: 'nasdaq-change' },
        { symbol: '^DJI',  valueId: 'dow-value', changeId: 'dow-change' },
        { symbol: '^RUT',  valueId: 'rut-value', changeId: 'rut-change' },
        // Asia
        { symbol: '^N225', valueId: 'nikkei-value', changeId: 'nikkei-change' },
        { symbol: '000001.SS', valueId: 'sse-value', changeId: 'sse-change' },
        { symbol: '^HSI',  valueId: 'hsi-value', changeId: 'hsi-change' },
        { symbol: '^BSESN', valueId: 'sensex-value', changeId: 'sensex-change' },
    ];

    const COMMODITIES = [
        { symbol: 'GC=F', valueId: 'gold-value', changeId: 'gold-change', decimals: 2 },
        { symbol: 'SI=F', valueId: 'silver-value', changeId: 'silver-change', decimals: 2 },
        { symbol: 'BZ=F', valueId: 'oil-value', changeId: 'oil-change', decimals: 2 },
        { symbol: 'BTC-USD', valueId: 'btc-value', changeId: 'btc-change', decimals: 0 },
        { symbol: 'ETH-USD', valueId: 'eth-value', changeId: 'eth-change', decimals: 0 },
    ];

    async function fetchYahooQuote(symbol) {
        const url = CORS_PROXY + encodeURIComponent(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`
        );
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${symbol}`);
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) throw new Error(`No data for ${symbol}`);

        const meta = result.meta;
        const currentPrice = meta.regularMarketPrice;
        const previousClose = meta.chartPreviousClose ?? meta.previousClose;
        const changePct = previousClose ? ((currentPrice - previousClose) / previousClose) * 100 : null;

        return { price: currentPrice, changePct };
    }

    async function renderIndex(item) {
        try {
            const { price, changePct } = await fetchYahooQuote(item.symbol);
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
            const { price, changePct } = await fetchYahooQuote(item.symbol);
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

    // ---------- BVB (bursa românească) ----------
    // BVB nu are un API public simplu și CORS-friendly.
    // Punem valori de tip "last known" care se updatează manual.
    // Pentru date live: folosește https://www.bvb.ro/ sau un scraper propriu.

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

    // ---------- REFRESH & TIMESTAMP ----------
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

        // Încărcăm indicii în paralel pentru viteză
        INDICES.forEach(idx => renderIndex(idx));
        COMMODITIES.forEach(c => renderCommodity(c));
    }

    // Initial load
    loadAll();

    // Auto-refresh la fiecare 5 minute
    setInterval(loadAll, 5 * 60 * 1000);

})();
