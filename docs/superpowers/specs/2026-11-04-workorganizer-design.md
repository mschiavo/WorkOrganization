# WorkOrganizer: Design Document

**Data:** 2026-11-04 (Ultimo aggiornamento: 2026-11-06)  
**Stato:** Approvato & Completamente Implementato (12/12 Task completati con successo e verificati)  
**Ambito:** Sviluppo WebApp Personale per Pianificazione Mese, Timbrature e Bilancio Orario/Economico  

---

## 1. Intent & The Why

### 1.1 Contesto e Motivazione
Oggi la gestione del lavoro mensile, la conformità alle policy aziendali sullo smart working (massimo 10 giorni al mese, presenza settimanale minima), il registro delle 4 timbrature giornaliere, il calcolo della banca ore trimestrale e il conteggio economico dei buoni pasto sono gestiti tramite due fogli di calcolo separati:
1. Un Google Spreadsheet (*"IC - Calendario Smart"*) per la pianificazione e validazione dei giorni di smart working, presenze, ferie e chiusure.
2. Un file Microsoft Excel (*"Timbrature_2026.xlsx"*) per la consuntivazione oraria giornaliera, le formule di pausa pranzo, i delta orari e i buoni mensa/smart.

Questo disaccoppiamento richiede doppio inserimento manuale, espone al rischio di disallineamento tra pianificato ed effettivo, e non offre un'interfaccia moderna e reattiva accessibile da desktop e predisposta per la mobilità.

### 1.2 Obiettivo
Creare **WorkOrganizer**: una webapp moderna, esteticamente curata, tecnologica e performante, che unifichi la pianificazione del calendario e la consuntivazione delle timbrature in un unico ecosistema sincronizzato, con persistenza su Cloud Database (Supabase) e hosting distribuibile gratuitamente (GitHub Pages).

---

## 2. Goals, Non-Goals & Anti-Goals

### 2.1 Goals
- **Pianificazione Calendario**: navigazione mensile, assegnazione rapida degli stati del giorno lavorativo (`PRESENZA`, `SMART`, `IDEA SMART`, `FERIE`, `CHIUSURA`, `NON LAVORATIVO`).
- **Motore di Convalida Vincoli Policy**:
  - Controllo target smart working mensile: esattamente 10 giorni (`smart` + `idea smart`), con alert per mesi incompleti o in eccesso.
  - Controllo settimanale: almeno 1 presenza e massimo 4 smart a settimana.
  - Regola ferie: le ferie non compensano il giorno di presenza obbligatorio.
  - Quadratura lavorativi: alert su giorni lavorativi non ancora pianificati.
- **Registro Timbrature Intelligente**:
  - Inserimento dei 4 passaggi: Entrata Mattina, Uscita Pranzo, Rientro Pranzo, Uscita Sera.
  - Calcolo pausa pranzo: differenza tra Uscita Pranzo e Rientro Pranzo con minimo inderogabile a 30 minuti (fill automatico a 30 min se inferiore; 0 min se giornata di Smart; se presenza/smart con permesso orario, conteggio automatico della pausa).
  - Stima dinamica uscita: non appena inserita l'entrata mattutina, calcolo automatico dell'orario di uscita previsto sia per le 8 ore che per le 7 ore.
  - Ore di permesso: inserimento ore/minuti di permesso giornaliero che concorrono al monte ore.
- **Banca Ore & Azzeramento Trimestrale**:
  - Calcolo del delta giornaliero rispetto alle 8h standard.
  - Banca ore trimestrale azzerata al termine di ogni trimestre (fine Marzo, fine Giugno, fine Settembre, fine Dicembre).
  - Regole saldo: mese 1 del trimestre con delta $\ge 0$; mesi 2 e 3 possono essere in negativo se coperti dalla capienza della banca ore.
  - Tolleranza recupero: possibilità di usufruire fino a massimo 1h di recupero giornaliero anche se il monte accantonato non è ancora capiente, ipotizzando il pareggio entro il trimestre.
- **Modulo Economico Buoni Pasto**:
  - Spesa mensa in presenza: flag se usato o meno il buono mensa (costo 1,50 € a carico dipendente).
  - Buoni pasto smart maturati: conteggio automatico dei buoni maturati nei giorni di smart (valore 8,00 € a buono).
  - Cruscotto economico mensile con consuntivo e bilancio.
- **Sincronizzazione Automatica**: il completamento delle timbrature reali conferma e sincronizza automaticamente lo stato del calendario (es. trasforma `IDEA SMART` in `SMART` o conferma la `PRESENZA`), rivalidando immediatamente i vincoli mensili.
- **Layout Switcher & Personalizzazione**: supporto a tre visualizzazioni intercambiabili in qualsiasi momento (Tabbed, Split Master-Detail, Smart Sheet) e pagina dedicata di Impostazioni per calibrare parametri e regole.

