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

      expect(result.settings.maxSmartDaysMonth).toBe(8);
      expect(result.settings.preferredLayout).toBe('split');
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
      expect(localCache.getSettings().maxSmartDaysMonth).toBe(8);
      expect(localCache.getCalendarDays()['2026-10-12']).toBeDefined();
      expect(localCache.getTimeEntries()['2026-10-12']).toBeDefined();
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
  });
});
