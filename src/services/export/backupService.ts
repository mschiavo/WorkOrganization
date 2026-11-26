import { AppSettings, DEFAULT_SETTINGS } from '../storage/localCache';
import { CalendarDayInfo, DayStatus } from '../../core/domain/policyValidator';
import { StoredTimeEntry } from '../repository/workDataService';

export interface BackupMetadataOptions {
  isPartialOfflineCopy?: boolean;
  exportScope?: 'full_cloud' | 'local_partial';
  pendingMutationsCount?: number;
}

export interface BackupPayload {
  version: string;
  exportedAt: string;
  isPartialOfflineCopy?: boolean;
  exportScope?: 'full_cloud' | 'local_partial';
  pendingMutationsCount?: number;
  settings?: AppSettings;
  days: Record<string, CalendarDayInfo>;
  timeEntries: Record<string, StoredTimeEntry>;
}

const VALID_STATUSES: Set<DayStatus> = new Set([
  'presenza',
  'smart',
  'idea_smart',
  'ferie',
  'idea_ferie',
  'par',
  'idea_par',
  'chiusura',
  'non_lavorativo',
]);

const SUPPORTED_VERSION_REGEX = /^(?:0\.[1-9]\d*(?:\.\d+)?|1(?:\.\d+(?:\.\d+)?)?)$/;

function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function isValidTimePunch(val: any): boolean {
  if (val === null || val === undefined) return true;
  if (typeof val !== 'string') return false; // reject numeric e.g. 8.5
  return /^\d{1,2}:\d{2}$/.test(val.trim());
}

/**
 * Creates a formatted JSON backup string containing settings, calendar days, and time entries.
 */