### 2.2 Non-Goals (per la v1)
- Integrazione diretta con software hardware di timbratura aziendale o badge NFC fisici (l'app è uno strumento personale dell'utente).
- Multi-utenza aziendale o gestione gerarchica con approvazione manageriale (applicazione single-user privata).
- Notifiche push native di sistema su mobile (saranno introdotte nello step mobile successivo come PWA).

### 2.3 Anti-Goals
- **Non creare un clone rigido di Excel**: non deve essere una tabella anonima e priva di feedback, ma una vera dashboard SaaS moderna, fluida, piacevole e interattiva.
- **Nessuna dipendenza da backend pesanti da manutenere**: evitare architetture che costringano l'utente ad aprire porte, gestire server VPS o configurare certificati SSL.

---

## 3. Constraints

1. **Hosting Statico**: il frontend deve essere una Single Page Application distribuibile su GitHub Pages (o Cloudflare Pages) senza necessità di un server Node.js/Python dedicato per il serving.
2. **Database Cloud Esterno**: i dati devono essere persistiti su un database PostgreSQL remoto (Supabase free tier), con chiamate sicure dal frontend tramite Anon Key e Row Level Security (RLS) o auth personale.
3. **Responsive Web Design**: priorità desktop, ma layout completamente fruibile su tablet e mobile senza elementi rotti o scroll orizzontali indesiderati.
4. **Standard del Workspace**: TypeScript rigoroso con tipizzazione esplicita, assenza di hacks o casts ingiustificati, test automatizzati per il motore di calcolo orario e i vincoli di policy.

---

## 4. Approaches Considered

### Approccio 1: SPA Moderna (React + TypeScript + Vite) + Supabase Cloud DB + GitHub Pages *(SCELTO)*
- **Architettura**: SPA client-side ultraveloce con React 19, TypeScript e Vite; CSS moderno modulare (o Vanilla CSS con variabili di design); Supabase JS Client per CRUD e persistenza; GitHub Pages con GitHub Actions per deployment automatico.
- **Pro**: Manutenzione infrastrutturale zero, velocità estrema, sincronizzazione cloud istantanea multi-dispositivo, PostgreSQL solido con export SQL e backup.
- **Contro**: Dipendenza dalle API gratuite di Supabase.
- **Esito**: Scelto all'unanimità con l'utente.

### Approccio 2: Monolito Serverless (Next.js con App Router + Neon/Turso)
- **Architettura**: Frontend e Backend unificati in Next.js deployato su Vercel.
- **Pro**: API routes interne tipizzate, SSR.
- **Contro**: Non compatibile con l'hosting su GitHub Pages richiesto come priorità.

### Approccio 3: Full-Stack Self-Hosted (FastAPI/Node + PostgreSQL su Docker su NAS domestico)
- **Architettura**: Container Docker su NAS personale con reverse proxy.
- **Pro**: 100% sovranità del dato in locale.
- **Contro**: Richiede configurazione di rete, VPN/DDNS per accesso dall'ufficio o in mobilità, alta manutenzione. Scartato per la fase iniziale.

---

## 5. Architectural & System Design

```
+-------------------------------------------------------------------------+
|                              WORKORGANIZER                              |
|                       React 19 + TypeScript + Vite                      |
+-------------------------------------------------------------------------+
       |                                                   |
       v                                                   v
+-------------------------------+       +---------------------------------+
|       UI Presentation         |       |      Domain & Business Logic    |
| - Layout A: Tabbed Dual-View  |       | - PolicyValidator (Smart/Pres.) |
| - Layout B: Split Dashboard   | <---> | - TimeCalculator (Ore, 7h/8h)   |
| - Layout C: Smart Sheet       |       | - BancaOreManager (Trimestri)   |
| - Settings & Rule Tuning      |       | - MealVouchersLedger (Mensa/Sm) |
+-------------------------------+       +---------------------------------+
       |                                                   |
       +-------------------------+-------------------------+
                                 |
                                 v
                +---------------------------------+
                |   Data Layer & State Management |
                | - React Query / Custom Hook Svc |
                | - Offline Cache (LocalStorage)  |
                | - Export/Import (JSON / Excel)  |
                +---------------------------------+
                                 |
                                 v
                +---------------------------------+
                |      Supabase (Cloud Postgres)  |
                | - profiles / settings           |
                | - calendar_days                 |
                | - time_entries                  |
                | - bank_hours_quarters           |
                +---------------------------------+
```

