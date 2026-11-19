import { CalendarDayInfo, DayStatus } from '../../core/domain/policyValidator';
import { StoredTimeEntry } from '../repository/workDataService';
import { DEFAULT_SETTINGS } from '../storage/localCache';
import { BackupPayload } from './backupService';
import { parseFlexibleDuration, formatFlexibleDuration } from '../../core/domain/durationParser';

function normalizeDateStr(raw: string): string | null {
  const str = raw.trim();
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  // DD/MM/YYYY
  const itMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (itMatch) {
    const d = itMatch[1].padStart(2, '0');
    const m = itMatch[2].padStart(2, '0');
    const y = itMatch[3];
    return `${y}-${m}-${d}`;
  }
  return null;
}

function normalizeTimeStr(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const str = raw.trim();
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return undefined;
}

/**
 * Parses CSV content with columns:
 * Data;Stato;Entrata1;Uscita1;Entrata2;Uscita2;Permesso;Mensa;Note
 * Supports both ';' and ',' as column delimiters.
 */
export function parseCsvToBackupPayload(csvContent: string): BackupPayload {
  const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) {
    throw new Error('Il file CSV è vuoto.');
  }

  // Detect delimiter: semicolon ';' or comma ','
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';

  const days: Record<string, CalendarDayInfo> = {};
  const timeEntries: Record<string, StoredTimeEntry> = {};

  // Check if line 0 is a header row
  const hasHeader = /data|giorno|date/i.test(firstLine);
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (const line of dataLines) {
    if (!line.trim()) continue;
    const parts = line.split(delimiter).map((p) => p.trim());
    const rawDate = parts[0];
    const dateStr = normalizeDateStr(rawDate);
    if (!dateStr) continue;

    const rawStatus = (parts[1] || '').toLowerCase() as DayStatus | '';
    const in1 = normalizeTimeStr(parts[2]);
    const out1 = normalizeTimeStr(parts[3]);
    const in2 = normalizeTimeStr(parts[4]);
    const out2 = normalizeTimeStr(parts[5]);
    const rawPerm = parts[6] || '';
    const permMinutes = rawPerm ? parseFlexibleDuration(rawPerm) : 0;
    const rawMensa = (parts[7] || '').toLowerCase();
    const canteenUsed = ['si', 'sì', 'yes', 'true', '1'].includes(rawMensa);
    const note = parts[8] || undefined;

    let effectiveStatus: DayStatus = 'presenza';
    let isSmartWork = false;

    if (rawStatus) {
      effectiveStatus = rawStatus;
      if (rawStatus === 'smart') isSmartWork = true;
    } else if (in1 || out2) {
      effectiveStatus = 'presenza';
    } else {
      effectiveStatus = 'non_lavorativo';
    }

    days[dateStr] = {
      date: dateStr,
      status: effectiveStatus,
      isConfirmed: effectiveStatus !== 'non_lavorativo',
      notes: note,
    };

    if (effectiveStatus === 'smart' || in1 || out1 || in2 || out2 || permMinutes > 0 || canteenUsed) {
      timeEntries[dateStr] = {
        date: dateStr,
        morningIn: in1,
        lunchOut: out1,
        lunchIn: in2,
        eveningOut: out2,
        permissionMinutes: permMinutes > 0 ? permMinutes : undefined,
        canteenUsed,
        isSmartWork: isSmartWork || effectiveStatus === 'smart',
      };
    }
  }

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings: { ...DEFAULT_SETTINGS },
    days,
    timeEntries,
  };
}

/**
 * Converts a BackupPayload into an easily human-editable CSV string (semicolon separated).
 */
export function convertBackupPayloadToCsv(payload: BackupPayload): string {
  const header = 'Data;Stato;Entrata1;Uscita1;Entrata2;Uscita2;Permesso;Mensa;Note';
  const allDates = Array.from(new Set([...Object.keys(payload.days), ...Object.keys(payload.timeEntries)])).sort();

  const rows = allDates.map((dateStr) => {
    const day = payload.days[dateStr];
    const entry = payload.timeEntries[dateStr];

    const status = day?.status || (entry?.isSmartWork ? 'smart' : (entry?.morningIn ? 'presenza' : ''));
    const in1 = entry?.morningIn || '';
    const out1 = entry?.lunchOut || '';
    const in2 = entry?.lunchIn || '';
    const out2 = entry?.eveningOut || '';
    const perm = entry?.permissionMinutes ? formatFlexibleDuration(entry.permissionMinutes) : '';
    const mensa = entry?.canteenUsed ? 'Si' : (entry && entry.canteenUsed === false ? 'No' : '');
    const note = day?.notes || '';

    return `${dateStr};${status};${in1};${out1};${in2};${out2};${perm};${mensa};${note}`;
  });

  return [header, ...rows].join('\n');
}
