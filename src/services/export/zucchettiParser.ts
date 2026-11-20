import { CalendarDayInfo, DayStatus } from '../../core/domain/policyValidator';
import { StoredTimeEntry } from '../repository/workDataService';
import { DEFAULT_SETTINGS } from '../storage/localCache';
import { BackupPayload } from './backupService';
import { parseFlexibleDuration } from '../../core/domain/durationParser';

function normalizeZucchettiDate(raw: string, defaultYear: number = new Date().getFullYear()): string | null {
  if (!raw) return null;
  const str = raw.trim();

  // YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return str;

  // DD/MM/YYYY
  const itFullMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (itFullMatch) {
    const d = itFullMatch[1].padStart(2, '0');
    const m = itFullMatch[2].padStart(2, '0');
    const y = itFullMatch[3];
    return `${y}-${m}-${d}`;
  }

  // DD/MM/YY
  const itShortYearMatch = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})\b/);
  if (itShortYearMatch) {
    const d = itShortYearMatch[1].padStart(2, '0');
    const m = itShortYearMatch[2].padStart(2, '0');
    const y = '20' + itShortYearMatch[3];
    return `${y}-${m}-${d}`;
  }

  // DD/MM
  const itMonthMatch = str.match(/(\d{1,2})\/(\d{1,2})\b/);
  if (itMonthMatch) {
    const d = itMonthMatch[1].padStart(2, '0');
    const m = itMonthMatch[2].padStart(2, '0');
    return `${defaultYear}-${m}-${d}`;
  }

  return null;
}

function normalizeZucchettiTime(raw: string | undefined | null): string | undefined {
  if (!raw) return undefined;
  const str = String(raw).trim();
  // HH:mm or H:mm
  const colonMatch = str.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    return `${colonMatch[1].padStart(2, '0')}:${colonMatch[2]}`;
  }
  // HH.mm
  const dotMatch = str.match(/^(\d{1,2})\.(\d{2})$/);
  if (dotMatch) {
    return `${dotMatch[1].padStart(2, '0')}:${dotMatch[2]}`;
  }
  return undefined;
}

/**
 * Extracts and maps rows from Zucchetti cartellino data into a WorkOrganizer BackupPayload.
 */
