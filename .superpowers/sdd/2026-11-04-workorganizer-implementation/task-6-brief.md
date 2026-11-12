# Task 6 Brief: Data Repository & State Synchronization Service

## Goal
Implementare lo strato dati unificato e il context globale dell'applicazione:
1. `src/services/repository/workDataService.ts`: servizio trasparente di lettura e persistenza dati (Supabase se autenticato/connesso + cache locale `localCache` di fallback e mirroring).
2. `src/context/WorkOrganizerContext.tsx`: provider React che coordina mese attivo, caricamento dati, mutazioni reattive, sincronizzazione automatica tra timbrature e stati del calendario e calcolo in tempo reale di policy, banca ore e buoni pasto.
3. Test unitari e di integrazione in `src/services/repository/workDataService.test.ts` e `src/context/WorkOrganizerContext.test.tsx`.

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Interfaces & Contracts

### 1. `src/services/repository/workDataService.ts`
```typescript
import { CalendarDayInfo, DayStatus } from '../../core/domain/policyValidator';
import { TimeEntryInput } from '../../core/domain/timeCalculator';
import { AppSettings } from '../storage/localCache';

export interface StoredTimeEntry extends TimeEntryInput {
  date: string;
  canteenUsed?: boolean;
}

export const workDataService = {
  loadMonthData(year: number, month: number, userId?: string | null): Promise<{
    days: Record<string, CalendarDayInfo>;
    timeEntries: Record<string, StoredTimeEntry>;
    settings: AppSettings;
  }>;

  saveDayStatus(date: string, status: DayStatus, notes?: string, userId?: string | null): Promise<CalendarDayInfo>;
  
  saveTimeEntry(date: string, entry: Partial<StoredTimeEntry>, userId?: string | null): Promise<{
    timeEntry: StoredTimeEntry;
    syncedDay?: CalendarDayInfo;
  }>;

  saveSettings(settings: Partial<AppSettings>, userId?: string | null): Promise<AppSettings>;
};
```

### 2. Sincronizzazione Automatica Timbrature -> Calendario
- Quando `saveTimeEntry` riceve `isSmartWork: true`:
  - Lo stato del giorno per quella data viene aggiornato/confermato come `status: 'smart'`, `isConfirmed: true`.
- Quando `saveTimeEntry` riceve timbrature orarie (`morningIn` o `eveningOut`) e `isSmartWork: false` (o undefined):
  - Lo stato del giorno viene aggiornato/confermato come `status: 'presenza'`, `isConfirmed: true`.

### 3. `src/context/WorkOrganizerContext.tsx`
Provider `WorkOrganizerProvider` e hook `useWorkOrganizer()`:
- Stato:
  - `currentYear: number`
  - `currentMonth: number` (1-12)
  - `setMonth: (year: number, month: number) => void`
  - `goToPrevMonth: () => void`
  - `goToNextMonth: () => void`
  - `goToToday: () => void`
  - `selectedDate: string` ("YYYY-MM-DD", default oggi o primo giorno del mese)
  - `setSelectedDate: (date: string) => void`
  - `days: Record<string, CalendarDayInfo>`
  - `timeEntries: Record<string, StoredTimeEntry>`
  - `settings: AppSettings`
  - `loading: boolean`
  - `updateDayStatus: (date: string, status: DayStatus, notes?: string) => Promise<void>`
  - `updateTimeEntry: (date: string, entry: Partial<StoredTimeEntry>) => Promise<void>`
  - `updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>`
- Valori derivati calcolati live:
  - `monthValidation: MonthValidationResult` (da `validateMonthPolicy`)
  - `quarterSummary: QuarterSummary` (da `calculateQuarterBalance`)
  - `mealVouchers: MealVoucherSummary` (da `calculateMealVouchers`)

## Verification
- `npx vitest run src/services/repository/workDataService.test.ts src/context/WorkOrganizerContext.test.tsx`
- `npx vitest run` (tutti i test verdi)
- `npx tsc` (zero errori)

## Deliverables
- `src/services/repository/workDataService.ts`
- `src/services/repository/workDataService.test.ts`
- `src/context/WorkOrganizerContext.tsx`
- `src/context/WorkOrganizerContext.test.tsx`
- Report in `.superpowers/sdd/2026-11-04-workorganizer-implementation/task-6-report.md`
