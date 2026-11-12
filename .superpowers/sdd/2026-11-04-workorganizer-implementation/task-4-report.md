# Task 4 Report: Domain Engine - BancaOreManager & MealVouchersLedger (TDD)

## Status: DONE

## Deliverables Created / Verified
- `src/core/domain/bancaOreManager.ts`:
  - `getQuarterForMonth`: determinazione corretta del trimestre (Q1..Q4) e del range mesi (1-3, 4-6, 7-9, 10-12).
  - `calculateQuarterBalance`: calcolo del delta cumulativo trimestrale, verifica conformità mese 1 ($\ge 0$), tracciamento capacità copertura deficit per i mesi 2 e 3 e generazione warning descrittivi.
- `src/core/domain/mealVouchersLedger.ts`:
  - `calculateMealVouchers`: calcolo spesa mensa (default 1,50€ a buono), valore buoni smart maturate (default 8,00€ a buono), saldo netto con arrotondamento preciso a 2 decimali.
- `src/core/domain/bancaOreManager.test.ts`:
  - 14 test unitari per mappature trimestrali, azzeramento a cambio trimestre, verifiche mese 1 e deficit cumulativo.
- `src/core/domain/mealVouchersLedger.test.ts`:
  - 7 test unitari per combinazioni presenza/smart, tariffe personalizzate e precisione centesimale.

## Verification Evidence
- `npx vitest run src/core/domain/bancaOreManager.test.ts src/core/domain/mealVouchersLedger.test.ts`: 21 test passati.
- Full suite pass: 73/73 test passati (`npx vitest run`).
- TypeScript check (`npx tsc`): Clean (0 errori).

## Git Rule Compliance
- Nessuna operazione git eseguita (rispetto assoluto del vincolo imposto dall'utente).