### 5.1 Modello Dati (Database Schema con Supabase Auth & RLS)

Tutte le tabelle includono la chiave `user_id: UUID references auth.users(id)` per garantire l'isolamento completo dei dati tramite **Row Level Security (RLS)** su Supabase con policy `auth.uid() = user_id`.

#### Tabella `app_settings`
Configurazioni personali e parametri delle regole:
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key `auth.users(id)`, Unique)
- `max_smart_days_month`: integer (default: 10)
- `min_presence_days_week`: integer (default: 1)
- `max_smart_days_week`: integer (default: 4)
- `ferie_compensates_presence`: boolean (default: false)
- `standard_day_hours`: numeric/interval (default: 8.0)
- `reduced_day_hours`: numeric/interval (default: 7.0)
- `min_lunch_break_minutes`: integer (default: 30)
- `max_daily_bank_recovery_minutes`: integer (default: 60)
- `canteen_voucher_cost`: numeric (default: 1.50)
- `smart_voucher_value`: numeric (default: 8.00)
- `preferred_layout`: enum (`'tabbed'`, `'split'`, `'smart-sheet'`) (default: `'tabbed'`)
- `preferred_theme`: enum (`'dark'`, `'light'`, `'system'`) (default: `'dark'`)
- `updated_at`: timestamp with time zone

#### Tabella `calendar_days`
Pianificazione e stato dei giorni del calendario:
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key `auth.users(id)`)
- `date`: date (formato `YYYY-MM-DD`, Unique insieme a `user_id`)
- `status`: enum (`'presenza'`, `'smart'`, `'idea_smart'`, `'ferie'`, `'chiusura'`, `'non_lavorativo'`)
- `notes`: text (opzionale)
- `is_confirmed`: boolean (default: false, confermato da timbratura effettiva)
- `created_at`: timestamp with time zone
- `updated_at`: timestamp with time zone

#### Tabella `time_entries`
Consuntivazione oraria e timbrature giornaliere:
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key `auth.users(id)`)
- `date`: date (Unique insieme a `user_id`, Foreign Key concettuale su data)
- `morning_in`: time (es. `08:01`)
- `lunch_out`: time (es. `12:06`)
- `lunch_in`: time (es. `12:35`)
- `evening_out`: time (es. `17:36`)
- `permission_hours`: numeric/interval (es. `01:30`, ore di permesso fruite)
- `lunch_duration_minutes`: integer (calcolato: $\max(30, \text{lunch\_in} - \text{lunch\_out})$, oppure $0$ in smart)
- `worked_minutes`: integer (calcolato: minuti lavorati effettivi + permessi)
- `expected_exit_8h`: time (calcolato: $\text{morning\_in} + \text{lunch} + 8\text{h}$)
- `expected_exit_7h`: time (calcolato: $\text{expected\_exit\_8h} - 1\text{h}$)
- `delta_minutes`: integer (calcolato: $\text{worked\_minutes} - 480\text{min}$)
- `canteen_used`: boolean (default: false, spesa 1.50€)
- `is_smart_work`: boolean (default: false, matura buono 8.00€)
- `updated_at`: timestamp with time zone

#### Tabella `bank_hours_quarters`
Consuntivo trimestrale della banca ore:
- `id`: UUID (Primary Key)
- `user_id`: UUID (Foreign Key `auth.users(id)`)
- `quarter_id`: string (es. `'2026-Q1'`, Unique insieme a `user_id`)
- `year`: integer
- `quarter_number`: integer (1, 2, 3, 4)
- `carryover_from_prev_quarter`: integer (minuti, tipicamente 0 perché la banca ore si azzera a ogni fine trimestre)
- `total_delta_minutes`: integer (saldo cumulativo del trimestre)
- `is_closed`: boolean (true a fine trimestre)

### 5.2 Sicurezza, Autenticazione & RLS
- **Supabase Auth**: accesso tramite credenziali (email/password). Chi visita la webapp su GitHub Pages senza sessione attiva visualizza unicamente la schermata di login.
- **Row Level Security (RLS)**: abilitato su tutte le tabelle. Nessun dato può essere letto o modificato se `auth.uid() != user_id`.
- **Session Persistence**: la sessione utente è salvata in modo sicuro nel client (cookie / LocalStorage sicuro gestito dal Supabase SDK), consentendo l'accesso persistente dal browser personale.

---

## 6. Business Logic & Calculation Rules

