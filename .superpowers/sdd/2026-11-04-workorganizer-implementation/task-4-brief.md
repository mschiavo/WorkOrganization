# Task 4 Brief: Domain Engine - BancaOreManager & MealVouchersLedger (TDD)

## Goal
Implementare ed estendere i motori puri di dominio per la Banca Ore trimestrale (`src/core/domain/bancaOreManager.ts`) e per il bilancio economico dei Buoni Pasto (`src/core/domain/mealVouchersLedger.ts`), seguendo TDD con test in `src/core/domain/bancaOreManager.test.ts` e `src/core/domain/mealVouchersLedger.test.ts`.

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git init, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Interfaces & Contracts

### In `src/core/domain/bancaOreManager.ts`:
```typescript
export interface MonthDeltaInfo {
  month: number; // 1-12
  deltaMinutes: number;
}

export interface QuarterInfo {
  quarterId: string; // es. "2026-Q1"
  year: number;
  quarterNumber: number; // 1, 2, 3, 4
  startMonth: number; // es. 1 per Q1
  endMonth: number;   // es. 3 per Q1
}

export interface QuarterSummary {
  quarterId: string;
  year: number;
  quarterNumber: number;
  monthDeltas: MonthDeltaInfo[];
  totalDeltaMinutes: number;
  isMonth1Compliant: boolean; // Delta del primo mese del trimestre >= 0
  canCoverDeficit: boolean;   // true se totalDeltaMinutes >= 0 o se i deficit dei mesi 2/3 sono coperti
  warningReasons: string[];
}

export function getQuarterForMonth(year: number, month: number): QuarterInfo;
export function calculateQuarterBalance(
  year: number,
  quarterNumber: number,
  monthlyDeltas: MonthDeltaInfo[]
): QuarterSummary;
```

### In `src/core/domain/mealVouchersLedger.ts`:
```typescript
export interface MealVoucherSummary {
  canteenUsedCount: number;
  canteenCostPerUnit: number;        // Default 1.50
  totalCanteenExpense: number;       // canteenUsedCount * 1.50
  smartVoucherCount: number;
  smartVoucherValuePerUnit: number;   // Default 8.00
  totalSmartVouchersValue: number;   // smartVoucherCount * 8.00
  netBalance: number;                // totalSmartVouchersValue - totalCanteenExpense
}

export function calculateMealVouchers(
  canteenCount: number,
  smartCount: number,
  canteenCost?: number, // default 1.50
  smartValue?: number   // default 8.00
): MealVoucherSummary;
```

## Business Rules to Implement & Test
1. **Quarter Calculation & Mapping**:
   - Mesi 1, 2, 3 -> Q1 (Gen-Mar), fine trimestre 31 Marzo.
   - Mesi 4, 5, 6 -> Q2 (Apr-Giu), fine trimestre 30 Giugno.
   - Mesi 7, 8, 9 -> Q3 (Lug-Set), fine trimestre 30 Settembre.
   - Mesi 10, 11, 12 -> Q4 (Ott-Dic), fine trimestre 31 Dicembre.
2. **Regole Saldo Trimestrale**:
   - Banca ore azzerata a ogni cambio trimestre (nessun riporto da Q precedente di default).
   - Mese 1 del trimestre: delta deve essere $\ge 0$. Se $< 0$, warning: `"Il primo mese del trimestre ha un saldo negativo (< 0)"`.
   - Mese 2 e 3: possono essere negativi purché il cumulato progressivo del trimestre non scenda sotto 0. Se scende sotto 0, warning informativo su capienza.
3. **Meal Vouchers**:
   - Mensa in presenza usata: `canteenCount * 1.50` (spesa).
   - Buono smart maturate: `smartCount * 8.00` (ricavo / credito).
   - Bilancio netto: `totalSmartVouchersValue - totalCanteenExpense` (es. 10 smart a 8€ = 80€, 6 mense a 1.50€ = 9€ -> saldo netto = +71.00€).
   - Gestione decimali corretta a 2 cifre (`round to 2 decimals`).

## Deliverables
- `src/core/domain/bancaOreManager.ts`
- `src/core/domain/mealVouchersLedger.ts`
- `src/core/domain/bancaOreManager.test.ts`
- `src/core/domain/mealVouchersLedger.test.ts`
- Report in `.superpowers/sdd/2026-11-04-workorganizer-implementation/task-4-report.md`

## Verification
- `npx vitest run src/core/domain/bancaOreManager.test.ts src/core/domain/mealVouchersLedger.test.ts`
- Full suite pass: `npx vitest run`
- TypeScript check: `npx tsc`
