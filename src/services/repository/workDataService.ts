import { CalendarDayInfo, DayStatus } from '../../core/domain/policyValidator';
import { TimeEntryInput } from '../../core/domain/timeCalculator';
import { localCache, AppSettings } from '../storage/localCache';
import { getSupabaseClient } from '../supabase/client';

export interface StoredTimeEntry extends TimeEntryInput {
  date: string;
  canteenUsed?: boolean;
}

function mapSupabaseSettingsToAppSettings(data: any): AppSettings {
  const current = localCache.getSettings();
  return {
    maxSmartDaysMonth: data.max_smart_days_month ?? current.maxSmartDaysMonth,
    minPresenceDaysWeek: data.min_presence_days_week ?? current.minPresenceDaysWeek,
    maxSmartDaysWeek: data.max_smart_days_week ?? current.maxSmartDaysWeek,
    ferieCompensatesPresence: data.ferie_compensates_presence ?? current.ferieCompensatesPresence,
    standardDayHours: Number(data.standard_day_hours ?? current.standardDayHours),
    reducedDayHours: Number(data.reduced_day_hours ?? current.reducedDayHours),
    minLunchBreakMinutes: data.min_lunch_break_minutes ?? current.minLunchBreakMinutes,
    maxDailyBankRecoveryMinutes: data.max_daily_bank_recovery_minutes ?? current.maxDailyBankRecoveryMinutes,
    canteenVoucherCost: Number(data.canteen_voucher_cost ?? current.canteenVoucherCost),
    smartVoucherValue: Number(data.smart_voucher_value ?? current.smartVoucherValue),
    yearlyFerieHours:
      data.yearly_ferie_hours !== undefined && data.yearly_ferie_hours !== null && !isNaN(Number(data.yearly_ferie_hours))
        ? Number(data.yearly_ferie_hours)
        : current.yearlyFerieHours,
    prevYearFerieResidualHours:
      data.prev_year_ferie_residual_hours !== undefined && data.prev_year_ferie_residual_hours !== null && !isNaN(Number(data.prev_year_ferie_residual_hours))
        ? Number(data.prev_year_ferie_residual_hours)
        : current.prevYearFerieResidualHours,
    yearlyParHours:
      data.yearly_par_hours !== undefined && data.yearly_par_hours !== null && !isNaN(Number(data.yearly_par_hours))
        ? Number(data.yearly_par_hours)
        : current.yearlyParHours,
    prevYearParResidualHours:
      data.prev_year_par_residual_hours !== undefined && data.prev_year_par_residual_hours !== null && !isNaN(Number(data.prev_year_par_residual_hours))
        ? Number(data.prev_year_par_residual_hours)
        : current.prevYearParResidualHours,
    preferredLayout: data.preferred_layout ?? current.preferredLayout,
    preferredTheme: data.preferred_theme ?? current.preferredTheme,
  };
}

function mapAppSettingsToSupabase(settings: Partial<AppSettings>, userId: string): any {
  const mapped: any = { user_id: userId, updated_at: new Date().toISOString() };
  if (settings.maxSmartDaysMonth !== undefined) mapped.max_smart_days_month = settings.maxSmartDaysMonth;
  if (settings.minPresenceDaysWeek !== undefined) mapped.min_presence_days_week = settings.minPresenceDaysWeek;
  if (settings.maxSmartDaysWeek !== undefined) mapped.max_smart_days_week = settings.maxSmartDaysWeek;
  if (settings.ferieCompensatesPresence !== undefined) mapped.ferie_compensates_presence = settings.ferieCompensatesPresence;
  if (settings.standardDayHours !== undefined) mapped.standard_day_hours = settings.standardDayHours;
  if (settings.reducedDayHours !== undefined) mapped.reduced_day_hours = settings.reducedDayHours;
  if (settings.minLunchBreakMinutes !== undefined) mapped.min_lunch_break_minutes = settings.minLunchBreakMinutes;
  if (settings.maxDailyBankRecoveryMinutes !== undefined) mapped.max_daily_bank_recovery_minutes = settings.maxDailyBankRecoveryMinutes;
  if (settings.canteenVoucherCost !== undefined) mapped.canteen_voucher_cost = settings.canteenVoucherCost;
  if (settings.smartVoucherValue !== undefined) mapped.smart_voucher_value = settings.smartVoucherValue;
  if (settings.yearlyFerieHours !== undefined) mapped.yearly_ferie_hours = settings.yearlyFerieHours;
  if (settings.prevYearFerieResidualHours !== undefined) mapped.prev_year_ferie_residual_hours = settings.prevYearFerieResidualHours;
  if (settings.yearlyParHours !== undefined) mapped.yearly_par_hours = settings.yearlyParHours;
  if (settings.prevYearParResidualHours !== undefined) mapped.prev_year_par_residual_hours = settings.prevYearParResidualHours;
  if (settings.preferredLayout !== undefined) mapped.preferred_layout = settings.preferredLayout;
  if (settings.preferredTheme !== undefined) mapped.preferred_theme = settings.preferredTheme;
  return mapped;
}

