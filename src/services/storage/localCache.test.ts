import { describe, it, expect, beforeEach } from 'vitest';
import { localCache, DEFAULT_SETTINGS } from './localCache';

describe('localCache Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Settings', () => {
    it('returns DEFAULT_SETTINGS when localStorage is empty', () => {
      const settings = localCache.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('saves partial settings and returns merged settings', () => {
      const updated = localCache.saveSettings({
        maxSmartDaysMonth: 12,
        preferredTheme: 'light',
      });

      expect(updated.maxSmartDaysMonth).toBe(12);
      expect(updated.preferredTheme).toBe('light');
      expect(updated.minPresenceDaysWeek).toBe(DEFAULT_SETTINGS.minPresenceDaysWeek);
      expect(updated.standardDayHours).toBe(8);

      // Verify persistence on subsequent getSettings()
      const persisted = localCache.getSettings();
      expect(persisted).toEqual(updated);
    });

    it('recovers with DEFAULT_SETTINGS if stored JSON is corrupted', () => {
      localStorage.setItem('workorganizer_settings', '{ corrupted json ...');
      const settings = localCache.getSettings();
      expect(settings).toEqual(DEFAULT_SETTINGS);
    });

    it('preserves existing settings when saving subsequent partial updates', () => {
      localCache.saveSettings({ maxSmartDaysMonth: 8 });
      localCache.saveSettings({ preferredLayout: 'smart-sheet' });

      const settings = localCache.getSettings();
      expect(settings.maxSmartDaysMonth).toBe(8);
      expect(settings.preferredLayout).toBe('smart-sheet');
      expect(settings.canteenVoucherCost).toBe(1.5);
    });
  });

  describe('Calendar Days', () => {
    it('returns empty object when no days are stored', () => {
      expect(localCache.getCalendarDays()).toEqual({});
    });

    it('saves and retrieves a single calendar day', () => {
      const dayData = { status: 'presenza', notes: 'In office for client meeting', isConfirmed: true };
      localCache.saveCalendarDay('2026-11-04', dayData);

      const days = localCache.getCalendarDays();
      expect(days['2026-11-04']).toEqual(dayData);
    });

    it('saves multiple days without overwriting existing dates', () => {
      localCache.saveCalendarDay('2026-11-04', { status: 'presenza' });
      localCache.saveCalendarDay('2026-11-05', { status: 'smart' });

      const days = localCache.getCalendarDays();
      expect(Object.keys(days)).toHaveLength(2);
      expect(days['2026-11-04'].status).toBe('presenza');
      expect(days['2026-11-05'].status).toBe('smart');
    });

    it('saves a batch of calendar days with saveCalendarDays', () => {
      localCache.saveCalendarDay('2026-11-01', { status: 'non_lavorativo' });
      localCache.saveCalendarDays({
        '2026-11-02': { status: 'presenza' },
        '2026-11-03': { status: 'smart' },
      });

      const days = localCache.getCalendarDays();
      expect(days['2026-11-01'].status).toBe('non_lavorativo');
      expect(days['2026-11-02'].status).toBe('presenza');
      expect(days['2026-11-03'].status).toBe('smart');
    });

    it('recovers gracefully with empty object when stored calendar days JSON is corrupt', () => {
      localStorage.setItem('workorganizer_calendar_days', 'invalid json');
      expect(localCache.getCalendarDays()).toEqual({});
    });
  });

  describe('Time Entries', () => {
    it('returns empty object when no time entries are stored', () => {
      expect(localCache.getTimeEntries()).toEqual({});
    });

    it('saves and retrieves a single time entry', () => {
      const entry = {
        morningIn: '08:30',
        lunchOut: '12:30',
        lunchIn: '13:00',
        eveningOut: '17:00',
        workedMinutes: 480,
        deltaMinutes: 0,
      };

      localCache.saveTimeEntry('2026-11-04', entry);

      const entries = localCache.getTimeEntries();
      expect(entries['2026-11-04']).toEqual(entry);
    });

    it('saves a batch of time entries with saveTimeEntries', () => {
      localCache.saveTimeEntry('2026-11-04', { morningIn: '08:00' });
      localCache.saveTimeEntries({
        '2026-11-05': { morningIn: '09:00' },
        '2026-11-06': { morningIn: '08:30' },
      });

      const entries = localCache.getTimeEntries();
      expect(entries['2026-11-04'].morningIn).toBe('08:00');
      expect(entries['2026-11-05'].morningIn).toBe('09:00');
      expect(entries['2026-11-06'].morningIn).toBe('08:30');
    });

    it('recovers gracefully when time entries JSON is corrupt', () => {
      localStorage.setItem('workorganizer_time_entries', 'corrupted');
      expect(localCache.getTimeEntries()).toEqual({});
    });
  });

  describe('Supabase Config', () => {
    it('returns null when no supabase config is saved', () => {
      expect(localCache.getSupabaseConfig()).toBeNull();
    });

    it('saves and returns custom supabase config', () => {
      const config = {
        url: 'https://my-project.supabase.co',
        anonKey: 'sample-anon-key-12345',
      };

      localCache.saveSupabaseConfig(config);
      expect(localCache.getSupabaseConfig()).toEqual(config);
    });

    it('removes supabase config when saving null', () => {
      localCache.saveSupabaseConfig({
        url: 'https://my-project.supabase.co',
        anonKey: 'sample-anon-key',
      });
      expect(localCache.getSupabaseConfig()).not.toBeNull();

      localCache.saveSupabaseConfig(null);
      expect(localCache.getSupabaseConfig()).toBeNull();
    });

    it('returns null if stored supabase config is invalid or incomplete', () => {
      localStorage.setItem('workorganizer_supabase_config', JSON.stringify({ url: '' }));
      expect(localCache.getSupabaseConfig()).toBeNull();

      localStorage.setItem('workorganizer_supabase_config', 'not json');
      expect(localCache.getSupabaseConfig()).toBeNull();
    });
  });

  describe('clearAll and clearUserData', () => {
    it('clears all workorganizer data from localStorage', () => {
      localCache.saveSettings({ maxSmartDaysMonth: 5 });
      localCache.saveCalendarDay('2026-11-04', { status: 'presenza' });
      localCache.saveTimeEntry('2026-11-04', { morningIn: '08:30' });
      localCache.saveSupabaseConfig({ url: 'https://test.supabase.co', anonKey: 'k' });

      localCache.clearAll();

      expect(localCache.getSettings()).toEqual(DEFAULT_SETTINGS);
      expect(localCache.getCalendarDays()).toEqual({});
      expect(localCache.getTimeEntries()).toEqual({});
      expect(localCache.getSupabaseConfig()).toBeNull();
    });

    it('clearUserData clears calendar days and time entries but preserves supabase config', () => {
      localCache.saveCalendarDay('2026-11-04', { status: 'presenza' });
      localCache.saveTimeEntry('2026-11-04', { morningIn: '08:30' });
      localCache.saveSupabaseConfig({ url: 'https://test.supabase.co', anonKey: 'k' });

      localCache.clearUserData();

      expect(localCache.getCalendarDays()).toEqual({});
      expect(localCache.getTimeEntries()).toEqual({});
      expect(localCache.getSupabaseConfig()).toEqual({ url: 'https://test.supabase.co', anonKey: 'k' });
    });
  });
});
