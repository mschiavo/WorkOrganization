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
    expect(result.settings?.maxSmartDaysMonth).toBe(10);
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

  describe('P1.3 Strict Validation Requirements', () => {
    it('rejects unsupported versions like version 9', () => {
      const payload = JSON.stringify({
        version: '9',
        days: {},
        timeEntries: {},
      });
      expect(() => parseAndValidateBackup(payload)).toThrow(/versione del backup non supportata/i);
    });

    it('rejects records with numeric morningIn or invalid time punch format', () => {
      const payload = JSON.stringify({
        version: '1.0.0',
        days: {},
        timeEntries: {
          '2026-10-05': {
            date: '2026-10-05',
            morningIn: 8.5, // Numeric instead of string "08:30"
          },
        },
      });
      expect(() => parseAndValidateBackup(payload)).toThrow(/orario.*non valido/i);
    });

    it('rejects impossible calendar dates such as 2026-02-30 or month 13', () => {
      const payload = JSON.stringify({
        version: '1.0.0',
        days: {
          '2026-02-30': {
            date: '2026-02-30',
            status: 'presenza',
          },
        },
      });
      expect(() => parseAndValidateBackup(payload)).toThrow(/data di calendario non reale/i);
    });

    it('rejects key and date attribute mismatch', () => {
      const payload = JSON.stringify({
        version: '1.0.0',
        days: {
          '2026-10-05': {
            date: '2026-10-06', // Mismatched date
            status: 'presenza',
          },
        },
      });
      expect(() => parseAndValidateBackup(payload)).toThrow(/mancata corrispondenza tra chiave e data/i);
    });

    it('rejects invalid day status causality', () => {
      const payload = JSON.stringify({
        version: '1.0.0',
        days: {
          '2026-10-05': {
            date: '2026-10-05',
            status: 'unsupported_status',
          },
        },
      });
      expect(() => parseAndValidateBackup(payload)).toThrow(/causale o stato non valido/i);
    });

    it('identifies partial local backup when cloud is unreachable', () => {
      const jsonStr = createBackupJson(DEFAULT_SETTINGS, sampleDays, sampleEntries, {
        isPartialOfflineCopy: true,
        exportScope: 'local_partial',
      });
      const parsed = parseAndValidateBackup(jsonStr);

      expect(parsed.isPartialOfflineCopy).toBe(true);
      expect(parsed.exportScope).toBe('local_partial');
    });

    it('returns undefined settings when backup omits settings so callers preserve current settings', () => {
      const payload = JSON.stringify({
        version: '1.0.0',
        days: sampleDays,
        timeEntries: sampleEntries,
      });
      const result = parseAndValidateBackup(payload);

      expect(result.settings).toBeUndefined();
      expect(result.days['2026-10-05']).toBeDefined();
    });
  });
});
