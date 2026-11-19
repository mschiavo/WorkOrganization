import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import XLSX from 'xlsx';
import { convertWorkbookToBackupPayload } from './excelImporter';
import { parseAndValidateBackup } from './backupService';

describe('excelImporter Service', () => {
  it('correctly converts Timbrature_2026.xlsx into a valid BackupPayload', () => {
    const excelPath = path.resolve(__dirname, '../../../docs/esempi/Timbrature_2026.xlsx');
    expect(fs.existsSync(excelPath)).toBe(true);

    const wb = XLSX.readFile(excelPath);
    const { payload, stats } = convertWorkbookToBackupPayload(wb);

    expect(stats.monthsProcessed).toBe(10);
    expect(stats.totalDays).toBe(304);
    expect(stats.smart).toBe(100);
    expect(stats.presenze).toBe(91);
    expect(stats.ferie).toBe(22);
    expect(stats.canteenMeals).toBe(56);

    // Validate that payload satisfies parseAndValidateBackup
    const jsonString = JSON.stringify(payload);
    const validated = parseAndValidateBackup(jsonString);

    expect(validated.version).toBe('1.0.0');
    expect(Object.keys(validated.days).length).toBe(304);

    // Verify sample presence day (1 Oct 2026)
    const oct1 = validated.days['2026-10-01'];
    expect(oct1?.status).toBe('presenza');
    expect(oct1?.isConfirmed).toBe(true);

    const oct1Entry = validated.timeEntries['2026-10-01'];
    expect(oct1Entry?.morningIn).toBe('08:01');
    expect(oct1Entry?.lunchOut).toBe('12:06');
    expect(oct1Entry?.lunchIn).toBe('12:35');
    expect(oct1Entry?.eveningOut).toBe('17:36');
    expect(oct1Entry?.canteenUsed).toBe(true);

    // Verify sample smart working day (5 Oct 2026)
    const oct5 = validated.days['2026-10-05'];
    expect(oct5?.status).toBe('smart');
    expect(validated.timeEntries['2026-10-05']?.isSmartWork).toBe(true);

    // Verify sample ferie day (12 Oct 2026)
    const oct12 = validated.days['2026-10-12'];
    expect(oct12?.status).toBe('ferie');
  });
});