### 6.1 Regole del Calendario Mensile & Alert Settimanali
1. **Target Smart Mensile**:
   - $\text{Smart Totali} = \text{giorni}(\text{smart}) + \text{giorni}(\text{idea\_smart})$.
   - Se $\text{Smart Totali} == 10$: stato **OK** (verde).
   - Se $\text{Smart Totali} < 10$: stato **INCOMPLETO** (giallo/arancione con indicazione dei giorni mancanti).
   - Se $\text{Smart Totali} > 10$: stato **ERRORE** (rosso con indicazione dei giorni in eccesso).
2. **Regola Settimanale di Presenza & Smart**:
   - Per ogni settimana solare (da Lunedì a Domenica):
     - $\text{Presenze} \ge 1$ obbligatoria.
     - $\text{Smart} \le 4$ massimo consentito.
     - Il giorno di ferie non sostituisce né compensa il giorno di presenza obbligatorio.
     - Alert visivo immediato sulla riga/blocco della settimana se la regola è violata.
3. **Quadratura Giorni Lavorativi del Mese**:
   - Calcolo automatico dei giorni feriali del mese (esclusi sabati, domeniche e festività nazionali).
   - Notifica visiva se vi sono giorni lavorativi scoperti (senza causale assegnata).

### 6.2 Regole di Timbratura & Calcolo Orario
1. **Modello Giornata Smart vs Presenza (Confermato da Specifiche & Excel)**:
   - Se un giorno è contrassegnato come **Smart Working**: il conteggio della giornata è **automaticamente impostato a 8h lavorate (minuti = 480)**, senza necessità di inserire orari di entrata/uscita e con pausa pranzo a **0 minuti** (come da formula Excel originale `IF(OR(N4="Smart", ...), TIME(8,0,0))`).
   - L'inserimento manuale dei passaggi orari (entrata, pausa, uscita) definisce invece una giornata in **Presenza** (o giornata con permesso).
   - Se un giorno era pianificato come `IDEA SMART` e l'utente conferma lo smart, lo stato diventa `SMART` (8h automatiche, buono smart 8€). Se invece l'utente registra timbrature orarie, il sistema converte lo stato in `PRESENZA` e applica il calcolo orario effettivo e la gestione mensa.

2. **Pausa Pranzo**:
   - In `PRESENZA`: la durata della pausa è data da $\text{lunch\_in} - \text{lunch\_out}$.
   - Se la differenza è $< 30$ minuti (o se non timbrata in presenza standard con orario spezzato), viene forzata per legge aziendale a un minimo di **30 minuti**.
   - In `SMART`: la pausa pranzo viene conteggiata a **0 minuti**.
   - In caso di presenza/smart con `PERMESSO` orario: la pausa pranzo segue la regola dei 30 minuti minimi (effettiva se timbrata o fillata a 30 min).

3. **Uscita Prevista Automatica**:
   - All'inserimento di `morning_in`:
     $$\text{expected\_exit\_8h} = \text{morning\_in} + \text{durata\_pranzo} + 8\text{h}$$
     $$\text{expected\_exit\_7h} = \text{expected\_exit\_8h} - 1\text{h}$$
   - Se la pausa pranzo effettiva differisce dai 30 minuti stimati (es. 40 minuti), l'orario di uscita si ricalcola istantaneamente.

