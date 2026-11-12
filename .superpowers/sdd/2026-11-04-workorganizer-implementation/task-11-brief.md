# Task 11 Brief: Settings Page, Parameter Tuning & Backup/Export Engine

## Goal
Implementare il modulo completo di configurazione, accordatura dei parametri aziendali, esportazione Excel (.xlsx) e backup/ripristino JSON:
1. `src/services/export/excelExporter.ts`: generatore di fogli di calcolo Excel (`.xlsx`) compatibile con la struttura di `Timbrature_2026.xlsx` tramite la libreria `xlsx`.
2. `src/services/export/backupService.ts`: serializzazione, validazione e ripristino di backup completi in formato JSON.
3. `src/features/settings/SettingsModal.tsx`: modale impostazioni con sezioni per Policy/Orari, Buoni Pasto, Configurazione Supabase e Azioni di Backup/Export.
4. `src/features/settings/Settings.module.css`: stili CSS modulari per il pannello impostazioni.
5. Test: `src/services/export/excelExporter.test.ts`, `src/services/export/backupService.test.ts`, `src/features/settings/SettingsModal.test.tsx`.

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Interfaces & Contracts

### 1. `src/services/export/backupService.ts`
```typescript
import { AppSettings } from '../storage/localCache';
import { CalendarDayInfo } from '../../core/domain/policyValidator';
import { StoredTimeEntry } from '../repository/workDataService';

export interface BackupPayload {
  version: string;
  exportedAt: string;
  settings: AppSettings;
  days: Record<string, CalendarDayInfo>;
  timeEntries: Record<string, StoredTimeEntry>;
}

export function createBackupJson(
  settings: AppSettings,
  days: Record<string, CalendarDayInfo>,
  timeEntries: Record<string, StoredTimeEntry>
): string;

export function parseAndValidateBackup(jsonStr: string): BackupPayload;
```

### 2. `src/services/export/excelExporter.ts`
```typescript
import { CalendarDayInfo } from '../../core/domain/policyValidator';
import { StoredTimeEntry } from '../repository/workDataService';
import { AppSettings } from '../storage/localCache';

export function generateMonthExcelWorkbook(
  year: number,
  month: number,
  days: Record<string, CalendarDayInfo>,
  timeEntries: Record<string, StoredTimeEntry>,
  settings: AppSettings
): any; // XLSX.WorkBook

export function downloadMonthExcel(
  year: number,
  month: number,
  days: Record<string, CalendarDayInfo>,
  timeEntries: Record<string, StoredTimeEntry>,
  settings: AppSettings
): void;
```

### 3. `src/features/settings/SettingsModal.tsx`
Props:
```typescript
export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```
Controlli UI:
- Input `maxSmartDaysMonth` (`data-testid="setting-max-smart"`)
- Input `minPresenceDaysWeek` (`data-testid="setting-min-presence"`)
- Input `maxSmartDaysWeek` (`data-testid="setting-max-smart-week"`)
- Input `minLunchBreakMinutes` (`data-testid="setting-min-lunch"`)
- Input `canteenVoucherCost` (`data-testid="setting-canteen-cost"`)
- Input `smartVoucherValue` (`data-testid="setting-smart-value"`)
- Input Supabase URL e Anon Key (`data-testid="setting-supabase-url"`, `data-testid="setting-supabase-key"`)
- Bottoni:
  - `data-testid="btn-save-settings"`
  - `data-testid="btn-reset-defaults"`
  - `data-testid="btn-export-excel"`
  - `data-testid="btn-export-json"`
  - `data-testid="btn-import-json"` / input file `data-testid="input-import-file"`

## Deliverables
- `src/services/export/backupService.ts`
- `src/services/export/backupService.test.ts`
- `src/services/export/excelExporter.ts`
- `src/services/export/excelExporter.test.ts`
- `src/features/settings/SettingsModal.tsx`
- `src/features/settings/Settings.module.css`
- `src/features/settings/SettingsModal.test.tsx`
- Report in `.superpowers/sdd/2026-11-04-workorganizer-implementation/task-11-report.md`

## Verification
- `npx vitest run src/services/export/backupService.test.ts src/services/export/excelExporter.test.ts src/features/settings/SettingsModal.test.tsx`
- `npx vitest run` (tutti i test verdi)
- `npx tsc` (zero errori)
