import type * as XLSXTypes from 'xlsx';
import { CalendarDayInfo, DayStatus } from '../../core/domain/policyValidator';
import { StoredTimeEntry } from '../repository/workDataService';
import { AppSettings } from '../storage/localCache';
import { calculateDailyTime, minutesToHHmm } from '../../core/domain/timeCalculator';

const ITALIAN_WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

const STATUS_LABELS: Record<DayStatus, string> = {
  presenza: 'Presenza',
  smart: 'Smart Working',
  idea_smart: 'Idea Smart',
  ferie: 'Ferie',
  idea_ferie: 'Idea Ferie',
  par: 'PAR',
  idea_par: 'Idea PAR',
  chiusura: 'Chiusura',
  non_lavorativo: 'Non Lavorativo',
};

let cachedXlsx: typeof XLSXTypes | null = null;

export async function getXlsxModule(): Promise<typeof XLSXTypes> {
  if (cachedXlsx) return cachedXlsx;
  try {
    cachedXlsx = await import('xlsx');
    return cachedXlsx;
  } catch (err: any) {
    console.error('Failed to dynamically import xlsx module:', err);
    throw new Error('Impossibile caricare il modulo di esportazione Excel.');
  }
}

export function generateMonthExcelWorkbook(
  year: number,
  month: number,
  days: Record<string, CalendarDayInfo>,
  timeEntries: Record<string, StoredTimeEntry>,
  settings: AppSettings,
  XLSX: typeof XLSXTypes
): XLSXTypes.WorkBook {
  const daysInMonth = new Date(year, month, 0).getDate();
  const paddedMonth = String(month).padStart(2, '0');

  const headers = [
    'Data',
    'Giorno',
    'Causale',
    'Entrata',
    'Uscita Pranzo',
    'Rientro Pranzo',
    'Pausa Pranzo',
    'Uscita Sera',
    'Permessi (min)',
    'Ore Lavorate',
    'Uscita Prev. 7h',
    'Uscita Prev. 8h',
    'Delta Banca Ore',
    'Buono Mensa',
    'Note',
  ];

  const rows: (string | number)[][] = [headers];

  let totalWorkedMinutes = 0;
  let totalDeltaMinutes = 0;
  let totalMensaCount = 0;

  for (let d = 1; d <= daysInMonth; d++) {
    const paddedDay = String(d).padStart(2, '0');
    const dateStr = `${year}-${paddedMonth}-${paddedDay}`;
    const dateObj = new Date(year, month - 1, d);
    const weekdayName = ITALIAN_WEEKDAYS[dateObj.getDay()] || '';

    const dayRecord = days[dateStr];
    const timeRecord = timeEntries[dateStr];
    const status = dayRecord?.status;
    const statusLabel = status ? STATUS_LABELS[status] || status : '';

    const isSmart = status === 'smart' || timeRecord?.isSmartWork;

    let morningIn = timeRecord?.morningIn || '';
    let lunchOut = timeRecord?.lunchOut || '';
    let lunchIn = timeRecord?.lunchIn || '';
    let eveningOut = timeRecord?.eveningOut || '';
    let permissionMin = timeRecord?.permissionMinutes || 0;
    let canteen = timeRecord?.canteenUsed ? 'Sì' : 'No';
    let notes = dayRecord?.notes || '';

    let lunchDurationStr = '';
    let workedHoursStr = '';
    let exit7h = '';
    let exit8h = '';
    let deltaStr = '';

    if (isSmart) {
      workedHoursStr = '08:00';
      deltaStr = '+00:00';
      totalWorkedMinutes += 480;
    } else if (timeRecord) {
      const calc = calculateDailyTime(timeRecord, settings.minLunchBreakMinutes);
      if (calc.lunchDurationMinutes > 0) {
        lunchDurationStr = minutesToHHmm(calc.lunchDurationMinutes);
      }
      if (calc.workedMinutes > 0) {
        workedHoursStr = minutesToHHmm(calc.workedMinutes);
        totalWorkedMinutes += calc.workedMinutes;
      }
      if (calc.expectedExit7h) exit7h = calc.expectedExit7h;
      if (calc.expectedExit8h) exit8h = calc.expectedExit8h;

      if (timeRecord.morningIn && timeRecord.eveningOut) {
        deltaStr = minutesToHHmm(calc.deltaMinutes, true);
        totalDeltaMinutes += calc.deltaMinutes;
      }
    }

    if (timeRecord?.canteenUsed) {
      totalMensaCount += 1;
    }

    rows.push([
      dateStr,
      weekdayName,
      statusLabel,
      morningIn,
      lunchOut,
      lunchIn,
      lunchDurationStr,
      eveningOut,
      permissionMin > 0 ? permissionMin : '',
      workedHoursStr,
      exit7h,
      exit8h,
      deltaStr,
      canteen,
      notes,
    ]);
  }

  // Totals Row
  const totalWorkedStr = minutesToHHmm(totalWorkedMinutes);
  const totalDeltaStr = minutesToHHmm(totalDeltaMinutes, true);

  const totalsRow: (string | number)[] = [
    'TOTALI',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    totalWorkedStr,
    '',
    '',
    totalDeltaStr,
    `Mense: ${totalMensaCount}`,
    '',
  ];
  rows.push(totalsRow);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  // Column widths definition for readability
  worksheet['!cols'] = [
    { wch: 12 }, // Data
    { wch: 8 },  // Giorno
    { wch: 15 }, // Causale
    { wch: 10 }, // Entrata
    { wch: 14 }, // Uscita Pranzo
    { wch: 14 }, // Rientro Pranzo
    { wch: 14 }, // Pausa Pranzo
    { wch: 12 }, // Uscita Sera
    { wch: 14 }, // Permessi
    { wch: 14 }, // Ore Lavorate
    { wch: 14 }, // Uscita 7h
    { wch: 14 }, // Uscita 8h
    { wch: 15 }, // Delta
    { wch: 12 }, // Buono Mensa
    { wch: 25 }, // Note
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = `Timbrature_${year}_${paddedMonth}`;
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return workbook;
}

export async function downloadMonthExcel(
  year: number,
  month: number,
  days: Record<string, CalendarDayInfo>,
  timeEntries: Record<string, StoredTimeEntry>,
  settings: AppSettings
): Promise<void> {
  try {
    const XLSX = await getXlsxModule();
    const workbook = generateMonthExcelWorkbook(year, month, days, timeEntries, settings, XLSX);
    const paddedMonth = String(month).padStart(2, '0');
    const filename = `Timbrature_${year}_${paddedMonth}.xlsx`;
    XLSX.writeFile(workbook, filename);
  } catch (err: any) {
    alert(err?.message || 'Impossibile esportare il file Excel.');
  }
}