4. **Banca Ore & Recuperi (Dettagli Builder Call)**:
   - Delta giornaliero: $\text{Delta} = \text{minuti\_lavorati} - 480$ minuti.
   - Azzeramento trimestrale: il saldo si chiude a fine trimestre (31 marzo, 30 giugno, 30 settembre, 31 dicembre) e riparte da 0 per il trimestre successivo.
   - Condizione mese 1 del trimestre ($\text{Delta} \ge 0$) e capienza mesi 2-3: gestiti come **alert informativi / warning KPI** visivi (non bloccanti nell'interfaccia).
   - Tolleranza recupero: ogni singolo giorno è consentito fino a un massimo di **1h di recupero** attingendo dalla banca ore anche a saldo zero, con presupposto di recupero entro il trimestre.

5. **Buoni Pasto & Consuntivo Economico**:
   - Presenza con mensa aziendale: $+1$ buono mensa fruito $\to$ costo dipendente $= 1,50$ € ciascuno.
   - Giornata in smart working: $+1$ buono pasto maturato $\to$ valore $= 8,00$ € ciascuno.
   - Bilancio netto del mese: $(\text{Buoni Smart} \times 8,00€) - (\text{Buoni Mensa Usati} \times 1,50€)$.

### 6.3 Regole Calendario & Ambito Settimanale (Builder Call)
1. **Settimane a cavallo tra mesi**: il calendario interroga e valuta la griglia completa (settimane da lunedì a domenica, comprese le giornate ponte del mese precedente/successivo) per evitare falsi allarmi sui vincoli settimanali.
2. **Attivazione vincolo presenza**: l'obbligo di almeno 1 presenza settimanale si attiva se nella settimana sono presenti giornate lavorate o pianificate in smart (se una settimana è interamente coperta da ferie o chiusura aziendale per 5 giorni consecutivi, non viene generato un falso allarme di assenza presenza).

### 6.4 Architettura di Sincronizzazione Dati (Builder Call)
- **Modello Online-First con Cache Locale**: l'applicazione comunica direttamente con Supabase tramite client SDK / React Query con aggiornamenti ottimistici dell'interfaccia. Lo storage locale (LocalStorage/IndexedDB) funge da cache rapida di lettura e salvaguardia offline. Funzionalità di backup manuale (export JSON/Excel) disponibili in ogni momento.

---

## 7. User Interface & Experience Design

### 7.1 Tre Layout Selezionabili
1. **Layout A: A Schede Tematiche (Tabbed Navigation)**
   - Header globale persistente con selettore mese/anno (`< Ottobre 2026 >`), visual switch veloce del layout, KPI pill (Smart 10/10, Banca Ore, Buoni).
   - Tab 1: *Calendario & Pianificazione* (griglia mensile, controlli settimanali, riepilogo giorni).
   - Tab 2: *Registro Timbrature & Banca Ore* (tabella orari dettagliata, delta, uscite previste e saldi trimestrali).
2. **Layout B: Split Master-Detail Dashboard**
   - Schermata unica divisa in due colonne responsive:
     - Colonna Sinistra: Calendario visivo compatto con indicatori di stato cromatici e alert settimanali.
     - Colonna Destra: Scheda interattiva del giorno selezionato con pulsanti orari rapidi ("Timbra adesso", preset), contatori ore e bilancio buono pasto.
3. **Layout C: Smart Sheet con Widget Oggi**
   - Hero Widget in testa: stato della giornata odierna, pulsante rapido per timbrare, orario di uscita 7h/8h in primo piano.
   - Sotto: tabella mensile ad alta densità informativa che racchiude sia le causali che gli orari, con filtri e totali a piè pagina.

### 7.2 Styling & Aesthetics
- **Dark Mode Moderno** come predefinito tecnologico, con toggle rapido per Light Mode e sincronizzazione con preferenze di sistema.
- Design pulito: card con bordi sottili e contrastati, badge di stato chiari con codifica colore coerente col foglio originale (Blu per Presenza, Verde chiaro per Smart, Arancio per Idea Smart, Verde scuro per Ferie, Rosso per Chiusura).
- Transizioni fluide e indicatori visivi non invadenti.

---

## 8. Development & Implementation Roadmap

1. **Setup & Scaffolding**:
   - Inizializzazione progetto Vite + React 19 + TypeScript.
   - Struttura cartelle modulare (`src/core/domain`, `src/features/calendar`, `src/features/timbrature`, `src/features/settings`, `src/services/supabase`).
   - Configurazione Supabase client e schemi database / migrazioni SQL.
2. **Domain Core & Business Engine (TDD)**:
   - Implementazione e test unitari esaustivi per `TimeCalculator` (formattazione ore, pause 30m, 7h/8h).
   - Implementazione e test per `PolicyValidator` (10 giorni smart, vincolo presenza settimanale, ferie).
   - Implementazione e test per `BancaOreManager` e `MealVouchersLedger`.
3. **Features & Components**:
   - Componenti base del Calendario (Mese, Settimane, Giorni, Selettore stati).
   - Tabella / Form delle Timbrature con time-picker moderni e validazione input.
   - I tre Layout (Tabbed, Split, Smart Sheet) alimentati dallo stesso stato.
   - Pagina Impostazioni & Configurazione regole.
4. **Persistenza & Export**:
   - Integrazione Supabase con sincronizzazione automatica e cache locale offline di sicurezza.
   - Funzionalità di backup: esportazione/importazione JSON e download foglio Excel (.xlsx).
5. **Verifica, Test & Deployment**:
   - Suite completa di test con Vitest.
   - Configurazione GitHub Actions per build e deploy automatico su GitHub Pages.

---

## 9. What's Left to the Builder
- Scelta precisa della libreria di gestione icone (es. `lucide-react` per estetica moderna).
- Gestione della formattazione date/orari (con funzioni native `Intl` o libreria leggera come `date-fns`).
- Struttura esatta dello script di migrazione SQL iniziale da eseguire nella dashboard di Supabase.
