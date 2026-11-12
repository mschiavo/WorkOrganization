import { describe, it, expect } from 'vitest';
import { createBackupJson, parseAndValidateBackup } from './backupService';
import { DEFAULT_SETTINGS } from '../storage/localCache';

describe('backupService', () => {
  const sampleDays = {
    '2026-10-05': {
      date: '2026-10-05',
      status: 'presenza' as const,
      notes: 'Ufficio sede centrale',
      isConfirmed: true,
    },
  };

  const sampleEntries = {
    '2026-10-05': {
      date: '2026-10-05',
      morningIn: '08:30',
      lunchOut: '13:00',
      lunchIn: '13:45',
      eveningOut: '17:30',
      canteenUsed: true,
    },
  };

  it('creates a serialized JSON with metadata, settings, days, and timeEntries', () => {
    const jsonStr = createBackupJson(DEFAULT_SETTINGS, sampleDays, sampleEntries);
    expect(typeof jsonStr).toBe('string');

    const parsed = JSON.parse(jsonStr);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.exportedAt).toBeDefined();
    expect(parsed.settings).toEqual(DEFAULT_SETTINGS);
    expect(parsed.days['2026-10-05']).toBeDefined();
    expect(parsed.timeEntries['2026-10-05']).toBeDefined();
  });

  it('parses and validates a valid backup round-trip', () => {
    const jsonStr = createBackupJson(DEFAULT_SETTINGS, sampleDays, sampleEntries);
    const result = parseAndValidateBackup(jsonStr);

    expect(result.version).toBe('1.0.0');
    expect(result.settings.maxSmartDaysMonth).toBe(10);
    expect(result.days['2026-10-05'].notes).toBe('Ufficio sede centrale');
    expect(result.timeEntries['2026-10-05'].morningIn).toBe('08:30');
  });

  it('throws descriptive error on malformed JSON', () => {
    expect(() => parseAndValidateBackup('invalid json')).toThrow(
      'Il file di backup non contiene un JSON valido.'
    );
  });

  it('throws error when version field is missing', () => {
    const invalidObj = JSON.stringify({ settings: DEFAULT_SETTINGS, days: {} });
    expect(() => parseAndValidateBackup(invalidObj)).toThrow(
      'Versione del backup mancante.'
    );
  });
});
