# WorkOrganizer

**WorkOrganizer** è una WebApp moderna e responsive (desktop & mobile) sviluppata in **React 19** e **TypeScript** per unificare e automatizzare:
1. La **pianificazione mensile delle presenze e dello Smart Working** (con verifica live delle policy aziendali).
2. Il **registro giornaliero delle timbrature orarie** (con calcolo automatico della pausa pranzo, proiezione immediata degli orari di uscita 7h/8h e gestione banca ore).
3. Il **bilancio economico mensile dei buoni pasto** (buoni smart maturati vs spesa mensa dipendente).

---

## 🚀 Funzionalità Principali

### 1. Pianificazione & Regole di Policy (Smart Working)
- **Target mensile standard:** 10 giorni di Smart Working (`smart` svolti + `idea_smart` pianificati), con allarmi visivi per mesi incompleti o esuberi.
- **Regola settimanale vincolante:** almeno **1 presenza in sede** e massimo **4 giorni di smart** a settimana (Lunedì–Domenica).
- **Gestione eccezioni e ferie:** le ferie non compensano la presenza; tuttavia, se una settimana lavorativa è interamente coperta da ferie o chiusura, non viene sollevato un falso allarme.
- **Festività italiane integrate:** calcolo automatico delle festività fisse e mobili (Pasqua e Pasquetta con algoritmo Meeus/Gauss).

### 2. Timbrature & Calcolo Orario Intelligente
- **4 passaggi orari giornalieri con digitazione rapida da tastiera:** Entrata mattina, Uscita pranzo, Rientro pranzo, Uscita sera (con pieno supporto per la digitazione diretta a due cifre da tastiera per ore e minuti, senza reset del buffer, affiancato dal selettore/picker orario nativo e pulsanti *"Adesso"*).
- **Pausa pranzo:** regola del minimo garantito di **30 minuti** (se la pausa effettiva in presenza è inferiore a 30m, viene forzata a 30m; in smart working è fissa a **0 minuti**).
- **Proiezioni live dell'uscita:** non appena viene registrata l'entrata mattutina, calcola in tempo reale sia l'orario di uscita per le **8 ore nominali** che per le **7 ore minime**.
- **Permessi orari:** minuti di permesso che concorrono alla quadratura della giornata lavorativa.
- **Smart Working automatico:** il giorno marcato come smart vale automaticamente **8h nominali** (480 minuti) senza richiedere orari.

### 3. Contatori Annuali Ferie & Permessi (PAR) e Input Intelligente (v0.5)
- **Ferie Annuali:** configurazione delle ore spettanti nell'anno e del residuo dell'anno precedente. Monitoraggio algebrico continuo:
  - *Ferie Godute:* giorni effettivi passati con causale **Ferie** (colorati in **Viola**).
  - *Ferie Pianificate:* giorni futuri programmati con causale **Idea Ferie** (colorati in **Lilla tratteggiato**).
  - *Ferie Residue:* saldo ore ancora disponibili al netto di godute e pianificate.
- **PAR / Permessi Annuali:** distinzione contabile precisa:
  - *Giornate intere o frazioni di PAR:* giorni marcati con causale **PAR** (colorati in **Ciano `#06b6d4`**) e **Idea PAR** (colorati in **Ciano tratteggiato**), ciascuno computato a 8h standard.
  - *Permessi orari infrasettimanali:* decurtazione algebrica automatica di tutti i minuti/ore di permesso inseriti nei giorni lavorativi o smart working.
- **Input Flessibile delle Ore di Permesso (`DurationInput`):** accetta digitazione naturale e flessibile:
  - `3` o `3h` $\rightarrow$ 3 ore (180 minuti)
  - `50m` $\rightarrow$ 50 minuti
  - `3h50` o `3h50m` o `3:50` $\rightarrow$ 3 ore e 50 minuti (230 minuti)
  - `1.5` o `1.5h` o `1,5h` $\rightarrow$ 1 ora e 30 minuti (90 minuti)
- **Smart Working con Permesso:** se un giorno si effettua Smart Working con ore di permesso (es. 5h lavorate + 3h permesso), la giornata quadra comunque alle 8h nominali standard, il buono pasto smart è garantito e le 3 ore vengono scalate dal monte PAR.

