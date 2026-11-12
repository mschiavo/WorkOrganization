# Task 8 Brief: UI Feature - Calendar & Month Planning Grid

## Goal
Implementare la griglia mensile interattiva di pianificazione delle causali di lavoro con verifica visiva dei vincoli settimanali:
1. `src/features/calendar/CalendarGrid.tsx`: griglia del mese corrente con settimane da Lunedì a Domenica e badge di conformità settimanale.
2. `src/features/calendar/CalendarDayCard.tsx`: card interattiva del singolo giorno con causale, colore di stato, indicatori oggi/selezionato/confermato e note.
3. `src/features/calendar/WeekSummaryBadge.tsx`: indicatore di riga settimanale (conforme o alert rosso con motivazione).
4. `src/features/calendar/StatusSelectorModal.tsx`: popover / dialog rapido per assegnare una causale (`presenza`, `smart`, `idea_smart`, `ferie`, `chiusura`, `non_lavorativo`) e modificare le note.
5. `src/features/calendar/Calendar.module.css`: stili css modulari con palette di colori originale (Blu, Verde, Arancio, Rosso, Grigio).
6. `src/features/calendar/CalendarGrid.test.tsx`: test unitari del calendario.

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Interfaces & Contracts

### In `src/features/calendar/CalendarGrid.tsx`:
Props opzionali (si appoggia a `useWorkOrganizer()` per impostazioni predefinite):
```typescript
export interface CalendarGridProps {
  onSelectDay?: (date: string) => void;
  compact?: boolean; // Per layout Split
}
```

### Comportamento e Interazioni:
1. **Griglia Settimanale**:
   - 7 colonne (Lun..Dom) con header colonne.
   - Ogni riga corrisponde a una settimana solare e include a lato o in testata il `WeekSummaryBadge`.
   - Clic su una card giorno: imposta `selectedDate` e apre `StatusSelectorModal`.
2. **Causali e Colori**:
   - `presenza`: badge blu
   - `smart`: badge verde chiaro
   - `idea_smart`: badge arancione
   - `ferie`: badge verde scuro
   - `chiusura`: badge rosso
   - `non_lavorativo`: weekend / festivo grigio
3. **WeekSummaryBadge**:
   - Se `week.isCompliant`: indicatore verde "✓ Settimana N: Conforme" (es. "1 Presenza, 2 Smart").
   - Se non compliant: indicatore rosso con `week.errorReason` (es. "Manca presenza obbligatoria").
4. **StatusSelectorModal**:
   - Selettore rapido con bottoni per ciascuna delle 6 causali.
   - Campo opzionale per note.
   - Salvataggio tramite `updateDayStatus(date, status, notes)`.

## Deliverables
- `src/features/calendar/CalendarGrid.tsx`
- `src/features/calendar/CalendarDayCard.tsx`
- `src/features/calendar/WeekSummaryBadge.tsx`
- `src/features/calendar/StatusSelectorModal.tsx`
- `src/features/calendar/Calendar.module.css`
- `src/features/calendar/CalendarGrid.test.tsx`
- Report in `.superpowers/sdd/2026-11-04-workorganizer-implementation/task-8-report.md`

## Verification
- `npx vitest run src/features/calendar/CalendarGrid.test.tsx`
- `npx vitest run` (tutti i test verdi)
- `npx tsc` (zero errori)
