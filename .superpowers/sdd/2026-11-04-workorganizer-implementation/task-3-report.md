# Task 3 Report: Domain Engine - PolicyValidator & Calendario Mensile (TDD)

## Status: DONE

## Deliverables Created / Verified
- `src/core/domain/policyValidator.ts`:
  - `DayStatus`, `CalendarDayInfo`, `WeekValidationResult`, `MonthValidationResult` types and interfaces.
  - `getItalianHolidays(year: number)`: restituisce le 12 festività nazionali italiane (10 fisse + Pasqua e Pasquetta calcolate con algoritmo Meeus/Jones/Butcher) ordinate cronologicamente in formato "YYYY-MM-DD".
  - `isItalianHoliday(dateStr: string)`: verifica se una data è festività nazionale italiana.
  - `isWorkingDay(dateStr: string)`: verifica se una data è giorno lavorativo (Lunedì-Venerdì e non festivo nazionale).
  - `validateMonthPolicy(year, month, days, maxSmartPerMonth?, minPresencePerWeek?, maxSmartPerWeek?)`:
    - Target smart mensile: calcola `totalSmartDays` (smart svolti + smart pianificati), determina lo stato `'OK'` (se == 10), `'INCOMPLETO'` (se < 10), `'ERRORE'` (se > 10).
    - Raggruppamento settimanale ISO (Lunedì-Domenica) con conteggi di presenza, smart, ferie, chiusure.
    - Validazione vincoli settimanali: presenza minima obbligatoria (`presenceCount >= minPresencePerWeek`), limite massimo smart (`smartCount <= maxSmartPerWeek`).
    - Gestione ferie: le ferie non compensano la presenza se vengono svolte giornate smart.
    - Eccezione settimana tutta ferie/chiusure/festività: nessuna violazione se la settimana non ha ore lavorate (smart o presenze).
    - Settimane a cavallo di mese: valuta l'intera settimana Lunedì-Domenica considerando anche i giorni adiacenti passati in `days` evitando falsi allarmi, senza inquinare le metriche del mese corrente.
    - Quadratura giorni feriali del mese ed individuazione dei giorni non schedulati (`unscheduledDaysCount`).
    - Determinazione conformità globale `isMonthFullyCompliant`.
- `src/core/domain/policyValidator.test.ts`:
  - 28 test unitari esaustivi per festività fisse/mobili, feriali/festivi, target mensile smart, eccezioni ferie, regole settimanali, boundary weeks e conformità globale.

## TDD Cycle Evidence
1. **RED Phase**:
   - `src/core/domain/policyValidator.test.ts` scritto prima del modulo di dominio.
   - Esecuzione `npx vitest run src/core/domain/policyValidator.test.ts` fallita con errore `Failed to resolve import "./policyValidator"`.
2. **GREEN Phase**:
   - Implementazione di `src/core/domain/policyValidator.ts`.
   - Esecuzione `npx vitest run src/core/domain/policyValidator.test.ts`: 28 test su 28 passati.
3. **Full Regression Check & Build Verification**:
   - `npx vitest run`: 52 test su 52 passati su tutta la suite (timeCalculator, policyValidator, App).
   - `npx tsc`: 0 errori di compilazione TypeScript.
   - `npm run build`: bundle completato con successo.

## Git Rule Compliance
- Nessun comando git eseguito (rispetto assoluto del vincolo imposto dall'utente).