export const workDataService = {
  async loadSettings(userId?: string | null): Promise<AppSettings> {
    let settings = localCache.getSettings();
    if (!userId) {
      return settings;
    }
    const client = getSupabaseClient();
    if (!client) {
      return settings;
    }
    try {
      const { data, error } = await client
        .from('app_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data && !error) {
        settings = mapSupabaseSettingsToAppSettings(data);
        localCache.saveSettings(settings);
      }
    } catch {
      // offline fallback
    }
    return settings;
  },

  async loadMonthData(
    year: number,
    _month: number,
    userId?: string | null
  ): Promise<{
    days: Record<string, CalendarDayInfo>;
    timeEntries: Record<string, StoredTimeEntry>;
    settings: AppSettings;
  }> {
    // Query the full year so that annual leave counters (Ferie/PAR) and quarterly bank hours
    // are immediately accurate without requiring the user to navigate to each past month.
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;

    let settings = localCache.getSettings();
    let days = localCache.getCalendarDays();
    let timeEntries = localCache.getTimeEntries();

    if (!userId) {
      return { days, timeEntries, settings };
    }

    const client = getSupabaseClient();
    if (!client) {
      return { days, timeEntries, settings };
    }

    try {
      // Load Calendar Days
      const { data: daysData } = await client
        .from('calendar_days')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (daysData && Array.isArray(daysData)) {
        const remoteDays: Record<string, CalendarDayInfo> = {};
        for (const row of daysData) {
          remoteDays[row.date] = {
            date: row.date,
            status: row.status as DayStatus,
            notes: row.notes ?? undefined,
            isConfirmed: row.is_confirmed ?? false,
          };
        }
        days = { ...days, ...remoteDays };
        localCache.saveCalendarDays(remoteDays);
      }

      // Load Time Entries
      const { data: timeEntriesData } = await client
        .from('time_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (timeEntriesData && Array.isArray(timeEntriesData)) {
        const remoteEntries: Record<string, StoredTimeEntry> = {};
        for (const row of timeEntriesData) {
          remoteEntries[row.date] = {
            date: row.date,
            morningIn: row.morning_in ?? undefined,
            lunchOut: row.lunch_out ?? undefined,
            lunchIn: row.lunch_in ?? undefined,
            eveningOut: row.evening_out ?? undefined,
            permissionMinutes: row.permission_minutes ?? 0,
            canteenUsed: row.canteen_used ?? false,
            isSmartWork: row.is_smart_work ?? false,
          };
        }
        timeEntries = { ...timeEntries, ...remoteEntries };
        localCache.saveTimeEntries(remoteEntries);
      }
    } catch {
      // Supabase query failed, return cached local data
    }

    return { days, timeEntries, settings };
  },

  async saveDayStatus(
    date: string,
    status: DayStatus,
    notes?: string,
    userId?: string | null
  ): Promise<CalendarDayInfo> {
    const existing = localCache.getCalendarDays()[date];
    const isConfirmed = status === 'idea_smart' ? false : (existing?.isConfirmed ?? true);
    const resolvedNotes = notes !== undefined ? notes : existing?.notes;

    const dayInfo: CalendarDayInfo = {
      date,
      status,
      notes: resolvedNotes,
      isConfirmed,
    };

    localCache.saveCalendarDay(date, dayInfo);

    if (userId) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('calendar_days').upsert(
            {
              user_id: userId,
              date,
              status,
              notes: resolvedNotes,
              is_confirmed: isConfirmed,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,date' }
          );
        } catch {
          // ignore error in offline mode
        }
      }
    }

    return dayInfo;
  },

  async saveTimeEntry(
    date: string,
    entry: Partial<StoredTimeEntry>,
    userId?: string | null
  ): Promise<{
    timeEntry: StoredTimeEntry;
    syncedDay?: CalendarDayInfo;
  }> {
    const existingEntries = localCache.getTimeEntries();
    const currentEntry: StoredTimeEntry = existingEntries[date] ?? { date };
    const mergedEntry: StoredTimeEntry = { ...currentEntry, ...entry, date };

    localCache.saveTimeEntry(date, mergedEntry);

    // Auto-sync status with calendar day
    let syncedDay: CalendarDayInfo | undefined;
    const isSmart = mergedEntry.isSmartWork === true;
    const hasPunches = Boolean(mergedEntry.morningIn || mergedEntry.eveningOut);

    if (isSmart) {
      syncedDay = await this.saveDayStatus(date, 'smart', undefined, userId);
      syncedDay.isConfirmed = true;
      localCache.saveCalendarDay(date, syncedDay);
    } else if (hasPunches) {
      syncedDay = await this.saveDayStatus(date, 'presenza', undefined, userId);
      syncedDay.isConfirmed = true;
      localCache.saveCalendarDay(date, syncedDay);
    }

    if (userId) {
      const client = getSupabaseClient();
      if (client) {
        try {
          await client.from('time_entries').upsert(
            {
              user_id: userId,
              date,
              morning_in: mergedEntry.morningIn ?? null,
              lunch_out: mergedEntry.lunchOut ?? null,
              lunch_in: mergedEntry.lunchIn ?? null,
              evening_out: mergedEntry.eveningOut ?? null,
              permission_minutes: mergedEntry.permissionMinutes ?? 0,
              canteen_used: mergedEntry.canteenUsed ?? false,
              is_smart_work: mergedEntry.isSmartWork ?? false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,date' }
          );
        } catch {
          // ignore error in offline mode
        }
      }
    }

    return { timeEntry: mergedEntry, syncedDay };
  },

  async saveSettings(settings: Partial<AppSettings>, userId?: string | null): Promise<AppSettings> {
    const merged = localCache.saveSettings(settings);

    if (userId) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const payload = mapAppSettingsToSupabase(merged, userId);
          const { error } = await client.from('app_settings').upsert(payload, { onConflict: 'user_id' });
          if (error) {
            console.warn('Supabase app_settings upsert error:', error.message);
            // If the remote table is missing the newly added ferie/par columns, retry with base columns
            const {
              yearly_ferie_hours,
              prev_year_ferie_residual_hours,
              yearly_par_hours,
              prev_year_par_residual_hours,
              ...basePayload
            } = payload;
            await client.from('app_settings').upsert(basePayload, { onConflict: 'user_id' });
          }
        } catch {
          // ignore error in offline mode
        }
      }
    }

    return merged;
  },

  async syncAllData(
    days: Record<string, CalendarDayInfo>,
    timeEntries: Record<string, StoredTimeEntry>,
    userId?: string | null
  ): Promise<void> {
    if (!userId) return;
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const daysRows = Object.values(days).map((d) => ({
        user_id: userId,
        date: d.date,
        status: d.status,
        notes: d.notes ?? null,
        is_confirmed: d.isConfirmed ?? false,
        updated_at: new Date().toISOString(),
      }));

      if (daysRows.length > 0) {
        for (let i = 0; i < daysRows.length; i += 100) {
          await client.from('calendar_days').upsert(daysRows.slice(i, i + 100), { onConflict: 'user_id,date' });
        }
      }

      const entryRows = Object.values(timeEntries).map((e) => ({
        user_id: userId,
        date: e.date,
        morning_in: e.morningIn ?? null,
        lunch_out: e.lunchOut ?? null,
        lunch_in: e.lunchIn ?? null,
        evening_out: e.eveningOut ?? null,
        permission_minutes: e.permissionMinutes ?? 0,
        canteen_used: e.canteenUsed ?? false,
        is_smart_work: e.isSmartWork ?? false,
        updated_at: new Date().toISOString(),
      }));

      if (entryRows.length > 0) {
        for (let i = 0; i < entryRows.length; i += 100) {
          await client.from('time_entries').upsert(entryRows.slice(i, i + 100), { onConflict: 'user_id,date' });
        }
      }
    } catch {
      // ignore error in offline mode
    }
  },
};
