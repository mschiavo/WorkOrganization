# WorkOrganizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Realizzare una webapp personale (React 19 + TypeScript + Vite) per la pianificazione mensile delle presenze/smart working e la registrazione delle timbrature con calcolo banca ore e buoni pasto, sincronizzata con Supabase e deployabile su GitHub Pages.

**Architecture:** Architettura modulare frontend-driven: dominio di business puro e testato con Vitest (`TimeCalculator`, `PolicyValidator`, `BancaOreManager`, `MealVouchersLedger`), strato di dati Supabase con Row Level Security (RLS) e cache locale di sicurezza, e interfaccia utente flessibile con tre layout intercambiabili (Tabbed, Split Dashboard, Smart Sheet) governati da un unico state store.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Supabase JS Client, Lucide React, XLSX (SheetJS per export), Vanilla CSS con Design System CSS variables (Dark/Light).

**Spec:** `docs/superpowers/specs/2026-11-04-workorganizer-design.md`

## Global Constraints

- SPA statica compatibile con deployment su GitHub Pages (`base: './'` o repository path in Vite).
- Supabase Auth personale con Row Level Security (`auth.uid() = user_id`) su tutte le tabelle.
- Modalità di sviluppo/test con fallback locale quando le chiavi Supabase non sono ancora inserite.
- Zero type casting non sicuro o suppression linter; TypeScript strict mode abilitato.
- Test automatizzati esaustivi per tutti i calcoli matematici, orari e vincoli di policy.

## Review Focus

- Pausa pranzo inferiore a 30 minuti (es. 12:00-12:15): deve essere forzata a 30 minuti esatti nel conteggio delle ore lavorate.
- Giorno di smart working: deve impostare 8h lavorate nette, 0m pausa pranzo e non richiedere timbrature orarie.
- Settimana a cavallo di mese: deve valutare l'intera settimana Lunedì-Domenica senza generare falsi allarmi di assenza presenza.
- Settimana interamente di ferie (5 giorni): non deve richiedere il giorno di presenza obbligatorio.
- Azzeramento trimestrale banca ore: deve calcolare il saldo su base Q1/Q2/Q3/Q4 con tolleranza recupero max 1h/giorno.

---

