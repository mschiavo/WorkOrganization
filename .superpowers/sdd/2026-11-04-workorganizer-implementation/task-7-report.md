# Task 7 Report: UI Component - Header & Global Navigation

## Status: DONE

## Deliverables Created / Verified
- `src/components/Header/MonthSelector.tsx`:
  - Navigazione mese `< Mese Anno >` formattato in italiano con iniziale maiuscola.
  - Tasto rapido "Oggi" con icona calendario.
  - Funzionalità standalone o integrata con `useWorkOrganizer()`.
- `src/components/Header/KpiBadges.tsx`:
  - Badge Target Smart: `${totalSmartDays}/${maxSmartDays} gg` con color coding `data-status="OK" | "INCOMPLETO" | "ERRORE"`.
  - Badge Banca Ore: `${quarterId}: ${delta}` con color coding `data-status="positive" | "negative"`.
  - Badge Buoni Pasto: `Buoni: € ${netBalance}` con color coding `data-status="positive" | "negative"`.
- `src/components/Header/Header.tsx`:
  - Brand WorkOrganizer e badge v0.1.
  - Quick Layout Switcher per i 3 layout (`tabbed`, `split`, `smart-sheet`) con attributo accessibile `aria-pressed`.
  - Theme Toggle per alternare tema dark e light (sincronizzato con `document.documentElement[data-theme]`).
  - Gestione stato utente: visualizzazione badge `Ospite` o email utente loggato con pulsante logout.
  - Pulsante Impostazioni.
- `src/components/Header/Header.module.css`:
  - Stili moderni, responsive, con variabili CSS e bordi contrastati.
- `src/components/Header/Header.test.tsx`:
  - 12 test unitari ed end-to-end component che coprono rendering, navigazione mese, switch layout, cambio tema e interazioni auth/impostazioni.

## Verification Evidence
- `npx vitest run`: 121/121 test passati su 10 file di test.
- `npx tsc`: 0 errori di compilazione TypeScript (strict mode).
- `npm run build`: bundle di produzione completato con successo.

## Git Rule Compliance
- Nessuna operazione git eseguita (rispetto assoluto del vincolo imposto dall'utente).