export function createBackupJson(
  settings: AppSettings,
  days: Record<string, CalendarDayInfo>,
  timeEntries: Record<string, StoredTimeEntry>,
  options?: BackupMetadataOptions
): string {
  const payload: BackupPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    isPartialOfflineCopy: options?.isPartialOfflineCopy,
    exportScope: options?.exportScope || 'full_cloud',
    pendingMutationsCount: options?.pendingMutationsCount,
    settings,
    days,
    timeEntries,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parses, validates, and normalizes a JSON backup payload.
 * Throws an Error if the JSON is malformed or invalid according to P1.3 rules.
 */
export function parseAndValidateBackup(jsonStr: string): BackupPayload {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Il file di backup non contiene un JSON valido.');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Il backup non ha una struttura oggetto valida.');
  }

  if (!parsed.version) {
    throw new Error('Versione del backup mancante.');
  }

  const verStr = String(parsed.version).trim();
  if (!SUPPORTED_VERSION_REGEX.test(verStr)) {
    throw new Error(`Versione del backup non supportata: ${verStr}`);
  }

  let validatedSettings: AppSettings | undefined = undefined;
  if (parsed.settings && typeof parsed.settings === 'object' && !Array.isArray(parsed.settings) && Object.keys(parsed.settings).length > 0) {
    const raw = parsed.settings;
    validatedSettings = {
      ...DEFAULT_SETTINGS,
      ...raw,
      maxSmartDaysMonth: typeof raw.maxSmartDaysMonth === 'number' && Number.isFinite(raw.maxSmartDaysMonth) && raw.maxSmartDaysMonth >= 0 && raw.maxSmartDaysMonth <= 31 ? raw.maxSmartDaysMonth : DEFAULT_SETTINGS.maxSmartDaysMonth,
      minPresenceDaysWeek: typeof raw.minPresenceDaysWeek === 'number' && Number.isFinite(raw.minPresenceDaysWeek) && raw.minPresenceDaysWeek >= 0 && raw.minPresenceDaysWeek <= 7 ? raw.minPresenceDaysWeek : DEFAULT_SETTINGS.minPresenceDaysWeek,
      maxSmartDaysWeek: typeof raw.maxSmartDaysWeek === 'number' && Number.isFinite(raw.maxSmartDaysWeek) && raw.maxSmartDaysWeek >= 0 && raw.maxSmartDaysWeek <= 7 ? raw.maxSmartDaysWeek : DEFAULT_SETTINGS.maxSmartDaysWeek,
      standardDayHours: typeof raw.standardDayHours === 'number' && Number.isFinite(raw.standardDayHours) && raw.standardDayHours >= 1 && raw.standardDayHours <= 24 ? raw.standardDayHours : DEFAULT_SETTINGS.standardDayHours,
      reducedDayHours: typeof raw.reducedDayHours === 'number' && Number.isFinite(raw.reducedDayHours) && raw.reducedDayHours >= 1 && raw.reducedDayHours <= 24 ? raw.reducedDayHours : DEFAULT_SETTINGS.reducedDayHours,
      minLunchBreakMinutes: typeof raw.minLunchBreakMinutes === 'number' && Number.isFinite(raw.minLunchBreakMinutes) && raw.minLunchBreakMinutes >= 0 && raw.minLunchBreakMinutes <= 360 ? raw.minLunchBreakMinutes : DEFAULT_SETTINGS.minLunchBreakMinutes,
      canteenVoucherCost: typeof raw.canteenVoucherCost === 'number' && Number.isFinite(raw.canteenVoucherCost) ? raw.canteenVoucherCost : DEFAULT_SETTINGS.canteenVoucherCost,
      smartVoucherValue: typeof raw.smartVoucherValue === 'number' && Number.isFinite(raw.smartVoucherValue) ? raw.smartVoucherValue : DEFAULT_SETTINGS.smartVoucherValue,
      yearlyFerieHours: typeof raw.yearlyFerieHours === 'number' && Number.isFinite(raw.yearlyFerieHours) ? raw.yearlyFerieHours : DEFAULT_SETTINGS.yearlyFerieHours,
      yearlyParHours: typeof raw.yearlyParHours === 'number' && Number.isFinite(raw.yearlyParHours) ? raw.yearlyParHours : DEFAULT_SETTINGS.yearlyParHours,
    };
  }

  // Validate Days
  const rawDays = parsed.days;
  const validatedDays: Record<string, CalendarDayInfo> = {};
  if (rawDays && typeof rawDays === 'object' && !Array.isArray(rawDays)) {
    for (const [key, val] of Object.entries(rawDays)) {
      if (!isValidCalendarDate(key)) {
        throw new Error(`Data di calendario non reale o non valida: ${key}`);
      }
      if (!val || typeof val !== 'object' || Array.isArray(val)) {
        throw new Error(`Struttura non valida per il giorno ${key}`);
      }
      const dayObj = val as any;
      if (dayObj.date && dayObj.date !== key) {
        throw new Error(`Mancata corrispondenza tra chiave e data: chiave ${key} vs data ${dayObj.date}`);
      }
      if (!dayObj.status || !VALID_STATUSES.has(dayObj.status)) {
        throw new Error(`Causale o stato non valido per la data ${key}: ${dayObj.status}`);
      }
      if (dayObj.notes !== undefined && typeof dayObj.notes !== 'string') {
        throw new Error(`Le note per la data ${key} devono essere una stringa.`);
      }
      if (dayObj.isConfirmed !== undefined && typeof dayObj.isConfirmed !== 'boolean') {
        throw new Error(`isConfirmed per la data ${key} deve essere un booleano.`);
      }

      validatedDays[key] = {
        date: key,
        status: dayObj.status,
        notes: dayObj.notes ?? undefined,
        isConfirmed: dayObj.isConfirmed ?? (dayObj.status !== 'non_lavorativo' && dayObj.status !== 'idea_smart'),
        updatedAt: typeof dayObj.updatedAt === 'string' ? dayObj.updatedAt : undefined,
      };
    }
  }

  // Validate Time Entries
  const rawEntries = parsed.timeEntries;
  const validatedEntries: Record<string, StoredTimeEntry> = {};
  if (rawEntries && typeof rawEntries === 'object' && !Array.isArray(rawEntries)) {
    for (const [key, val] of Object.entries(rawEntries)) {
      if (!isValidCalendarDate(key)) {
        throw new Error(`Data di calendario non reale per la timbratura: ${key}`);
      }
      if (!val || typeof val !== 'object' || Array.isArray(val)) {
        throw new Error(`Struttura non valida per la timbratura ${key}`);
      }
      const entryObj = val as any;
      if (entryObj.date && entryObj.date !== key) {
        throw new Error(`Mancata corrispondenza tra chiave e data timbratura: ${key} vs ${entryObj.date}`);
      }

      // Check time punch format (string HH:mm or null)
      for (const field of ['morningIn', 'lunchOut', 'lunchIn', 'eveningOut']) {
        if (!isValidTimePunch(entryObj[field])) {
          throw new Error(`Formato orario non valido per il campo ${field} alla data ${key}: ${entryObj[field]}`);
        }
      }

      if (entryObj.permissionMinutes !== undefined) {
        if (typeof entryObj.permissionMinutes !== 'number' || !Number.isFinite(entryObj.permissionMinutes) || entryObj.permissionMinutes < 0 || entryObj.permissionMinutes > 1440) {
          throw new Error(`permissionMinutes non valido per la data ${key}: ${entryObj.permissionMinutes}`);
        }
      }

      if (entryObj.canteenUsed !== undefined && typeof entryObj.canteenUsed !== 'boolean') {
        throw new Error(`canteenUsed deve essere booleano alla data ${key}`);
      }
      if (entryObj.isSmartWork !== undefined && typeof entryObj.isSmartWork !== 'boolean') {
        throw new Error(`isSmartWork deve essere booleano alla data ${key}`);
      }

      validatedEntries[key] = {
        date: key,
        morningIn: entryObj.morningIn ? String(entryObj.morningIn).trim() : undefined,
        lunchOut: entryObj.lunchOut ? String(entryObj.lunchOut).trim() : undefined,
        lunchIn: entryObj.lunchIn ? String(entryObj.lunchIn).trim() : undefined,
        eveningOut: entryObj.eveningOut ? String(entryObj.eveningOut).trim() : undefined,
        permissionMinutes: entryObj.permissionMinutes ?? 0,
        canteenUsed: entryObj.canteenUsed ?? false,
        isSmartWork: entryObj.isSmartWork ?? false,
        updatedAt: typeof entryObj.updatedAt === 'string' ? entryObj.updatedAt : undefined,
      };
    }
  }

  return {
    version: verStr,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    isPartialOfflineCopy: Boolean(parsed.isPartialOfflineCopy),
    exportScope: parsed.exportScope === 'local_partial' ? 'local_partial' : 'full_cloud',
    pendingMutationsCount: typeof parsed.pendingMutationsCount === 'number' ? parsed.pendingMutationsCount : undefined,
    settings: validatedSettings,
    days: validatedDays,
    timeEntries: validatedEntries,
  };
}