### Task 1: Project Scaffolding, Tooling & Test Harness

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/index.css`
- Test: `src/App.test.tsx`

**Interfaces:**
- Produces: ambiente di sviluppo Vite, configurazione TypeScript strict, harness di test Vitest funzionante.

- [ ] **Step 1: Inizializzare package.json con dipendenze necessarie**
Creare `package.json` con React 19, `@supabase/supabase-js`, `lucide-react`, `xlsx`, `vite`, `vitest`, `@testing-library/react`, `typescript`.

- [ ] **Step 2: Configurare TypeScript (`tsconfig.json` e `tsconfig.node.json`)**
Abilitare strict mode, jsx react-jsx, alias `@/*` -> `src/*`.

- [ ] **Step 3: Configurare Vite e Vitest (`vite.config.ts`, `vitest.config.ts`)**
Impostare `base: './'` per compatibilità con GitHub Pages e jsdom per l'ambiente di test.

- [ ] **Step 4: Scrivere il test iniziale `src/App.test.tsx`**
Verificare il render dell'header dell'app "WorkOrganizer".

- [ ] **Step 5: Eseguire il test per verificare che fallisca**
Run: `npm test` (o `npx vitest run`)
Expected: FAIL (file sorgenti mancanti).

- [ ] **Step 6: Creare `index.html`, `src/index.css`, `src/App.tsx`, `src/main.tsx`**
Strutturare lo scheletro iniziale dell'app con variabili CSS Dark/Light e titolo WorkOrganizer.

- [ ] **Step 7: Eseguire il test per verificare che passi**
Run: `npx vitest run`
Expected: PASS

- [ ] **Step 8: Commit**
```bash
git add .
git commit -m "chore: setup vite react typescript and vitest harness"
```

---

### Task 2: Domain Engine - TimeCalculator (TDD)

**Files:**
- Create: `src/core/domain/timeCalculator.ts`
- Test: `src/core/domain/timeCalculator.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface TimeEntryInput {
    morningIn?: string | null;  // "HH:mm"
    lunchOut?: string | null;   // "HH:mm"
    lunchIn?: string | null;    // "HH:mm"
    eveningOut?: string | null; // "HH:mm"
    permissionMinutes?: number;
    isSmartWork?: boolean;
  }

  export interface TimeCalculationResult {
    lunchDurationMinutes: number;
    workedMinutes: number;
    expectedExit8h: string | null; // "HH:mm"
    expectedExit7h: string | null; // "HH:mm"
    deltaMinutes: number;          // rispetto a 480 min
  }

  export function calculateDailyTime(input: TimeEntryInput, minLunchMinutes?: number): TimeCalculationResult;
  export function minutesToHHmm(minutes: number, showSign?: boolean): string;
  export function hhMmToMinutes(timeStr: string): number;
  ```

- [ ] **Step 1: Scrivere i test unitari in `src/core/domain/timeCalculator.test.ts`**
Coprire:
- Conversione ore/minuti (`"08:01"` -> 481 min, 481 min -> `"08:01"`).
- Giornata smart: workedMinutes = 480, lunchDuration = 0, delta = 0, uscite = null.
- Giornata presenza standard (8:01 - 12:06, 12:35 - 17:36): pausa 29m forzata a 30m, uscita 8h prevista (8:01 + 30m + 8h = 16:31), uscita 7h (15:31), ore lavorate = 9h 05m (545 min), delta = +65m.
- Giornata con pausa lunga (45 min): rispetto della durata reale di 45 min.
- Giornata con permessi orari (es. 90 min permessi sommati al totale lavorato).

- [ ] **Step 2: Eseguire il test per verificare il fallimento**
Run: `npx vitest run src/core/domain/timeCalculator.test.ts`
Expected: FAIL (`calculateDailyTime` non definito).

- [ ] **Step 3: Implementare `timeCalculator.ts`**
Implementare l'aritmetica su minuti con gestione rollover mezzanotte, minimo 30m pausa e calcolo orari uscita 7h/8h.

- [ ] **Step 4: Eseguire il test per verificare che passi**
Run: `npx vitest run src/core/domain/timeCalculator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/core/domain/timeCalculator.ts src/core/domain/timeCalculator.test.ts
git commit -m "feat(core): implement timeCalculator with 30m min lunch and 7h/8h exits"
```

---

### Task 3: Domain Engine - PolicyValidator & Calendario Mensile (TDD)

**Files:**
- Create: `src/core/domain/policyValidator.ts`
- Test: `src/core/domain/policyValidator.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export type DayStatus = 'presenza' | 'smart' | 'idea_smart' | 'ferie' | 'chiusura' | 'non_lavorativo';

  export interface CalendarDayInfo {
    date: string; // "YYYY-MM-DD"
    status: DayStatus;
    notes?: string;
    isConfirmed?: boolean;
  }

  export interface WeekValidationResult {
    weekNumber: number;
    startDate: string;
    endDate: string;
    presenceCount: number;
    smartCount: number;
    ferieCount: number;
    isCompliant: boolean;
    errorReason?: string;
  }

  export interface MonthValidationResult {
    year: number;
    month: number; // 1-12
    workingDaysCount: number;
    presenceDays: number;
    smartDoneDays: number;
    smartPlannedDays: number;
    totalSmartDays: number;
    ferieDays: number;
    closureDays: number;
    unscheduledDaysCount: number;
    smartStatus: 'OK' | 'INCOMPLETO' | 'ERRORE';
    weeks: WeekValidationResult[];
    isMonthFullyCompliant: boolean;
  }

  export function validateMonthPolicy(
    year: number,
    month: number,
    days: CalendarDayInfo[],
    maxSmartPerMonth?: number,
    minPresencePerWeek?: number,
    maxSmartPerWeek?: number
  ): MonthValidationResult;
  ```

- [ ] **Step 1: Scrivere i test unitari in `src/core/domain/policyValidator.test.ts`**
Coprire:
- Target 10 smart: 10 totali -> 'OK', 8 -> 'INCOMPLETO' (mancano 2), 12 -> 'ERRORE'.
- Regola settimanale: 1 presenza e 4 smart -> Compliant.
- Violazione settimanale: 0 presenze e 4 smart -> Non Compliant ("Manca presenza obbligatoria").
- Violazione smart settimanale: 5 smart -> Non Compliant ("Superato massimo 4 smart").
- Ferie non compensa: 4 smart + 1 ferie + 0 presenze -> Non Compliant.
- Settimana tutta ferie (5 giorni ferie, 0 smart) -> Compliant (nessun obbligo presenza se zero lavoro).
- Settimana a cavallo di mese: considera i giorni adiacenti per la presenza.
- Conteggio giorni feriali escludendo weekend e festività italiane fisse.

- [ ] **Step 2: Eseguire il test per verificare il fallimento**
Run: `npx vitest run src/core/domain/policyValidator.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementare `policyValidator.ts`**
Implementare algoritmo di calcolo calendario, raggruppamento per settimana ISO (Lunedì-Domenica), conteggi e festività italiane.

- [ ] **Step 4: Eseguire il test per verificare che passi**
Run: `npx vitest run src/core/domain/policyValidator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/core/domain/policyValidator.ts src/core/domain/policyValidator.test.ts
git commit -m "feat(core): implement policyValidator for smart constraints and weekly presence"
```

---

### Task 4: Domain Engine - BancaOreManager & MealVouchersLedger (TDD)

**Files:**
- Create: `src/core/domain/bancaOreManager.ts`
- Create: `src/core/domain/mealVouchersLedger.ts`
- Test: `src/core/domain/bancaOreManager.test.ts`
- Test: `src/core/domain/mealVouchersLedger.test.ts`

**Interfaces:**
- Produces:
  ```typescript
  export interface QuarterSummary {
    quarterId: string; // "2026-Q1"
    year: number;
    quarterNumber: number; // 1-4
    monthDeltas: { month: number; deltaMinutes: number }[];
    totalDeltaMinutes: number;
    isMonth1Compliant: boolean; // delta >= 0
    canCoverDeficit: boolean;
  }

  export function getQuarterForMonth(year: number, month: number): { quarterId: string; quarterNumber: number; startMonth: number; endMonth: number };
  export function calculateQuarterBalance(quarterId: string, monthlyDeltas: { month: number; deltaMinutes: number }[]): QuarterSummary;

  export interface MealVoucherSummary {
    canteenUsedCount: number;
    canteenCostPerUnit: number;
    totalCanteenExpense: number; // canteenUsedCount * 1.50
    smartVoucherCount: number;
    smartVoucherValuePerUnit: number;
    totalSmartVouchersValue: number; // smartVoucherCount * 8.00
    netBalance: number; // totalSmartVouchersValue - totalCanteenExpense
  }

  export function calculateMealVouchers(
    canteenCount: number,
    smartCount: number,
    canteenCost?: number,
    smartValue?: number
  ): MealVoucherSummary;
  ```

- [ ] **Step 1: Scrivere test per `bancaOreManager.test.ts` e `mealVouchersLedger.test.ts`**
Coprire:
- Riconoscimento trimestri (Mesi 1-3 -> Q1, 4-6 -> Q2, 7-9 -> Q3, 10-12 -> Q4).
- Verifica regola mese 1 delta $\ge 0$.
- Calcolo cumulato trimestrale con azzeramento.
- Calcolo buoni pasto mensa (6 usati a 1,50€ = 9,00€ spesa) e buoni smart (10 a 8,00€ = 80,00€ valore), saldo netto +71,00€.

- [ ] **Step 2: Eseguire i test per verificare il fallimento**
Run: `npx vitest run src/core/domain/bancaOreManager.test.ts src/core/domain/mealVouchersLedger.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementare `bancaOreManager.ts` e `mealVouchersLedger.ts`**
Funzioni pure di calcolo e bilancio economico.

- [ ] **Step 4: Eseguire i test per verificare che passino**
Run: `npx vitest run src/core/domain/bancaOreManager.test.ts src/core/domain/mealVouchersLedger.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/core/domain/bancaOreManager.ts src/core/domain/mealVouchersLedger.ts src/core/domain/*.test.ts
git commit -m "feat(core): implement bancaOreManager and mealVouchersLedger"
```

---

### Task 5: Supabase Client, Auth Context & Local Storage Fallback

**Files:**
- Create: `supabase/migrations/20261104_init_workorganizer.sql`
- Create: `src/services/supabase/client.ts`
- Create: `src/services/supabase/authContext.tsx`
- Create: `src/services/storage/localCache.ts`
- Test: `src/services/storage/localCache.test.ts`

**Interfaces:**
- Produces:
  - Script SQL pronto per l'esecuzione in Supabase con tabelle (`app_settings`, `calendar_days`, `time_entries`, `bank_hours_quarters`) e policy RLS (`user_id = auth.uid()`).
  - `useAuth()` hook per stato utente, login, logout, registrazione.
  - `localCache` per salvataggio offline/fallback se l'utente lavora disconnesso o prima di configurare Supabase.

- [ ] **Step 1: Scrivere lo script di migrazione SQL `supabase/migrations/20261104_init_workorganizer.sql`**
Definire tabelle con vincoli foreign key su `auth.users(id)` e policy RLS per SELECT, INSERT, UPDATE, DELETE.

- [ ] **Step 2: Scrivere test per `localCache.test.ts`**
Testare serializzazione, lettura, salvataggio e fallback su default settings.

- [ ] **Step 3: Implementare `localCache.ts` e `client.ts`**
Inizializzare Supabase client leggendo da variabili d'ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) o LocalStorage (configurabili da UI).

- [ ] **Step 4: Implementare `AuthContext.tsx`**
Fornire `user`, `session`, `login(email, password)`, `signUp(email, password)`, `logout()`.

- [ ] **Step 5: Eseguire i test**
Run: `npx vitest run src/services/storage/localCache.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add supabase/ src/services/
git commit -m "feat(services): implement supabase client, auth context and local storage cache"
```

---

### Task 6: Data Repository & State Synchronization Service

**Files:**
- Create: `src/services/repository/workDataService.ts`
- Create: `src/context/WorkOrganizerContext.tsx`
- Test: `src/services/repository/workDataService.test.ts`

**Interfaces:**
- Produces:
  - Interfaccia unificata per caricamento e salvataggio dei giorni di calendario, timbrature e impostazioni, con sincronizzazione trasparente Supabase + cache locale.
  - Sincronizzazione automatica: inserimento timbrature -> aggiorna lo stato del giorno (es. da `idea_smart` a `smart` o `presenza`).

- [ ] **Step 1: Scrivere test unitario per `workDataService.test.ts`**
Verificare il salvataggio di un giorno e la propagazione automatica dello stato confermato.

- [ ] **Step 2: Implementare `workDataService.ts`**
CRUD con Supabase e sincronizzazione speculare su `localCache`.

- [ ] **Step 3: Implementare `WorkOrganizerContext.tsx`**
Provider React che espone stato del mese attivo (`currentYear`, `currentMonth`, `days`, `timeEntries`, `settings`), funzioni di mutazione (`updateDayStatus`, `updateTimeEntry`, `updateSettings`) e calcoli derivati.

- [ ] **Step 4: Eseguire i test**
Run: `npx vitest run src/services/repository/workDataService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/services/repository/ src/context/
git commit -m "feat(state): implement unified workDataService and WorkOrganizerContext"
```

---

### Task 7: UI Component - Header & Global Navigation

**Files:**
- Create: `src/components/Header/Header.tsx`
- Create: `src/components/Header/Header.module.css`
- Create: `src/components/Header/MonthSelector.tsx`
- Create: `src/components/Header/KpiBadges.tsx`
- Test: `src/components/Header/Header.test.tsx`

**Interfaces:**
- Produces:
  - Header fisso superiore con:
    - Logo e titolo WorkOrganizer
    - Navigatore mese (`< Ottobre 2026 >` con salto al mese corrente)
    - KPI Pills: Smart target (`10/10 gg`), Saldo Banca Ore trimestrale (`+1h 45m`), Buoni Smart / Mensa
    - Quick Layout Switcher: bottoni rapidi per alternare Layout A (Tabbed), B (Split), C (Smart Sheet)
    - Theme Toggle: Dark / Light
    - Tasto Impostazioni / Login / Logout

- [ ] **Step 1: Scrivere test in `src/components/Header/Header.test.tsx`**
Verificare il render dei componenti, il cambio mese tramite i bottoni avanti/indietro e la visualizzazione corretta dei KPI.

- [ ] **Step 2: Implementare `MonthSelector.tsx`, `KpiBadges.tsx`, `Header.tsx` e relativo CSS**
Design moderno con badge colorati ad alto contrasto.

- [ ] **Step 3: Eseguire il test per verificare che passi**
Run: `npx vitest run src/components/Header/Header.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/components/Header/
git commit -m "feat(ui): implement modern Header with MonthSelector, Kpis and LayoutSwitcher"
```

---

### Task 8: UI Feature - Calendar & Month Planning Grid

**Files:**
- Create: `src/features/calendar/CalendarGrid.tsx`
- Create: `src/features/calendar/CalendarDayCard.tsx`
- Create: `src/features/calendar/StatusSelectorModal.tsx`
- Create: `src/features/calendar/WeekSummaryBadge.tsx`
- Create: `src/features/calendar/Calendar.module.css`
- Test: `src/features/calendar/CalendarGrid.test.tsx`

**Interfaces:**
- Produces:
  - Griglia calendario responsive (Lunedì - Domenica) con visualizzazione causali (`PRESENZA`, `SMART`, `IDEA SMART`, `FERIE`, `CHIUSURA`, `NON LAVORATIVO`).
  - Badge di conformità settimanale su ciascuna riga (verde se OK, rosso con motivazione se violata la policy).
  - Popover / modal rapido per cambiare causale con un click.

- [ ] **Step 1: Scrivere test in `CalendarGrid.test.tsx`**
Verificare rendering dei giorni del mese, assegnazione causale tramite click e visualizzazione dell'alert sulla settimana non conforme.

- [ ] **Step 2: Implementare i componenti del Calendario e relativo CSS**
Stili cromatici corrispondenti al foglio originale (Blu per Presenza, Verde chiaro Smart, Arancio Idea Smart, Verde scuro Ferie, Rosso Chiusura).

- [ ] **Step 3: Eseguire il test per verificare che passi**
Run: `npx vitest run src/features/calendar/CalendarGrid.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/features/calendar/
git commit -m "feat(ui): implement CalendarGrid with status picker and weekly policy badges"
```

---

### Task 9: UI Feature - Timbrature Registration Table & Day Detail Card

**Files:**
- Create: `src/features/timbrature/TimbratureTable.tsx`
- Create: `src/features/timbrature/DayTimeEditorCard.tsx`
- Create: `src/features/timbrature/TimeInput.tsx`
- Create: `src/features/timbrature/MonthlyTotalsSummary.tsx`
- Create: `src/features/timbrature/Timbrature.module.css`
- Test: `src/features/timbrature/TimbratureTable.test.tsx`

**Interfaces:**
- Produces:
  - Tabella mensile completa delle timbrature con 4 orari (Entrata, Uscita Pranzo, Rientro Pranzo, Uscita Sera).
  - Calcolo live di uscita prevista 7h e 8h.
  - Checkbox buono mensa utilizzato (1,50€) e toggle smart working (8h nominali).
  - Scheda interattiva per editing rapido del singolo giorno.
  - Tabella di riepilogo mensile a piè pagina (giorni lavorativi, lavorati, buoni pasto, banca ore).

- [ ] **Step 1: Scrivere test in `TimbratureTable.test.tsx`**
Verificare inserimento timbratura mattina, comparsa dell'uscita prevista calcolata e calcolo totale lavorato.

- [ ] **Step 2: Implementare componenti timbrature e validazione input orari**
Supporto orario veloce con auto-tab e formattazione "HH:mm".

- [ ] **Step 3: Eseguire il test per verificare che passi**
Run: `npx vitest run src/features/timbrature/TimbratureTable.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/features/timbrature/
git commit -m "feat(ui): implement TimbratureTable with live exit predictions and summary ledger"
```

---

### Task 10: Three Switchable Layouts (Tabbed, Split, Smart Sheet)

**Files:**
- Create: `src/layouts/TabbedLayout.tsx`
- Create: `src/layouts/SplitLayout.tsx`
- Create: `src/layouts/SmartSheetLayout.tsx`
- Create: `src/layouts/TodayHeroWidget.tsx`
- Create: `src/layouts/LayoutManager.tsx`
- Test: `src/layouts/LayoutManager.test.tsx`

**Interfaces:**
- Produces:
  - `LayoutManager` che renderizza dinamicamente il layout attivo scelto dall'utente:
    - **Tabbed**: Schede separate per Calendario e Timbrature a tutta larghezza.
    - **Split**: Due colonne affiancate (Calendario interattivo a sinistra, Editor giorno attivo con orari e uscite a destra).
    - **Smart Sheet**: Hero Widget "Oggi" in primo piano (timbratura veloce in un clic) + tabella continua mensile densa.

- [ ] **Step 1: Scrivere test in `LayoutManager.test.tsx`**
Verificare il cambio di layout in base alla preferenza salvata.

- [ ] **Step 2: Implementare `TodayHeroWidget.tsx` e i tre layout dedicati**
Integrazione responsive per desktop, tablet e mobile.

- [ ] **Step 3: Eseguire il test per verificare che passi**
Run: `npx vitest run src/layouts/LayoutManager.test.tsx`
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add src/layouts/
git commit -m "feat(ui): implement all three switchable layouts with TodayHeroWidget"
```

---

### Task 11: Settings Page, Parameter Tuning & Backup/Export Engine

**Files:**
- Create: `src/features/settings/SettingsPage.tsx`
- Create: `src/features/settings/SupabaseConfigModal.tsx`
- Create: `src/services/export/excelExporter.ts`
- Create: `src/services/export/jsonBackup.ts`
- Test: `src/features/settings/SettingsPage.test.tsx`
- Test: `src/services/export/excelExporter.test.ts`

**Interfaces:**
- Produces:
  - Pagina Impostazioni per calibrare:
    - Soglia max smart (default 10)
    - Minimo presenze settimanali (default 1)
    - Max smart settimanali (default 4)
    - Orario base 8h, orario minimo 7h, pausa pranzo min 30m, recupero banca ore max 1h
    - Costo mensa (1,50€) e valore buono smart (8,00€)
    - Layout predefinito e tema Dark/Light
  - Modale credenziali Supabase (URL + Anon Key)
  - Esportatore Excel (.xlsx) formattato come il foglio originale e Backup JSON completo

- [ ] **Step 1: Scrivere test per export Excel/JSON e salvataggio impostazioni**
Verificare che i parametri modificati aggiornino le regole dell'applicazione.

- [ ] **Step 2: Implementare `excelExporter.ts` con SheetJS e `jsonBackup.ts`**
Generazione file scaricabile direttamente dal browser.

- [ ] **Step 3: Implementare `SettingsPage.tsx` e `SupabaseConfigModal.tsx`**
Interfaccia chiara e moderna.

- [ ] **Step 4: Eseguire i test**
Run: `npx vitest run src/features/settings/SettingsPage.test.tsx src/services/export/excelExporter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/features/settings/ src/services/export/
git commit -m "feat(settings): implement settings page, supabase config and excel/json export"
```

---

### Task 12: Auth Screen, GitHub Actions Workflow & Full Build Verification

**Files:**
- Create: `src/features/auth/AuthScreen.tsx`
- Create: `.github/workflows/deploy.yml`
- Modify: `src/App.tsx`
- Test: `src/App.integration.test.tsx`

**Interfaces:**
- Produces:
  - Schermata di login/registrazione Supabase Auth con fallback locale ("Continua come Ospite / Demo Locale").
  - Workflow GitHub Actions per build automatica e deploy su GitHub Pages ad ogni push su `main`.
  - Verifica complessiva dell'applicazione (test di integrazione, build `npm run build` senza warning).

- [ ] **Step 1: Implementare `AuthScreen.tsx` e collegarlo ad `App.tsx`**
Se l'utente non è autenticato e non è in modalità ospite, mostra il login.

- [ ] **Step 2: Configurare `.github/workflows/deploy.yml`**
Pipeline CI/CD: checkout, setup node, install, test, build, deploy su GitHub Pages.

- [ ] **Step 3: Scrivere ed eseguire test di integrazione end-to-end `App.integration.test.tsx`**
Verificare il flusso completo: navigazione mese, cambio causale, inserimento timbratura, verifica alert e cambio layout.

- [ ] **Step 4: Eseguire la suite di test completa e il build di produzione**
Run: `npm test && npm run build`
Expected: Tutti i test passano, il bundle di produzione viene generato correttamente nella cartella `dist/`.

- [ ] **Step 5: Commit finale**
```bash
git add .
git commit -m "feat(app): finalize auth screen, github actions deploy and integration tests"
```
