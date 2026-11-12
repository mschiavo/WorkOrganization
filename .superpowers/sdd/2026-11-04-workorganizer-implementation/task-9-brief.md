# Task 9 Brief: UI Feature - Timbrature Registration Table & Day Detail Card

## Goal
Implementare i componenti per la registrazione e visualizzazione analitica delle timbrature orarie, del calcolo delta e delle uscite previste live:
1. `src/features/timbrature/TimbratureTable.tsx`: tabella completa di tutte le 28-31 righe del mese con orari, calcolo pausa pranzo, uscite previste 7h/8h, ore lavorate, delta banca ore e buono mensa.
2. `src/features/timbrature/DayDetailCard.tsx`: scheda di dettaglio per il giorno selezionato con bottoni "Ora Attuale" (Adesso) per ciascuno dei 4 passaggi orari, switch smart working, permessi, checkbox mensa e riepilogo matematico istantaneo.
3. `src/features/timbrature/TodayHeroWidget.tsx`: widget hero compatto per timbratura istantanea del giorno odierno con evidenziazione grafica delle uscite previste 7h e 8h.
4. `src/features/timbrature/Timbrature.module.css`: stili css modulari ad alto contrasto con tabella densa scrollabile e card responsive.
5. `src/features/timbrature/TimbratureTable.test.tsx` e `src/features/timbrature/DayDetailCard.test.tsx`: test unitari.

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Interfaces & Contracts

### In `src/features/timbrature/DayDetailCard.tsx`:
Props opzionali (si appoggia a `useWorkOrganizer()`):
```typescript
export interface DayDetailCardProps {
  date?: string; // default selectedDate
  onClose?: () => void;
}
```
- Mostra data selezionata formattata.
- Toggle Smart Working (imposta `isSmartWork: true` e stato `'smart'`).
- 4 campi orari ("HH:mm") per `morningIn`, `lunchOut`, `lunchIn`, `eveningOut`.
- Accanto a ciascun input orario, un bottone "Adesso" / "Ora attuale" (`data-testid="btn-now-morningIn"`, ecc.) che compila con l'ora corrente HH:mm.
- Input permessi orari (`permissionMinutes`).
- Checkbox `canteenUsed` (Buono Mensa consumato).
- Riepilogo in tempo reale calcolato con `calculateDailyTime`:
  - `data-testid="detail-expected-8h"`
  - `data-testid="detail-expected-7h"`
  - `data-testid="detail-worked-time"`
  - `data-testid="detail-delta"`
  - `data-testid="detail-lunch-duration"`

### In `src/features/timbrature/TimbratureTable.tsx`:
Props opzionali:
```typescript
export interface TimbratureTableProps {
  onRowClick?: (date: string) => void;
}
```
- Renderizza tutte le giornate del mese (`currentYear`, `currentMonth`).
- Ogni riga ha `data-testid={`row-${date}`}` e `data-selected={date === selectedDate}`.
- Clic su riga imposta `selectedDate` e chiama `onRowClick?.(date)`.
- Mostra colonne: Giorno, Stato, Entrata, Uscita Pranzo, Rientro Pranzo, Pausa, Uscita Sera, Permessi, Ore Lavorate, Uscita 7h, Uscita 8h, Delta, Mensa, Note.

### In `src/features/timbrature/TodayHeroWidget.tsx`:
- Data odierna.
- Pulsanti rapidi: "Entra Ora", "Pausa Pranzo", "Rientro Pranzo", "Uscita Sera".
- Live card con uscita 8h e 7h in evidenza.

## Deliverables
- `src/features/timbrature/TimbratureTable.tsx`
- `src/features/timbrature/DayDetailCard.tsx`
- `src/features/timbrature/TodayHeroWidget.tsx`
- `src/features/timbrature/Timbrature.module.css`
- `src/features/timbrature/TimbratureTable.test.tsx`
- `src/features/timbrature/DayDetailCard.test.tsx`
- Report in `.superpowers/sdd/2026-11-04-workorganizer-implementation/task-9-report.md`

## Verification
- `npx vitest run src/features/timbrature/TimbratureTable.test.tsx src/features/timbrature/DayDetailCard.test.tsx`
- `npx vitest run` (tutti i test verdi)
- `npx tsc` (zero errori)
