# Task 11 Report: Settings Page, Parameter Tuning & Backup/Export Engine

## Status: DONE

## Deliverables Created / Verified
- `src/services/export/backupService.ts`:
  - `createBackupJson`: esporta snapshot completo (versione, timestamp, impostazioni, giorni calendario, timbrature).
  - `parseAndValidateBackup`: valida schema, tipi, campi essenziali e recupera fallback con impostazioni predefinite.
- `src/services/export/excelExporter.ts`:
  - `generateMonthExcelWorkbook`: genera un foglio Excel `.xlsx` fedele a `Timbrature_2026.xlsx` tramite la libreria `xlsx` (SheetJS).
  - Calcola pause pranzo, ore lavorate, uscite 7h/8h, delta giornalieri, mensa e riga di totale finale del mese.
  - `downloadMonthExcel`: innesca il download del file `.xlsx` nel browser.
- `src/features/settings/SettingsModal.tsx`:
  - Modale responsive per l'accordatura dei parametri aziendali:
    - Target smart mensile (default 10)
    - Presenze minime settimanali (default 1)
    - Massimo smart settimanale (default 4)
    - Minuti minimi pausa pranzo (default 30)
    - Costo mensa (default 1,50€) e valore buono smart (default 8,00€)
    - Connessione Supabase (URL e Anon Key)
  - Pulsanti operativi per esportazione Excel (.xlsx), download backup JSON, ripristino backup JSON da file e reset ai valori predefiniti.
- `src/features/settings/Settings.module.css`:
  - CSS modulare per il modale impostazioni coerente con il design system.
- `src/services/export/backupService.test.ts`, `src/services/export/excelExporter.test.ts`, `src/features/settings/SettingsModal.test.tsx`:
  - 9 test unitari passati al 100%.

## Verification Evidence
- `npx vitest run`: 163/163 test passati su 17 file di test.
- `npx tsc`: 0 errori di compilazione TypeScript (strict mode).
- `npm run build`: bundle di produzione completato con successo.

## Git Rule Compliance
- Nessuna operazione git eseguita (rispetto assoluto del vincolo imposto dall'utente).
