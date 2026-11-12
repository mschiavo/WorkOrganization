/**
 * Local Storage Cache for WorkOrganization
 * Provides persistent offline storage and fallback when Supabase is not connected.
 */

export interface AppSettings {
  maxSmartDaysMonth: number;
  minPresenceDaysWeek: number;
  maxSmartDaysWeek: number;
  ferieCompensatesPresence: boolean;
  standardDayHours: number;
  reducedDayHours: number;
  minLunchBreakMinutes: number;
  maxDailyBankRecoveryMinutes: number;
  canteenVoucherCost: number;
  smartVoucherValue: number;
  yearlyFerieHours: number;
  prevYearFerieResidualHours: number;
  yearlyParHours: number;
  prevYearParResidualHours: number;
  preferredLayout: 'split' | 'smart-sheet';
  preferredTheme: 'dark' | 'light' | 'system';
}

export const DEFAULT_SETTINGS: AppSettings = {
  maxSmartDaysMonth: 10,
  minPresenceDaysWeek: 1,
  maxSmartDaysWeek: 4,
  ferieCompensatesPresence: false,
  standardDayHours: 8,
  reducedDayHours: 7,
  minLunchBreakMinutes: 30,
  maxDailyBankRecoveryMinutes: 60,
  canteenVoucherCost: 1.5,
  smartVoucherValue: 8.0,
  yearlyFerieHours: 160,
  prevYearFerieResidualHours: 0,
  yearlyParHours: 88,
  prevYearParResidualHours: 0,
  preferredLayout: 'split',
  preferredTheme: 'dark',
};

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

const STORAGE_KEYS = {
  SETTINGS: 'workorganizer_settings',
  CALENDAR_DAYS: 'workorganizer_calendar_days',
  TIME_ENTRIES: 'workorganizer_time_entries',
  SUPABASE_CONFIG: 'workorganizer_supabase_config',
} as const;

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // LocalStorage unavailable or access denied
  }
  return null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // LocalStorage quota exceeded or unavailable
  }
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // LocalStorage access denied
  }
}

export const localCache = {
  getSettings(): AppSettings {
    const raw = safeGetItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return { ...DEFAULT_SETTINGS };

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const merged: AppSettings = { ...DEFAULT_SETTINGS, ...parsed };
        if (merged.preferredLayout !== 'split' && merged.preferredLayout !== 'smart-sheet') {
          merged.preferredLayout = 'split';
        }
        return merged;
      }
    } catch {
      // JSON parse error, return defaults
    }
    return { ...DEFAULT_SETTINGS };
  },

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    const current = this.getSettings();
    const merged: AppSettings = { ...current, ...settings };
    safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    return merged;
  },

  getCalendarDays(): Record<string, any> {
    const raw = safeGetItem(STORAGE_KEYS.CALENDAR_DAYS);
    if (!raw) return {};

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // JSON error
    }
    return {};
  },

  saveCalendarDay(date: string, data: any): void {
    const days = this.getCalendarDays();
    days[date] = data;
    safeSetItem(STORAGE_KEYS.CALENDAR_DAYS, JSON.stringify(days));
  },

  saveCalendarDays(daysMap: Record<string, any>): void {
    const current = this.getCalendarDays();
    const updated = { ...current, ...daysMap };
    safeSetItem(STORAGE_KEYS.CALENDAR_DAYS, JSON.stringify(updated));
  },

  getTimeEntries(): Record<string, any> {
    const raw = safeGetItem(STORAGE_KEYS.TIME_ENTRIES);
    if (!raw) return {};

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // JSON error
    }
    return {};
  },

  saveTimeEntry(date: string, entry: any): void {
    const entries = this.getTimeEntries();
    entries[date] = entry;
    safeSetItem(STORAGE_KEYS.TIME_ENTRIES, JSON.stringify(entries));
  },

  saveTimeEntries(entriesMap: Record<string, any>): void {
    const current = this.getTimeEntries();
    const updated = { ...current, ...entriesMap };
    safeSetItem(STORAGE_KEYS.TIME_ENTRIES, JSON.stringify(updated));
  },

  getSupabaseConfig(): SupabaseConfig | null {
    const raw = safeGetItem(STORAGE_KEYS.SUPABASE_CONFIG);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed === 'object' &&
        typeof parsed.url === 'string' &&
        parsed.url.trim().length > 0 &&
        typeof parsed.anonKey === 'string' &&
        parsed.anonKey.trim().length > 0
      ) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
        };
      }
    } catch {
      // JSON parse error
    }
    return null;
  },

  saveSupabaseConfig(config: SupabaseConfig | null): void {
    if (!config) {
      safeRemoveItem(STORAGE_KEYS.SUPABASE_CONFIG);
    } else {
      safeSetItem(STORAGE_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
    }
  },

  /**
   * Clears only user-specific data (calendar days and time punches),
   * preserving application settings and Supabase configuration.
   */
  clearUserData(): void {
    safeRemoveItem(STORAGE_KEYS.CALENDAR_DAYS);
    safeRemoveItem(STORAGE_KEYS.TIME_ENTRIES);
  },

  clearAll(): void {
    safeRemoveItem(STORAGE_KEYS.SETTINGS);
    safeRemoveItem(STORAGE_KEYS.CALENDAR_DAYS);
    safeRemoveItem(STORAGE_KEYS.TIME_ENTRIES);
    safeRemoveItem(STORAGE_KEYS.SUPABASE_CONFIG);
  },
};