### 4. Banca Ore Trimestrale
- Calcolo del delta giornaliero rispetto alle 8h standard.
- Azzeramento e monitoraggio su base trimestrale (**Q1, Q2, Q3, Q4**) con verifica della conformità del mese iniziale ($\ge 0$) e capienza di recupero.

### 5. Modulo Economico Buoni Pasto
- **Buono Smart:** credito maturato di **+8,00 €** a giornata di smart working.
- **Mensa in sede:** spesa di **-1,50 €** a pasto consumato a carico del dipendente.
- Calcolo automatico del consuntivo economico netto del mese.

### 6. Due Layout Interscambiabili a Caldo (v0.5)
- **Layout Split (Master-Detail):** pagina calendario a griglia mensile classica a sinistra (1 riga per settimana da Lunedì a Domenica con sabati/domeniche non lavorativi di default e zero scrolling verticale) e scheda di dettaglio del giorno selezionato a destra, completa di pulsanti rapidi per assegnare la causale (Presenza, Smart, Idea Smart, Ferie, Idea Ferie, PAR, Idea PAR, Chiusura, Non Lav.) a zero popup.
- **Indicatori Temporali sul Calendario:**
  - *Giorni passati e odierni consolidati (`date <= oggi`):* spunta verde **`✓`**.
  - *Giorni futuri compilati o pianificati (`date > oggi`):* orologino giallo **`⏳`** a indicare che il giorno è pronto ma in attesa.
- **Layout Smart Sheet:** dashboard di report mensile analitico di **pura consultazione** in testata con tutte le statistiche di quadratura (ore lavorate, delta banca ore, contatori annuali Ferie e PAR, conteggio presenze/smart/ferie/par, buoni pasto e saldo economico netto), abbinato alla tabella mensile analitica in modalità lettura con i controlli di inserimento commentati nel codice per un ripristino immediato.

### 7. Persistenza & Sincronizzazione Dati
- **Cloud Database (Supabase):** PostgreSQL con tabelle indicizzate, vincoli di unicità e **Row Level Security (RLS)** per utente.
- **Offline / Modalità Ospite Locale:** memorizzazione persistente su `LocalStorage` con transizione trasparente offline/online.
- **Auto-Sync:** la registrazione di timbrature reali in presenza converte e conferma automaticamente lo stato del giorno in `'presenza'`, mentre il flag smart lo converte in `'smart'`.
- **Esportazione & Backup:**
  - Esportazione mensile in formato Excel (`.xlsx`) compatibile con il modello `Timbrature_2026.xlsx`.
  - Download e ripristino di backup completi in formato JSON.

---

## 🛠️ Stack Tecnologico

