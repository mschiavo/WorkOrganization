# Task 7 Brief: UI Component - Header & Global Navigation

## Goal
Implementare la barra di navigazione e header superiore dell'applicazione:
1. `src/components/Header/MonthSelector.tsx`: navigatore temporale (`< Ottobre 2026 >` con bottone "Oggi").
2. `src/components/Header/KpiBadges.tsx`: pillole informative per Target Smart (`10/10 gg`), Saldo Banca Ore Trimestrale (es. `Q4: +01:30`) e Bilancio Buoni Pasto (es. `Buoni: +68.50€`).
3. `src/components/Header/Header.tsx`: testata persistente con logo WorkOrganizer, selettore layout rapido (Tabbed, Split, Smart Sheet), toggle Dark/Light, badge utente/guest e tasto impostazioni.
4. `src/components/Header/Header.module.css`: stili modulari, responsive e ad alto contrasto.
5. `src/components/Header/Header.test.tsx`: test unitari del componente.

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Interfaces & Contracts

### In `src/components/Header/Header.tsx`:
Props opzionali:
```typescript
export interface HeaderProps {
  onOpenSettings?: () => void;
  onOpenAuth?: () => void;
}
```
Si interfaccia con:
- `useWorkOrganizer()` per `currentYear`, `currentMonth`, `goToPrevMonth`, `goToNextMonth`, `goToToday`, `monthValidation`, `quarterSummary`, `mealVouchers`, `settings`, `updateSettings`.
- `useAuth()` per `user`, `isGuest`, `signOut`.

### Caratteristiche dei sotto-componenti:
- **MonthSelector**:
  - Mostra il mese in italiano con iniziale maiuscola (es. "Ottobre 2026").
  - Freccia precedente (`<` o icona ChevronLeft da `lucide-react`).
  - Freccia successiva (`>` o icona ChevronRight da `lucide-react`).
  - Pulsante rapido "Oggi" / "Mese corrente".
- **KpiBadges**:
  - Badge Smart: `Smart: ${monthValidation.totalSmartDays}/${settings.maxSmartDaysMonth} gg` con classi per status `'OK'` (verde), `'INCOMPLETO'` (arancione), `'ERRORE'` (rosso).
  - Badge Banca Ore: `${quarterSummary.quarterId}: ${minutesToHHmm(quarterSummary.totalDeltaMinutes, true)}` (colore verde se >= 0, rosso/arancione se < 0).
  - Badge Buoni: `Buoni: € ${mealVouchers.netBalance.toFixed(2)}`.
- **Layout Switcher**:
  - 3 pulsanti compatti per `'tabbed'`, `'split'`, `'smart-sheet'` che evidenziano quello attivo e chiamano `updateSettings({ preferredLayout: layout })`.
- **Theme Switcher**:
  - Toggle Dark / Light che imposta `document.documentElement.setAttribute('data-theme', theme)` e chiama `updateSettings({ preferredTheme: theme })`.

## Deliverables
- `src/components/Header/Header.tsx`
- `src/components/Header/Header.module.css`
- `src/components/Header/MonthSelector.tsx`
- `src/components/Header/KpiBadges.tsx`
- `src/components/Header/Header.test.tsx`
- Report in `.superpowers/sdd/2026-11-04-workorganizer-implementation/task-7-report.md`

## Verification
- `npx vitest run src/components/Header/Header.test.tsx`
- `npx vitest run` (tutti i test verdi)
- `npx tsc` (zero errori)
