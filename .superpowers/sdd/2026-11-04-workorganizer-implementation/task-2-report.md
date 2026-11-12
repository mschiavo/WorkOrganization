# Task 2 Report: Domain Engine - TimeCalculator (TDD)

## Status: DONE

## Deliverables Created / Verified
- `src/core/domain/timeCalculator.ts`:
  - `hhMmToMinutes`: parsing rigoroso "HH:mm" in minuti da mezzanotte.
  - `minutesToHHmm`: formattazione "HH:mm" con gestione segno (+/-) e durate > 24h.
  - `calculateDailyTime`: logica per giornate smart (8h nominali, 0m pausa), presenza con pausa minima a 30m forzata se <30m, rispetto pause >30m, permessi orari sommati al monte ore, uscite previste 7h/8h immediate e delta giornaliero.
- `src/core/domain/timeCalculator.test.ts`:
  - 23 test unitari esaustivi che coprono tutti i requisiti di business e casi limite (midnight rollover, formati invalidi, uscite anticipate).

## Verification Evidence
- `npx vitest run src/core/domain/timeCalculator.test.ts`:
  - 23 test passati su 23 (100% pass rate).
- Total suite test: 24/24 passati.

## Git Rule Compliance
- Nessuna operazione git eseguita (rispetto assoluto del vincolo imposto dall'utente).
