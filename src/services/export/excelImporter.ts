import XLSX from 'xlsx';
import { CalendarDayInfo } from '../../core/domain/policyValidator';
import { StoredTimeEntry } from '../repository/workDataService';
import { DEFAULT_SETTINGS } from '../storage/localCache';
import { BackupPayload } from './backupService';

const MONTH_NAMES: Record<string, number> = {
  gennaio: 1,
  febbraio: 2,
  marzo: 3,
  aprile: 4,
  maggio: 5,
  giugno: 6,
  luglio: 7,
  agosto: 8,
  settembre: 9,
  ottobre: 10,
  novembre: 11,
  dicembre: 12,
};

function formatTimeHHmm(val: any): string | undefined {
  if (!val) return undefined;
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return undefined;
}

function parsePermissionMinutes(note: any): number {
  if (!note) return 0;
  const match = String(note).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return 0;
}

export interface ExcelImportStats {
  monthsProcessed: number;
  totalDays: number;
  presenze: number;
  smart: number;
  ferie: number;
  par: number;
  nonLavorativi: number;
  canteenMeals: number;
  permissionsCount: number;
}

/**
 * Parses an Excel file with monthly sheets (e.g. Timbrature_2026.xlsx)
 * and produces a validated WorkOrganizer BackupPayload ready for import.
 */
export function convertWorkbookToBackupPayload(wb: XLSX.WorkBook): { payload: BackupPayload; stats: ExcelImportStats } {
  const days: Record<string, CalendarDayInfo> = {};
  const timeEntries: Record<string, StoredTimeEntry> = {};

  const stats: ExcelImportStats = {
    monthsProcessed: 0,
    totalDays: 0,
    presenze: 0,
    smart: 0,
    ferie: 0,
    par: 0,
    nonLavorativi: 0,
    canteenMeals: 0,
    permissionsCount: 0,
  };

  for (const sheetName of wb.SheetNames) {
    const parts = sheetName.trim().toLowerCase().split(/\s+/);
    const mName = parts[0];
    const mNum = MONTH_NAMES[mName];
    const year = parseInt(parts[1], 10) || 2026;
    if (!mNum) continue;

    stats.monthsProcessed++;
    const ws = wb.Sheets[sheetName];
    // Limit range to max 35 rows and 25 columns to avoid scanning 1,000,000+ empty trailing rows in Excel
    const rows = XLSX.utils.sheet_to_json<any[]>(ws, {
      header: 1,
      raw: false,
      range: { s: { r: 0, c: 0 }, e: { r: 35, c: 25 } },
    });
    const r1 = rows[1] || [];

    // Locate Buono Pasto column dynamically
    let bpCol = 13;
    for (let c = 0; c < r1.length; c++) {
      const headerText = String(r1[c] || '').toLowerCase();
      if (headerText.includes('buono') && headerText.includes('pasto')) {
        bpCol = c;
        break;
      }
    }

    const daysInMonth = new Date(year, mNum, 0).getDate();
    const paddedMonth = String(mNum).padStart(2, '0');

    for (let d = 1; d <= daysInMonth; d++) {
      const rowIdx = d + 2; // Row 3 is day 1
      const row = rows[rowIdx] || [];
      const paddedDay = String(d).padStart(2, '0');
      const dateStr = `${year}-${paddedMonth}-${paddedDay}`;

      const in1 = formatTimeHHmm(row[2]);
      const out1 = formatTimeHHmm(row[3]);
      const in2 = formatTimeHHmm(row[4]);
      const out2 = formatTimeHHmm(row[5]);
      const rawNote = row[6] ? String(row[6]).trim() : '';
      const permMin = parsePermissionMinutes(rawNote);
      const bpVal = String(row[bpCol] || '').trim().toLowerCase();

      stats.totalDays++;

      if (bpVal === 'smart') {
        stats.smart++;
        days[dateStr] = {
          date: dateStr,
          status: 'smart',
          isConfirmed: true,
          notes: rawNote && !permMin ? rawNote : undefined,
        };
        timeEntries[dateStr] = {
          date: dateStr,
          isSmartWork: true,
          permissionMinutes: permMin || undefined,
        };
        if (permMin > 0) stats.permissionsCount++;
      } else if (bpVal === 'ferie') {
        stats.ferie++;
        days[dateStr] = {
          date: dateStr,
          status: 'ferie',
          isConfirmed: true,
          notes: rawNote || undefined,
        };
      } else if (bpVal === 'par') {
        stats.par++;
        days[dateStr] = {
          date: dateStr,
          status: 'par',
          isConfirmed: true,
          notes: rawNote || undefined,
        };
      } else if (in1 && out2) {
        stats.presenze++;
        const isCanteen = bpVal === 'si';
        if (isCanteen) stats.canteenMeals++;

        days[dateStr] = {
          date: dateStr,
          status: 'presenza',
          isConfirmed: true,
          notes: rawNote && !permMin ? rawNote : undefined,
        };
        timeEntries[dateStr] = {
          date: dateStr,
          morningIn: in1,
          lunchOut: out1,
          lunchIn: in2,
          eveningOut: out2,
          canteenUsed: isCanteen,
          isSmartWork: false,
          permissionMinutes: permMin || undefined,
        };
        if (permMin > 0) stats.permissionsCount++;
      } else {
        stats.nonLavorativi++;
        days[dateStr] = {
          date: dateStr,
          status: 'non_lavorativo',
          notes: rawNote || undefined,
        };
      }
    }
  }

  const payload: BackupPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings: {
      ...DEFAULT_SETTINGS,
    },
    days,
    timeEntries,
  };

  return { payload, stats };
}
