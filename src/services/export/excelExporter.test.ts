import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { generateMonthExcelWorkbook } from './excelExporter';
import { DEFAULT_SETTINGS } from '../storage/localCache';

describe('excelExporter', () => {
  it('generates a valid XLSX workbook with correct headers, 31 day rows, and totals row for October 2026', () => {
    const sampleDays = {
      '2026-10-01': {
        date: '2026-10-01',
        status: 'presenza' as const,
        notes: 'In sede',
        isConfirmed: true,
      },
      '2026-10-02': {
        date: '2026-10-02',
        status: 'smart' as const,
        isConfirmed: true,
      },
    };

    const sampleEntries = {
      '2026-10-01': {
        date: '2026-10-01',
        morningIn: '08:30',
        lunchOut: '13:00',
        lunchIn: '13:30', // 30m lunch
        eveningOut: '17:00', // 8h worked
        canteenUsed: true,
      },
    };

    const wb = generateMonthExcelWorkbook(2026, 10, sampleDays, sampleEntries, DEFAULT_SETTINGS);

    expect(wb).toBeDefined();
    expect(wb.SheetNames.length).toBe(1);
    expect(wb.SheetNames[0]).toBe('Timbrature_2026_10');

    const ws = wb.Sheets[wb.SheetNames[0]];
    const jsonAoa = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

    // Header row + 31 day rows + 1 total row = 33 rows
    expect(jsonAoa.length).toBe(33);

    // Header check
    expect(jsonAoa[0][0]).toBe('Data');
    expect(jsonAoa[0][2]).toBe('Causale');
    expect(jsonAoa[0][9]).toBe('Ore Lavorate');

    // Row 1 (2026-10-01): presence with 8h worked
    const row1 = jsonAoa[1];
    expect(row1[0]).toBe('2026-10-01');
    expect(row1[2]).toBe('Presenza');
    expect(row1[3]).toBe('08:30');
    expect(row1[6]).toBe('00:30'); // lunch
    expect(row1[7]).toBe('17:00'); // eveningOut
    expect(row1[9]).toBe('08:00'); // worked

    // Row 2 (2026-10-02): smart working row
    const row2 = jsonAoa[2];
    expect(row2[0]).toBe('2026-10-02');
    expect(row2[2]).toBe('Smart Working');
    expect(row2[9]).toBe('08:00');
    expect(row2[12]).toBe('+00:00');

    // Totals row check
    const totalRow = jsonAoa[32];
    expect(totalRow[0]).toBe('TOTALI');
    expect(totalRow[9]).toBe('16:00'); // 8h + 8h = 16h total worked
  });
});
