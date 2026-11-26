/**
 * Local Storage Cache for WorkOrganization
 * Provides persistent offline storage, multi-account isolation, and fallback when Supabase is not connected.
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

export type StorageScopeType = 'guest' | 'cloud' | 'legacy';

export interface StorageIdentity {
  scope: StorageScopeType;
  userId?: string;
  projectRef?: string;
}

export interface PendingMutation {
  id: string;
  type: 'save_day_status' | 'save_time_entry' | 'save_settings';
  date?: string;
  payload: any;
  clientTimestamp: string;
  version: number;
  retryCount: number;
  status: 'pending' | 'in_flight' | 'error';
  lastError?: string;
}

export type PersistenceStatus = 'persisted' | 'memory-only' | 'error';

export function extractProjectRef(url?: string | null): string {
  if (!url) return 'default';
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    const parts = host.split('.');
    if (parts.length >= 3 && parts[1] === 'supabase' && parts[2] === 'co') {
      return parts[0];
    }
    return host.replace(/[^a-zA-Z0-9_-]/g, '_');
  } catch {
    return String(url).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
  }
}

// Global / client-level keys (independent of user account identity)
const GLOBAL_KEYS = {
  SUPABASE_CONFIG: 'workorganizer_supabase_config',
} as const;

// Unowned legacy keys (pre-v0.7.1)
const LEGACY_KEYS = {
  SETTINGS: 'workorganizer_settings',
  CALENDAR_DAYS: 'workorganizer_calendar_days',
  TIME_ENTRIES: 'workorganizer_time_entries',
} as const;

const memoryStore = new Map<string, string>();
let currentPersistenceStatus: PersistenceStatus = 'persisted';
let activeIdentity: StorageIdentity = { scope: 'guest' };

function computeKeyPrefix(identity: StorageIdentity): string {
  if (identity.scope === 'cloud' && identity.userId) {
    const proj = identity.projectRef ? identity.projectRef.replace(/[^a-zA-Z0-9_-]/g, '_') : 'default';
    const user = identity.userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `wo_cloud_${proj}_${user}_`;
  }
  if (identity.scope === 'guest') {
    return 'wo_guest_';
  }
  return 'workorganizer_';
}

function getScopedKey(baseSuffix: string, identity?: StorageIdentity): string {
  const target = identity || activeIdentity;
  return computeKeyPrefix(target) + baseSuffix;
}

function safeGetItem(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
      // If localStorage is functioning and key was explicitly null, return null unless memory-only
      if (currentPersistenceStatus !== 'memory-only') {
        return null;
      }
    }
  } catch {
    // LocalStorage unavailable
  }
  return memoryStore.get(key) ?? null;
}

function safeSetItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      memoryStore.set(key, value);
      currentPersistenceStatus = 'persisted';
      return;
    }
  } catch {
    currentPersistenceStatus = 'memory-only';
  }
  memoryStore.set(key, value);
}

function safeRemoveItem(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // LocalStorage access denied
  }
  memoryStore.delete(key);
}

export const localCache = {
  setActiveIdentity(identity: StorageIdentity): void {
    activeIdentity = { ...identity };
  },

  getActiveIdentity(): StorageIdentity {
    return { ...activeIdentity };
  },

  getPersistenceStatus(): PersistenceStatus {
    return currentPersistenceStatus;
  },

  resetForTesting(): void {
    memoryStore.clear();
    currentPersistenceStatus = 'persisted';
    activeIdentity = { scope: 'guest' };
  },

  getSettings(identity?: StorageIdentity): AppSettings {
    const target = identity || activeIdentity;
    const scopedKey = getScopedKey('settings', target);
    let raw = safeGetItem(scopedKey);
    if (!raw && target.scope === 'guest') {
      raw = safeGetItem(LEGACY_KEYS.SETTINGS);
    }
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

  saveSettings(settings: Partial<AppSettings>, identity?: StorageIdentity): AppSettings {
    const key = getScopedKey('settings', identity);
    const current = this.getSettings(identity);
    const merged: AppSettings = { ...current, ...settings };
    safeSetItem(key, JSON.stringify(merged));
    return merged;
  },

  getCalendarDays(identity?: StorageIdentity): Record<string, any> {
    const target = identity || activeIdentity;
    const scopedKey = getScopedKey('calendar_days', target);
    let raw = safeGetItem(scopedKey);
    if (!raw && target.scope === 'guest') {
      raw = safeGetItem(LEGACY_KEYS.CALENDAR_DAYS);
    }
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

  saveCalendarDay(date: string, data: any, identity?: StorageIdentity): void {
    const key = getScopedKey('calendar_days', identity);
    const days = this.getCalendarDays(identity);
    days[date] = data;
    safeSetItem(key, JSON.stringify(days));
  },

  saveCalendarDays(daysMap: Record<string, any>, identity?: StorageIdentity): void {
    const key = getScopedKey('calendar_days', identity);
    const current = this.getCalendarDays(identity);
    const updated = { ...current, ...daysMap };
    safeSetItem(key, JSON.stringify(updated));
  },

  deleteCalendarDay(date: string, identity?: StorageIdentity): void {
    const key = getScopedKey('calendar_days', identity);
    const current = this.getCalendarDays(identity);
    delete current[date];
    safeSetItem(key, JSON.stringify(current));
  },

  getTimeEntries(identity?: StorageIdentity): Record<string, any> {
    const target = identity || activeIdentity;
    const scopedKey = getScopedKey('time_entries', target);
    let raw = safeGetItem(scopedKey);
    if (!raw && target.scope === 'guest') {
      raw = safeGetItem(LEGACY_KEYS.TIME_ENTRIES);
    }
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

  saveTimeEntry(date: string, entry: any, identity?: StorageIdentity): void {
    const key = getScopedKey('time_entries', identity);
    const entries = this.getTimeEntries(identity);
    entries[date] = entry;
    safeSetItem(key, JSON.stringify(entries));
  },

  saveTimeEntries(entriesMap: Record<string, any>, identity?: StorageIdentity): void {
    const key = getScopedKey('time_entries', identity);
    const current = this.getTimeEntries(identity);
    const updated = { ...current, ...entriesMap };
    safeSetItem(key, JSON.stringify(updated));
  },

  deleteTimeEntry(date: string, identity?: StorageIdentity): void {
    const key = getScopedKey('time_entries', identity);
    const current = this.getTimeEntries(identity);
    delete current[date];
    safeSetItem(key, JSON.stringify(current));
  },

  getSupabaseConfig(): SupabaseConfig | null {
    const raw = safeGetItem(GLOBAL_KEYS.SUPABASE_CONFIG);
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
      safeRemoveItem(GLOBAL_KEYS.SUPABASE_CONFIG);
    } else {
      safeSetItem(GLOBAL_KEYS.SUPABASE_CONFIG, JSON.stringify(config));
    }
  },

  // --- Legacy Unowned Cache Migration & Explicit Recovery ---
  hasLegacyUnclaimedData(): boolean {
    const rawDays = safeGetItem(LEGACY_KEYS.CALENDAR_DAYS);
    const rawEntries = safeGetItem(LEGACY_KEYS.TIME_ENTRIES);
    const rawSettings = safeGetItem(LEGACY_KEYS.SETTINGS);
    return Boolean(
      (rawDays && rawDays !== '{}') ||
      (rawEntries && rawEntries !== '{}') ||
      rawSettings
    );
  },

  getLegacyUnclaimedData(): {
    days: Record<string, any>;
    timeEntries: Record<string, any>;
    settings: AppSettings;
  } {
    let days: Record<string, any> = {};
    let timeEntries: Record<string, any> = {};
    let settings: AppSettings = { ...DEFAULT_SETTINGS };

    const rawDays = safeGetItem(LEGACY_KEYS.CALENDAR_DAYS);
    if (rawDays) {
      try { days = JSON.parse(rawDays) || {}; } catch {}
    }
    const rawEntries = safeGetItem(LEGACY_KEYS.TIME_ENTRIES);
    if (rawEntries) {
      try { timeEntries = JSON.parse(rawEntries) || {}; } catch {}
    }
    const rawSettings = safeGetItem(LEGACY_KEYS.SETTINGS);
    if (rawSettings) {
      try { settings = { ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) }; } catch {}
    }

    return { days, timeEntries, settings };
  },

  importLegacyDataToActiveIdentity(): void {
    const legacy = this.getLegacyUnclaimedData();
    if (Object.keys(legacy.days).length > 0) {
      this.saveCalendarDays(legacy.days);
    }
    if (Object.keys(legacy.timeEntries).length > 0) {
      this.saveTimeEntries(legacy.timeEntries);
    }
    this.saveSettings(legacy.settings);
  },

  migrateLegacyDataToGuest(): void {
    // If guest has no data yet, populate guest with legacy data
    const guestDays = this.getCalendarDays({ scope: 'guest' });
    if (Object.keys(guestDays).length === 0 && this.hasLegacyUnclaimedData()) {
      const legacy = this.getLegacyUnclaimedData();
      this.saveCalendarDays(legacy.days, { scope: 'guest' });
      this.saveTimeEntries(legacy.timeEntries, { scope: 'guest' });
      this.saveSettings(legacy.settings, { scope: 'guest' });
    }
  },

  clearLegacyUnclaimedData(): void {
    safeRemoveItem(LEGACY_KEYS.SETTINGS);
    safeRemoveItem(LEGACY_KEYS.CALENDAR_DAYS);
    safeRemoveItem(LEGACY_KEYS.TIME_ENTRIES);
  },

  /**
   * Clears only user-specific data (calendar days and time punches) for the active identity,
   * preserving application settings and Supabase configuration.
   */
  clearUserData(identity?: StorageIdentity): void {
    safeRemoveItem(getScopedKey('calendar_days', identity));
    safeRemoveItem(getScopedKey('time_entries', identity));
    safeRemoveItem(getScopedKey('pending_mutations', identity));
  },

  // --- Identity-Scoped Outbox / Pending Mutations Queue ---
  getPendingMutations(identity?: StorageIdentity): PendingMutation[] {
    const key = getScopedKey('pending_mutations', identity);
    const raw = safeGetItem(key);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return [];
  },

  savePendingMutations(mutations: PendingMutation[], identity?: StorageIdentity): void {
    const key = getScopedKey('pending_mutations', identity);
    safeSetItem(key, JSON.stringify(mutations));
  },

  enqueuePendingMutation(mutation: PendingMutation, identity?: StorageIdentity): void {
    const current = this.getPendingMutations(identity);
    const existingIndex = current.findIndex(
      (m) => m.type === mutation.type && m.date === mutation.date
    );
    if (existingIndex >= 0) {
      current[existingIndex] = { ...current[existingIndex], ...mutation };
    } else {
      current.push(mutation);
    }
    this.savePendingMutations(current, identity);
  },

  removePendingMutation(id: string, identity?: StorageIdentity): void {
    const current = this.getPendingMutations(identity);
    const filtered = current.filter((m) => m.id !== id);
    this.savePendingMutations(filtered, identity);
  },

  clearPendingMutations(identity?: StorageIdentity): void {
    const key = getScopedKey('pending_mutations', identity);
    safeRemoveItem(key);
  },

  clearAll(identity?: StorageIdentity): void {
    safeRemoveItem(getScopedKey('settings', identity));
    safeRemoveItem(getScopedKey('calendar_days', identity));
    safeRemoveItem(getScopedKey('time_entries', identity));
    safeRemoveItem(getScopedKey('pending_mutations', identity));
    safeRemoveItem(GLOBAL_KEYS.SUPABASE_CONFIG);
    this.clearLegacyUnclaimedData();
    memoryStore.clear();
    currentPersistenceStatus = 'persisted';
  },
};