- **Frontend:** [React 19](https://react.dev/), [TypeScript 5](https://www.typescriptlang.org/) (strict mode), [Vite 6](https://vite.dev/)
- **Styling:** Vanilla CSS con CSS Modules, CSS Variables per temi Dark & Light, responsive design
- **Database & Auth:** [@supabase/supabase-js](https://supabase.com/) (PostgreSQL + RLS)
- **Engine Excel:** [SheetJS (xlsx)](https://sheetjs.com/)
- **Icone:** [lucide-react](https://lucide.dev/)
- **Test Runner & Harness:** [Vitest](https://vitest.dev/), [@testing-library/react](https://testing-library.com/)

---

## 📦 Struttura del Progetto

```
WorkOrganization/
├── docs/                           # Specifiche e documentazione tecnica
│   ├── esempi/                     # File Excel di riferimento (Timbrature_2026.xlsx)
│   └── superpowers/
│       ├── specs/                  # Design document dettagliato
│       └── plans/                  # Piano di implementazione TDD in 12 task
├── src/
│   ├── components/
│   │   └── Header/                 # Header globale, selettore mese, KPI badges, switcher layout
│   ├── context/
│   │   └── WorkOrganizerContext.tsx# State store globale, reactive computations, date navigation
│   ├── core/
│   │   └── domain/                 # Moduli puri di business logic (TDD)
│   │       ├── timeCalculator.ts   # Motore calcolo orario, pause pranzo, uscite 7h/8h
│   │       ├── policyValidator.ts  # Motore policy aziendali, festivi italiani, conformità
│   │       ├── bancaOreManager.ts  # Bilancio trimestrale banca ore (Q1..Q4)
│   │       └── mealVouchersLedger.ts # Bilancio economico buoni pasto
│   ├── features/
│   │   ├── auth/                   # Modale autenticazione Supabase e modalità Guest
│   │   ├── calendar/               # Griglia mensile, day card, week badge, status selector
│   │   ├── settings/               # Modale accordatura parametri aziendali e backup/export
│   │   └── timbrature/             # Tabella mensile timbrature, day detail card, today hero widget
│   ├── layouts/                    # Layout Split (Master-Detail) e Layout Smart Sheet
│   ├── services/
│   │   ├── export/                 # Esportatore Excel (.xlsx) e Backup JSON
│   │   ├── repository/             # workDataService (sincronizzazione Supabase + local cache)
│   │   ├── storage/                # localCache (gestione offline localStorage)
│   │   └── supabase/               # Client Supabase e AuthContext
│   ├── App.tsx                     # Componente radice dell'applicazione
│   ├── main.tsx                    # Entry point React
│   └── index.css                   # Variabili di tema (dark/light) e stili base
├── supabase/
│   └── migrations/                 # Script SQL con schema tabelle e policy RLS
├── .github/
│   └── workflows/deploy.yml        # CI/CD GitHub Actions per deploy automatico su GitHub Pages
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

---

## ⚡ Avvio Rapido & Comandi

### 1. Installazione Dipendenze
```bash
npm install
```

### 2. Avvio Server di Sviluppo
```bash
npm run dev
```
L'applicazione sarà disponibile su `http://localhost:5173`.

### 3. Esecuzione Suite di Test
Per eseguire l'intera suite di test unitari e di integrazione (170 test):
```bash
npm test
```
oppure con interfaccia watch:
```bash
npx vitest
```

### 4. Verifica Type Checking TypeScript
```bash
npx tsc
```

### 5. Build di Produzione
```bash
npm run build
```
I file ottimizzati per la produzione verranno generati nella cartella `dist/`.

---

## ☁️ Configurazione Supabase (Opzionale)

Se desideri sincronizzare i dati su Supabase invece di operare unicamente in locale:

1. Crea un progetto su [Supabase](https://supabase.com/).
2. Esegui lo script SQL disponibile in `supabase/migrations/20261104_init_workorganizer.sql` nell'**SQL Editor** della dashboard di Supabase (crea le tabelle `app_settings`, `calendar_days`, `time_entries`, `bank_hours_quarters` con relative policy RLS).
3. Inserisci il tuo **Project URL** e la tua **Anon Key**:
   - Direttamente all'interno dell'app cliccando sul pulsante **Impostazioni** (icona ingranaggio) nella sezione *Connessione Cloud (Supabase)*.
   - Oppure creando un file `.env.local` nella radice del progetto:
     ```env
     VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
     VITE_SUPABASE_ANON_KEY=tua-chiave-anonima
     ```

---

## 🧩 Integrazione Zucchetti (Tampermonkey Userscript)

È disponibile uno Userscript pronto per **Tampermonkey** in [`tools/tampermonkey/zucchetti-to-workorganizer.user.js`](tools/tampermonkey/zucchetti-to-workorganizer.user.js) che inietta un pulsante galleggiante sul portale web Zucchetti aziendale (HR Portal, Infinity, Presenze Web, ZConnect) per esportare con 1 clic le timbrature, lo smart working, le ferie e la mensa del mese in formato JSON o CSV pronto per WorkOrganizer. Consulta la guida in [`tools/tampermonkey/README.md`](tools/tampermonkey/README.md).

---

## 🚀 Deploy su GitHub Pages

Il repository include già il workflow GitHub Actions configurato in `.github/workflows/deploy.yml`.
1. Vai nelle impostazioni del repository GitHub: **Settings > Pages**.
2. Sotto **Build and deployment > Source**, seleziona **GitHub Actions**.
3. Ad ogni push sul ramo `main`, l'applicazione verrà compilata, verificata con i test e distribuita automaticamente.
