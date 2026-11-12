# Task 3 Brief: Domain Engine - PolicyValidator & Calendario Mensile (TDD)

## Goal
Implementare il motore di validazione policy e calendario mensile `src/core/domain/policyValidator.ts` seguendo TDD e verificato da `src/core/domain/policyValidator.test.ts`.

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git init, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Interfaces & Types
In `src/core/domain/policyValidator.ts`:
```typescript
export type DayStatus = 'presenza' | 'smart' | 'idea_smart' | 'ferie' | 'chiusura' | 'non_lavorativo';

export interface CalendarDayInfo {
  date: string; // Formato "YYYY-MM-DD"
  status: DayStatus;
  notes?: string;
  isConfirmed?: boolean;
}

export interface WeekValidationResult {
  weekNumber: number;
  startDate: string; // "YYYY-MM-DD" (Lunedì)
  endDate: string;   // "YYYY-MM-DD" (Domenica)
  presenceCount: number;
  smartCount: number; // smart + idea_smart
  ferieCount: number;
  closureCount: number;
  isCompliant: boolean;
  errorReason?: string;
}

export interface MonthValidationResult {
  year: number;
  month: number; // 1-12
  workingDaysCount: number;     // Feriali Lun-Ven esclusi festivi nazionali
  presenceDays: number;
  smartDoneDays: number;       // status === 'smart'
  smartPlannedDays: number;    // status === 'idea_smart'
  totalSmartDays: number;      // smartDoneDays + smartPlannedDays
  ferieDays: number;
  closureDays: number;
  unscheduledDaysCount: number; // Lavorativi feriali senza causale o non impostati
  smartStatus: 'OK' | 'INCOMPLETO' | 'ERRORE';
  weeks: WeekValidationResult[];
  isMonthFullyCompliant: boolean;
}

export function isItalianHoliday(dateStr: string): boolean;
export function getItalianHolidays(year: number): string[];
export function isWorkingDay(dateStr: string): boolean;

export function validateMonthPolicy(
  year: number,
  month: number,
  days: CalendarDayInfo[],
  maxSmartPerMonth?: number,   // default 10
  minPresencePerWeek?: number, // default 1
  maxSmartPerWeek?: number     // default 4
): MonthValidationResult;
```

## Business Rules to Implement & Test
1. **Target Smart Mensile**:
   - `totalSmartDays = smartDoneDays + smartPlannedDays`.
   - Se `totalSmartDays === 10` -> `smartStatus: 'OK'`.
   - Se `totalSmartDays < 10` -> `smartStatus: 'INCOMPLETO'`.
   - Se `totalSmartDays > 10` -> `smartStatus: 'ERRORE'`.
2. **Regola Settimanale (Lunedì-Domenica)**:
   - `presenceCount >= minPresencePerWeek` (default 1).
   - `smartCount <= maxSmartPerWeek` (default 4).
   - Le ferie non compensano la presenza (`presenceCount` deve essere >= 1 se ci sono giorni lavorativi o smart lavorati nella settimana).
   - **Eccezione settimana tutta ferie/chiusure**: se una settimana lavorativa (Lun-Ven) non ha giornate di smart né presenze (es. interamente coperta da ferie, chiusure o festività), non genera errore di mancata presenza.
   - **Settimana a cavallo di mese**: valuta l'intera settimana Lunedì-Domenica considerando anche i giorni adiacenti del mese precedente o successivo passati in `days`, per evitare falsi allarmi.
3. **Festività Italiane**:
   - Fisse: 01-01, 01-06, 04-25, 05-01, 06-02, 08-15, 11-01, 12-08, 12-25, 12-26.
   - Mobili: Pasqua e Lunedì dell'Angelo (Pasquetta) calcolati con l'algoritmo di Gauss/Meeus per qualsiasi anno.
4. **Giorni Lavorativi & Quadratura**:
   - `isWorkingDay`: Lunedì-Venerdì e non festivo nazionale.
   - `unscheduledDaysCount`: numero di giorni lavorativi del mese corrente che non hanno un record in `days` o il cui stato è vuoto o non lavorativo improprio su un feriale.
5. **Esito Globale (`isMonthFullyCompliant`)**:
   - `true` se e solo se `smartStatus === 'OK'`, tutte le settimane del mese sono `isCompliant === true` e `unscheduledDaysCount === 0`.

## Deliverables
- `src/core/domain/policyValidator.ts`
- `src/core/domain/policyValidator.test.ts`
- Report in `.superpowers/sdd/2026-11-04-workorganizer-implementation/task-3-report.md`

## Verification
- `npx vitest run src/core/domain/policyValidator.test.ts`
- Full suite pass: `npx vitest run`