export function parseZucchettiTableRows(rows: string[][], defaultYear: number = new Date().getFullYear()): BackupPayload {
  const days: Record<string, CalendarDayInfo> = {};
  const timeEntries: Record<string, StoredTimeEntry> = {};

  for (const row of rows) {
    if (!row || row.length === 0) continue;

    // Detect which cell contains the date
    let dateStr: string | null = null;
    let dateColIdx = -1;
    for (let c = 0; c < row.length; c++) {
      const parsed = normalizeZucchettiDate(row[c], defaultYear);
      if (parsed) {
        dateStr = parsed;
        dateColIdx = c;
        break;
      }
    }

    if (!dateStr) continue;

    // Extract all times and descriptive cells from the row
    const times: string[] = [];
    const nonTimeCells: string[] = [];

    for (let c = 0; c < row.length; c++) {
      if (c === dateColIdx) continue;
      const normalizedTime = normalizeZucchettiTime(row[c]);
      if (normalizedTime) {
        times.push(normalizedTime);
      } else if (row[c] && row[c].trim()) {
        nonTimeCells.push(row[c].trim());
      }
    }

    const in1 = times[0];
    const out1 = times[1];
    const in2 = times[2];
    const out2 = times[3];

    const actualOut1 = times.length >= 4 ? out1 : undefined;
    const actualIn2 = times.length >= 4 ? in2 : undefined;
    const actualOut2 = times.length >= 4 ? out2 : (times.length === 2 ? out1 : undefined);

    const combinedText = nonTimeCells.join(' ').toLowerCase();

    let status: DayStatus = 'presenza';
    let isSmart = false;
    let permMin = 0;
    let canteenUsed = false;

    // Check canteen (Mensa)
    for (const cell of nonTimeCells) {
      const lower = cell.toLowerCase().trim();
      if (['si', 'sì', 'yes', 's', '1', 'mensa'].includes(lower)) {
        canteenUsed = true;
      }
    }

    // Check status & causali
    if (combinedText.includes('smart') || combinedText.includes('agile') || combinedText.includes('telelavoro') || combinedText === 'sw') {
      status = 'smart';
      isSmart = true;
    } else if (combinedText.includes('ferie') || combinedText.includes('fer.')) {
      status = 'ferie';
    } else if (combinedText.includes('par') || combinedText.includes('rol') || combinedText.includes('permess')) {
      const durationMatch = combinedText.match(/(\d+\s*h(?:\s*\d+m?)?|\d+:\d{2}|\d+\s*m)/i);
      if (durationMatch) {
        permMin = parseFlexibleDuration(durationMatch[1]);
        status = in1 ? 'presenza' : 'par';
      } else if (!in1) {
        status = 'par';
      }
    } else if (combinedText.includes('chiusura') || combinedText.includes('festiv')) {
      status = 'chiusura';
    } else if (in1) {
      status = 'presenza';
    } else {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d).getDay();
      status = dayOfWeek === 0 || dayOfWeek === 6 ? 'non_lavorativo' : 'non_lavorativo';
    }

    const potentialNotes = nonTimeCells.filter(
      (c) => !['si', 'sì', 'yes', 's', '1', 'no', 'presenza', 'smart', 'ferie', 'par'].includes(c.toLowerCase().trim())
    );
    const noteText = potentialNotes.length > 0 ? potentialNotes.join(' - ') : undefined;

    days[dateStr] = {
      date: dateStr,
      status,
      isConfirmed: status !== 'non_lavorativo',
      notes: noteText,
    };

    if (status === 'smart' || in1 || actualOut2 || permMin > 0 || canteenUsed) {
      timeEntries[dateStr] = {
        date: dateStr,
        morningIn: in1,
        lunchOut: actualOut1,
        lunchIn: actualIn2,
        eveningOut: actualOut2,
        permissionMinutes: permMin > 0 ? permMin : undefined,
        canteenUsed,
        isSmartWork: isSmart,
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
 * Parses an HTML table string (from Zucchetti portal DOM) into BackupPayload.
 */
export function parseZucchettiHtmlTable(html: string, defaultYear: number = new Date().getFullYear()): BackupPayload {
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
  const rows: string[][] = [];

  for (const tr of rowMatches) {
    const cellMatches = tr.match(/<(td|th)[\s\S]*?<\/(td|th)>/gi) || [];
    const cellTexts = cellMatches.map((cell) => {
      return cell
        .replace(/<[\s\S]*?>/g, '') // strip tags
        .replace(/&nbsp;/g, ' ')
        .trim();
    });
    if (cellTexts.length > 0) {
      rows.push(cellTexts);
    }
  }

  return parseZucchettiTableRows(rows, defaultYear);
}

/**
 * Parses Zucchetti HR-WorkFlow raw text format (e.g. from hfpr_bcapcarte).
 */
export function parseZucchettiWorkflowText(
  rawText: string,
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth() + 1
): BackupPayload {
  const days: Record<string, CalendarDayInfo> = {};
  const timeEntries: Record<string, StoredTimeEntry> = {};

  const paddedM = String(month).padStart(2, '0');
  const dayRegex = /(\d{1,2})\s+(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b([\s\S]*?)(?=(?:(?:\r?\n)\s*\d{1,2}\s+(?:Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b)|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = dayRegex.exec(rawText)) !== null) {
    const dayNum = parseInt(match[1], 10);
    const weekday = match[2];
    const content = match[3].replace(/\s+/g, ' ').trim();
    const paddedD = String(dayNum).padStart(2, '0');
    const dateStr = `${year}-${paddedM}-${paddedD}`;

    const timesMatch = content.match(/(\d{2}:\d{2})\s*(\d{2}:\d{2})\s*(\d{2}:\d{2})\s*(\d{2}:\d{2})/);
    let status: DayStatus = 'presenza';
    let isSmart = false;
    let in1: string | undefined;
    let out1: string | undefined;
    let in2: string | undefined;
    let out2: string | undefined;

    if (timesMatch) {
      in1 = timesMatch[1];
      out1 = timesMatch[2];
      in2 = timesMatch[3];
      out2 = timesMatch[4];
      status = 'presenza';
    } else if (/SMART WORKING/i.test(content) || /\b1SW\b/.test(content)) {
      status = 'smart';
      isSmart = true;
    } else if (/FERIE/i.test(content)) {
      status = 'ferie';
    } else if (/PAR/i.test(content) || /ROL/i.test(content)) {
      status = 'par';
    } else if (/FES/i.test(content)) {
      status = 'chiusura';
    } else if (weekday === 'Sab' || weekday === 'Dom') {
      status = 'non_lavorativo';
    } else {
      status = 'presenza';
    }

    const canteenUsed = Boolean(in1 && out2 && status === 'presenza');

    days[dateStr] = {
      date: dateStr,
      status,
      isConfirmed: status !== 'non_lavorativo',
    };

    if (status === 'smart' || in1 || canteenUsed) {
      timeEntries[dateStr] = {
        date: dateStr,
        morningIn: in1,
        lunchOut: out1,
        lunchIn: in2,
        eveningOut: out2,
        canteenUsed,
        isSmartWork: isSmart,
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
