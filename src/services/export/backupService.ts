import { AppSettings, DEFAULT_SETTINGS } from '../storage/localCache';
import { CalendarDayInfo } from '../../core/domain/policyValidator';
import { StoredTimeEntry } from '../repository/workDataService';

export interface BackupPayload {
  version: string;
  exportedAt: string;
  settings: AppSettings;
  days: Record<string, CalendarDayInfo>;
  timeEntries: Record<string, StoredTimeEntry>;
}

/**
 * Creates a formatted JSON backup string containing settings, calendar days, and time entries.
 */
export function createBackupJson(
  settings: AppSettings,
  days: Record<string, CalendarDayInfo>,
  timeEntries: Record<string, StoredTimeEntry>
): string {
  const payload: BackupPayload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings,
    days,
    timeEntries,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Parses, validates, and normalizes a JSON backup payload.
 * Throws an Error if the JSON is malformed or invalid.
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

  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...(parsed.settings && typeof parsed.settings === 'object' && !Array.isArray(parsed.settings)
      ? parsed.settings
      : {}),
  };

  const days: Record<string, CalendarDayInfo> =
    parsed.days && typeof parsed.days === 'object' && !Array.isArray(parsed.days)
      ? parsed.days
      : {};

  const timeEntries: Record<string, StoredTimeEntry> =
    parsed.timeEntries && typeof parsed.timeEntries === 'object' && !Array.isArray(parsed.timeEntries)
      ? parsed.timeEntries
      : {};

  return {
    version: String(parsed.version),
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
    settings,
    days,
    timeEntries,
  };
}
