# 📊 Panoramă Financiară RO

> Dashboard financiar într-o singură pagină pentru oricine urmărește economia României și piețele globale.

Indicatori economici, curs valutar BNR, ROBOR, IRCC, bursa BET și principalii indici mondiali (DAX, FTSE, S&P 500, Nasdaq, Nikkei, Hang Seng, Sensex și altele) — toate live, într-un design clean cu toggle dark/light.

![Preview](https://img.shields.io/badge/status-live-green) ![License](https://img.shields.io/badge/license-MIT-blue) ![No Build](https://img.shields.io/badge/build-zero--dependencies-orange)

---

## ✨ Ce conține pagina

| Secțiune | Date afișate |
|---|---|
| **Curs valutar BNR** | EUR, USD, GBP, CHF, JPY, CNY — din XML-ul oficial BNR |
| **Dobânzi & indici monetari** | Rata BNR, ROBOR 3M/6M, IRCC, EURIBOR, inflație IPC |
| **Bursa BVB** | BET, BET-TR, BET-NG |
| **Piețe europene** | DAX, FTSE 100, CAC 40, Euro Stoxx 50 |
| **Piețe americane** | S&P 500, Nasdaq, Dow Jones, Russell 2000 |
| **Piețe asiatice** | Nikkei 225, SSE Composite, Hang Seng, BSE Sensex |
| **Mărfuri & crypto** | Aur, argint, petrol Brent, Bitcoin, Ethereum |

Datele se reîmprospătează automat la fiecare 5 minute.

---

## 🚀 Cum pui pagina pe GitHub Pages (pas cu pas)

### 1. Creează repo-ul

```bash
# Creează un folder local
mkdir panorama-financiara
cd panorama-financiara

# Copiază fișierele din acest pachet aici:
# - index.html
# - styles.css
# - script.js
# - README.md
# - .gitignore
```

### 2. Inițializează git și push pe GitHub

```bash
git init
git add .
git commit -m "Initial commit — panoramă financiară"

# Creează un repo nou pe github.com (ex: panorama-financiara)
# Apoi conectează-l:
git branch -M main
git remote add origin https://github.com/NUMELE_TAU/panorama-financiara.git
git push -u origin main
```

### 3. Activează GitHub Pages

1. Intră în repo-ul tău pe GitHub
2. Click pe **Settings** (tab-ul din dreapta sus)
3. În meniul din stânga → **Pages**
4. La **Source**, alege: `Deploy from a branch`
5. La **Branch**, selectează: `main` și folder `/ (root)`
6. Click **Save**

În 1-2 minute, pagina ta va fi live la:
`https://NUMELE_TAU.github.io/panorama-financiara/`

### 4. (Opțional) Domain personalizat

În **Settings → Pages → Custom domain** poți adăuga propriul domeniu. Editezi apoi fișierul `CNAME` automat creat.

---

## 🏗️ Cum funcționează

Pagina nu are dependențe externe, nu are build step, nu are framework. E HTML + CSS + JavaScript pur. Asta înseamnă:

- ✅ Se încarcă instant
- ✅ Rulează pe orice hosting static (GitHub Pages, Netlify, Vercel, chiar și local prin dublu-click)
- ✅ Ușor de modificat — deschizi fișierul într-un editor, nu ai nevoie de `npm install`

### Sursele de date

| Sursă | Pentru ce | Cost |
|---|---|---|
| [bnr.ro/nbrfxrates.xml](https://www.bnr.ro/nbrfxrates.xml) | Curs valutar BNR oficial | Gratuit, fără limită |
| [query1.finance.yahoo.com](https://finance.yahoo.com) | Indici bursieri + mărfuri + crypto | Gratuit, rate limits rezonabile |
| [corsproxy.io](https://corsproxy.io) | Proxy CORS pentru ambele de mai sus | Gratuit |

### De ce proxy CORS?

BNR și Yahoo Finance nu permit cereri directe din browser (restricții CORS). Folosim un proxy public gratuit care intermediază cererile. Pentru trafic intens recomand să-ți găzduiești propriul proxy (vezi mai jos).

---

## 🔧 Personalizare

### Modificarea dobânzilor și indicatorilor

Valorile pentru **ROBOR, IRCC, rata BNR, inflație** nu sunt disponibile printr-un API public simplu, așa că sunt codate direct în `script.js`. Când BNR sau INS publică noi valori, deschide `script.js` și modifică obiectul `RO_RATES`:

```javascript
const RO_RATES = {
    keyRate: { value: 6.50, note: 'BNR' },
    robor3m: { value: 5.56, note: '' },
    robor6m: { value: 5.74, note: '' },
    ircc: { value: 5.58, note: 'T4 2025' },
    inflation: { value: 5.6, note: 'INS' },
    euribor3m: { value: 2.14, note: '' },
};
```

**De unde iei valorile actualizate:**
- **ROBOR:** [bnr.ro/Indicatori-de-referinta-monetara-11077.aspx](https://www.bnr.ro/)
- **IRCC:** [bnr.ro](https://www.bnr.ro) — se actualizează trimestrial
- **Rata BNR:** anunțată după ședințele CA al BNR
- **Inflație:** [insse.ro](https://insse.ro) — lună cu lună

### Modificarea valorilor BVB

BVB nu expune un API public JSON-friendly. Valorile sunt în `BVB_DATA` din `script.js` și le poți actualiza manual după pagina de pe [bvb.ro](https://www.bvb.ro/).

Alternativ, poți scrie un scraper mic (Node.js, Python) rulat printr-un GitHub Action care să scrie automat într-un fișier `bvb.json` pe care pagina îl citește.

### Adăugarea altor indici

În `script.js`, adaugă în array-ul `INDICES` un nou obiect și apoi în `index.html` un card corespunzător cu ID-urile potrivite. Simbolurile Yahoo Finance le găsești pe [finance.yahoo.com](https://finance.yahoo.com).

### Schimbarea culorilor / fonturilor

Toate variabilele de design sunt în `styles.css` la `:root` (light) și `[data-theme="dark"]`. Editezi culorile acolo și se schimbă peste tot.

---

## 🔒 Privacy & securitate

- **Nicio cookie, niciun tracker, niciun analytics.** Pagina e 100% statică și privată.
- Preferința de temă (dark/light) se salvează doar în `localStorage` (local pe device-ul tău).
- Cererile de date trec prin `corsproxy.io` — acesta vede URL-urile pe care le accesezi. Dacă îți pasă de asta, rulează-ți propriul proxy (ex: cu [Cloudflare Workers](https://workers.cloudflare.com/) sau un mic VPS).

---

## 📝 Limitări

- **Decalaj 15-20 min** pentru indici bursieri (Yahoo nu oferă live real-time gratuit)
- **BVB manual** — vezi secțiunea de personalizare
- **Rate limits** — proxy-ul CORS gratuit are limite; dacă refreshul eșuează des, găzduiește-ți unul propriu
- **Zile nelucrătoare** — BNR nu publică în weekend / sărbători; pagina arată ultimul curs valabil

---

## 🛣️ Idei pentru îmbunătățiri

- [ ] Grafice (Chart.js sau ApexCharts) cu evoluție 30 zile pentru fiecare indice
- [ ] Notificări browser când BET depășește un prag setat
- [ ] Calculator credit cu ROBOR/IRCC integrat
- [ ] Convertor valutar folosind cursul BNR
- [ ] Export CSV cu cursurile zilei
- [ ] GitHub Action care actualizează automat `RO_RATES` din `script.js` zilnic

---

## 📜 Licență

MIT — fă ce vrei cu el. Dacă îl modifici într-un mod interesant, dă-mi un tag, mi-ar plăcea să văd!

---

## ⚠️ Disclaimer

Această pagină are scop strict **informativ și educativ**. Datele pot avea erori sau întârzieri. Nu folosi pentru decizii de tranzacționare activă fără să verifici sursele oficiale. Nu e consultanță financiară.
