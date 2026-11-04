# Task 2 Brief: Domain Engine - TimeCalculator (TDD)

## Goal
Implementare ed estendere la logica di calcolo orario in `src/core/domain/timeCalculator.ts` guidata dai test in `src/core/domain/timeCalculator.test.ts`.

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git init, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Interfaces & Contracts
In `src/core/domain/timeCalculator.ts`:
```typescript
export interface TimeEntryInput {
  morningIn?: string | null;  // Formato "HH:mm"
  lunchOut?: string | null;   // Formato "HH:mm"
  lunchIn?: string | null;    // Formato "HH:mm"
  eveningOut?: string | null; // Formato "HH:mm"
  permissionMinutes?: number;
  isSmartWork?: boolean;
}

export interface TimeCalculationResult {
  lunchDurationMinutes: number;
  workedMinutes: number;
  expectedExit8h: string | null; // Formato "HH:mm"
  expectedExit7h: string | null; // Formato "HH:mm"
  deltaMinutes: number;          // workedMinutes - 480 minuti (o rispetto a 8h)
}

export function hhMmToMinutes(timeStr: string): number;
export function minutesToHHmm(minutes: number, showSign?: boolean): string;
export function calculateDailyTime(input: TimeEntryInput, minLunchMinutes?: number): TimeCalculationResult;
```

## Business Rules to Test & Implement
1. `hhMmToMinutes` e `minutesToHHmm`:
   - "08:01" -> 481 minuti; 481 minuti -> "08:01".
   - Con `showSign: true`: +65 min -> "+01:05", -15 min -> "-00:15", 0 min -> "+00:00" o "00:00".
2. Giornata di **Smart Working** (`isSmartWork: true`):
   - workedMinutes = 480 (8h nominali).
   - lunchDurationMinutes = 0.
   - deltaMinutes = 0.
   - expectedExit8h = null, expectedExit7h = null.
3. Giornata di **Presenza standard** con pausa < 30 minuti:
   - Ingressi: morningIn "08:01", lunchOut "12:06", lunchIn "12:35" (differenza effettiva 29 minuti), eveningOut "17:36".
   - Regola vincolante: lunchDurationMinutes viene forzato a **30 minuti** (fill automatico del minimo).
   - Ore lavorate: (12:06 - 08:01) + (17:36 - 12:35) = 245 + 301 = 546 minuti. Ma con deduzione pausa o calcolo netto: se la pausa reale (29m) è forzata a 30m, la formula standard (eveningOut - morningIn - max(30, lunch)) dà: (17:36 - 08:01) = 575 min - 30 min = 545 min (9h 05m).
   - deltaMinutes = 545 - 480 = +65 minuti (+01:05).
   - Uscita prevista: appena morningIn è "08:01", calcola:
     - 8h: morningIn (08:01) + pausa (30m) + 8h = 16:31.
     - 7h: 16:31 - 1h = 15:31.
4. Giornata con pausa più lunga (es. 45 minuti):
   - lunchOut "12:00", lunchIn "12:45" -> lunchDurationMinutes = 45 min.
   - expectedExit8h si adatta: morningIn + 45m + 8h.
5. Permessi orari (`permissionMinutes`):
   - Aggiunti direttamente ai workedMinutes nel calcolo del delta e del monte ore giornaliero.
6. Giornata parziale:
   - Solo `morningIn` inserito: workedMinutes = 0 (o in corso), expectedExit8h e 7h calcolati con la pausa minima predefinita (30m).

## Deliverables
- `src/core/domain/timeCalculator.ts`
- `src/core/domain/timeCalculator.test.ts`
- Report in `.superpowers/sdd/2026-11-04-workorganizer-implementation/task-2-report.md`

## Verification
Eseguire: `npx vitest run src/core/domain/timeCalculator.test.ts`
Tutti i test devono passare con 100% successo.
