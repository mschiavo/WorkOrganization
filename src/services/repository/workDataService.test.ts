import { describe, it, expect, beforeEach, vi } from 'vitest';
import { workDataService } from './workDataService';
import { localCache, DEFAULT_SETTINGS } from '../storage/localCache';
import * as supabaseClientModule from '../supabase/client';

describe('workDataService', () => {
  beforeEach(() => {
    localCache.clearAll();
    vi.restoreAllMocks();
  });

  describe('offline / localCache fallback mode (no userId or no Supabase)', () => {
    it('loadMonthData returns settings, days, and timeEntries from localCache', async () => {
      localCache.saveCalendarDay('2026-10-05', {
        date: '2026-10-05',
        status: 'idea_smart',
        isConfirmed: false,
      });
      localCache.saveTimeEntry('2026-10-05', {
        date: '2026-10-05',
        morningIn: '08:30',
        eveningOut: '17:00',
        canteenUsed: false,
      });

      const data = await workDataService.loadMonthData(2026, 10, null);

      expect(data.settings).toEqual(DEFAULT_SETTINGS);
      expect(data.days['2026-10-05']).toBeDefined();
      expect(data.days['2026-10-05'].status).toBe('idea_smart');
      expect(data.timeEntries['2026-10-05']).toBeDefined();
      expect(data.timeEntries['2026-10-05'].morningIn).toBe('08:30');
    });

    it('saveDayStatus saves to localCache and sets isConfirmed correctly', async () => {
      // For presence, isConfirmed should be true
      const day1 = await workDataService.saveDayStatus('2026-10-06', 'presenza', 'Ufficio Milano');
      expect(day1).toEqual({
        date: '2026-10-06',
        status: 'presenza',
        notes: 'Ufficio Milano',
        isConfirmed: true,
        updatedAt: expect.any(String),
      });
      expect(localCache.getCalendarDays()['2026-10-06']).toEqual(day1);

      // For idea_smart, isConfirmed should be false
      const day2 = await workDataService.saveDayStatus('2026-10-07', 'idea_smart');
      expect(day2.isConfirmed).toBe(false);

      // If notes are omitted, existing notes should be preserved
      const day1Updated = await workDataService.saveDayStatus('2026-10-06', 'presenza');
      expect(day1Updated.notes).toBe('Ufficio Milano');
    });

    it('saveTimeEntry merges with existing entry and saves to localCache', async () => {
      await workDataService.saveTimeEntry('2026-10-08', {
        morningIn: '08:30',
        lunchOut: '13:00',
      });

      const result = await workDataService.saveTimeEntry('2026-10-08', {
        lunchIn: '13:45',
        eveningOut: '17:45',
        canteenUsed: true,
      });

      expect(result.timeEntry).toEqual({
        date: '2026-10-08',
        morningIn: '08:30',
        lunchOut: '13:00',
        lunchIn: '13:45',
        eveningOut: '17:45',
        canteenUsed: true,
        updatedAt: expect.any(String),
      });

      const cached = localCache.getTimeEntries()['2026-10-08'];
      expect(cached).toEqual(result.timeEntry);
    });

    it('saveSettings updates settings in localCache and returns merged settings', async () => {
      const updated = await workDataService.saveSettings({
        maxSmartDaysMonth: 12,
        canteenVoucherCost: 2.0,
      });

      expect(updated.maxSmartDaysMonth).toBe(12);
      expect(updated.canteenVoucherCost).toBe(2.0);
      expect(updated.minPresenceDaysWeek).toBe(DEFAULT_SETTINGS.minPresenceDaysWeek);
      expect(localCache.getSettings().maxSmartDaysMonth).toBe(12);
    });
  });

  describe('Auto-sync Timbrature -> Calendario', () => {
    it('auto-syncs to smart (status: smart, isConfirmed: true) when isSmartWork is true', async () => {
      // Day was previously idea_smart
      await workDataService.saveDayStatus('2026-10-09', 'idea_smart', 'Da approvare');

      const result = await workDataService.saveTimeEntry('2026-10-09', {
        isSmartWork: true,
      });

      expect(result.timeEntry.isSmartWork).toBe(true);
      expect(result.syncedDay).toBeDefined();
      expect(result.syncedDay?.status).toBe('smart');
      expect(result.syncedDay?.isConfirmed).toBe(true);
      expect(result.syncedDay?.notes).toBe('Da approvare'); // Notes preserved

      // Confirmed in localCache
      const cachedDay = localCache.getCalendarDays()['2026-10-09'];
      expect(cachedDay.status).toBe('smart');
      expect(cachedDay.isConfirmed).toBe(true);
    });

    it('auto-syncs to presenza (status: presenza, isConfirmed: true) when punches are entered without isSmartWork', async () => {
      // Day was previously idea_smart
      await workDataService.saveDayStatus('2026-10-10', 'idea_smart');

      const result = await workDataService.saveTimeEntry('2026-10-10', {
        morningIn: '08:45',
        eveningOut: '17:30',
        isSmartWork: false,
      });

      expect(result.syncedDay).toBeDefined();
      expect(result.syncedDay?.status).toBe('presenza');
      expect(result.syncedDay?.isConfirmed).toBe(true);

      const cachedDay = localCache.getCalendarDays()['2026-10-10'];
      expect(cachedDay.status).toBe('presenza');
      expect(cachedDay.isConfirmed).toBe(true);
    });

    it('does not auto-sync day status when no punches and isSmartWork is false or undefined', async () => {
      await workDataService.saveDayStatus('2026-10-11', 'ferie');

      const result = await workDataService.saveTimeEntry('2026-10-11', {
        permissionMinutes: 120,
      });

      expect(result.syncedDay).toBeUndefined();
      const cachedDay = localCache.getCalendarDays()['2026-10-11'];
      expect(cachedDay.status).toBe('ferie');
    });
  });

  describe('Supabase Integration & Fallback', () => {
    it('loads data from Supabase and mirrors to localCache when configured and user logged in', async () => {
      const mockSettings = {
        max_smart_days_month: 8,
        min_presence_days_week: 2,
        max_smart_days_week: 3,
        ferie_compensates_presence: true,
        standard_day_hours: 8.0,
        reduced_day_hours: 7.0,
        min_lunch_break_minutes: 45,
        max_daily_bank_recovery_minutes: 90,
        canteen_voucher_cost: 1.8,
        smart_voucher_value: 8.5,
        preferred_layout: 'split',
        preferred_theme: 'light',
      };

      const mockDays = [
        {
          date: '2026-10-12',
          status: 'presenza',
          notes: 'In sede',
          is_confirmed: true,
        },
      ];

      const mockTimeEntries = [
        {
          date: '2026-10-12',
          morning_in: '09:00',
          lunch_out: '13:00',
          lunch_in: '13:45',
          evening_out: '18:00',
          permission_minutes: 0,
          canteen_used: true,
          is_smart_work: false,
        },
      ];

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'app_settings') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
            };
          }
          if (table === 'calendar_days') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lte: vi.fn().mockResolvedValue({ data: mockDays, error: null }),
            };
          }
          if (table === 'time_entries') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              gte: vi.fn().mockReturnThis(),
              lte: vi.fn().mockResolvedValue({ data: mockTimeEntries, error: null }),
            };
          }
          return {};
        }),
      };

      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

      const result = await workDataService.loadMonthData(2026, 10, 'user-123');

      expect(result.days['2026-10-12']).toEqual({
        date: '2026-10-12',
        status: 'presenza',
        notes: 'In sede',
        isConfirmed: true,
      });
      expect(result.timeEntries['2026-10-12']).toEqual({
        date: '2026-10-12',
        morningIn: '09:00',
        lunchOut: '13:00',
        lunchIn: '13:45',
        eveningOut: '18:00',
        permissionMinutes: 0,
        canteenUsed: true,
        isSmartWork: false,
      });

      // Verify mirroring into localCache
      expect(localCache.getCalendarDays()['2026-10-12']).toBeDefined();
      expect(localCache.getTimeEntries()['2026-10-12']).toBeDefined();
    });

    it('loadSettings loads from Supabase, preserving custom localCache ferie/par hours if remote returns null', async () => {
      // Local cache has custom settings
      localCache.saveSettings({
        yearlyFerieHours: 200,
        yearlyParHours: 120,
      });

      const mockSettingsWithoutFerie = {
        user_id: 'user-789',
        max_smart_days_month: 8,
        yearly_ferie_hours: null,
        yearly_par_hours: null,
      };

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: mockSettingsWithoutFerie, error: null }),
        })),
      };

      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

      const loaded = await workDataService.loadSettings('user-789');

      expect(loaded.maxSmartDaysMonth).toBe(8);
      expect(loaded.yearlyFerieHours).toBe(200);
      expect(loaded.yearlyParHours).toBe(120);
    });

    it('queries the entire annual range (01-01 to 12-31) so leave counters and bank hours are immediately accurate across all months', async () => {
      const gteSpy = vi.fn().mockReturnThis();
      const lteSpy = vi.fn().mockResolvedValue({ data: [], error: null });

      const mockClient = {
        from: vi.fn((table: string) => {
          if (table === 'app_settings') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            gte: gteSpy,
            lte: lteSpy,
          };
        }),
      };

      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

      await workDataService.loadMonthData(2026, 11, 'user-123');

      expect(gteSpy).toHaveBeenCalledWith('date', '2026-01-01');
      expect(lteSpy).toHaveBeenCalledWith('date', '2026-12-31');
    });

    it('falls back gracefully to localCache when Supabase query fails with error', async () => {
      localCache.saveCalendarDay('2026-10-13', {
        date: '2026-10-13',
        status: 'smart',
        isConfirmed: true,
      });

      const mockClient = {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockRejectedValue(new Error('Network error')),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockRejectedValue(new Error('Network error')),
        })),
      };

      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

      const result = await workDataService.loadMonthData(2026, 10, 'user-123');

      expect(result.days['2026-10-13']).toBeDefined();
      expect(result.days['2026-10-13'].status).toBe('smart');
    });

    it('upserts to Supabase when saving day, time entry, and settings with userId', async () => {
      const upsertSpy = vi.fn().mockResolvedValue({ error: null });
      const mockClient = {
        from: vi.fn(() => ({
          upsert: upsertSpy,
        })),
      };

      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

      await workDataService.saveDayStatus('2026-10-14', 'presenza', 'Sede Roma', 'user-456');
      expect(mockClient.from).toHaveBeenCalledWith('calendar_days');
      expect(upsertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-456',
          date: '2026-10-14',
          status: 'presenza',
          notes: 'Sede Roma',
          is_confirmed: true,
        }),
        expect.anything()
      );

      await workDataService.saveTimeEntry('2026-10-14', { morningIn: '08:30', eveningOut: '17:30' }, 'user-456');
      expect(mockClient.from).toHaveBeenCalledWith('time_entries');

      await workDataService.saveSettings({ maxSmartDaysMonth: 9 }, 'user-456');
      expect(mockClient.from).toHaveBeenCalledWith('app_settings');
    });

    it('importBackupPayload in merge mode preserves unmentioned existing days', async () => {
      localCache.saveCalendarDay('2026-05-01', { date: '2026-05-01', status: 'chiusura' });

      const payload = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        days: {
          '2026-10-15': { date: '2026-10-15', status: 'smart' as const },
        },
        timeEntries: {},
      };

      const result = await workDataService.importBackupPayload(payload, 'merge');
      expect(result.success).toBe(true);
      expect(result.mode).toBe('merge');

      // Both existing day and new imported day exist
      expect(localCache.getCalendarDays()['2026-05-01']?.status).toBe('chiusura');
      expect(localCache.getCalendarDays()['2026-10-15']?.status).toBe('smart');
    });

    it('importBackupPayload in replace mode replaces existing days', async () => {
      localCache.saveCalendarDay('2026-05-01', { date: '2026-05-01', status: 'chiusura' });

      const payload = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        days: {
          '2026-10-15': { date: '2026-10-15', status: 'smart' as const },
        },
        timeEntries: {},
      };

      const result = await workDataService.importBackupPayload(payload, 'replace');
      expect(result.success).toBe(true);
      expect(result.mode).toBe('replace');

      // Old day is gone, only imported day remains
      expect(localCache.getCalendarDays()['2026-05-01']).toBeUndefined();
      expect(localCache.getCalendarDays()['2026-10-15']?.status).toBe('smart');
    });

    it('reports failure and queues failed batches when a cloud batch upsert errors during import', async () => {
      let callCount = 0;
      const mockClient = {
        from: vi.fn(() => ({
          upsert: vi.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 2) {
              return { error: { message: 'Supabase batch 2 failed with 500' } };
            }
            return { error: null };
          }),
        })),
      };

      vi.spyOn(supabaseClientModule, 'getSupabaseClient').mockReturnValue(mockClient as any);

      // Create 120 days so it splits into at least 2 batches of 50/100
      const daysBatch: Record<string, any> = {};
      for (let i = 1; i <= 120; i++) {
        const dStr = `2026-01-${String(i % 28 + 1).padStart(2, '0')}`;
        daysBatch[`date_${i}`] = { date: dStr, status: 'presenza' as const };
      }

      const payload = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        days: daysBatch,
        timeEntries: {},
      };

      const res = await workDataService.importBackupPayload(payload, 'merge', 'user-batch-fail');

      expect(res.cloudSynced).toBe(false);
      expect(res.errorDetails?.length).toBeGreaterThan(0);
      expect(res.errorDetails?.[0]).toContain('batch 2 failed');
    });
  });
});
