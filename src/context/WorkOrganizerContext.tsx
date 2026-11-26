import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth, GUEST_USER } from '../services/supabase/authContext';
import {
  workDataService,
  StoredTimeEntry,
} from '../services/repository/workDataService';
import {
  CalendarDayInfo,
  DayStatus,
  MonthValidationResult,
  validateMonthPolicy,
} from '../core/domain/policyValidator';
import {
  QuarterSummary,
  getQuarterForMonth,
  calculateQuarterBalance,
} from '../core/domain/bancaOreManager';
import {
  QuarterlyMealVoucherSummary,
  calculateQuarterlyMealVouchers,
} from '../core/domain/mealVouchersLedger';
import { calculateDailyTime } from '../core/domain/timeCalculator';
import {
  LeaveBalanceSummary,
  calculateAnnualLeaveBalance,
} from '../core/domain/leaveManager';
import { AppSettings, localCache, StorageIdentity, extractProjectRef } from '../services/storage/localCache';

export interface WorkOrganizerContextType {
  currentYear: number;
  currentMonth: number; // 1-12
  selectedDate: string; // "YYYY-MM-DD"
  days: Record<string, CalendarDayInfo>;
  timeEntries: Record<string, StoredTimeEntry>;
  settings: AppSettings;
  loading: boolean;

  setMonth: (year: number, month: number) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  setSelectedDate: (date: string) => void;

  updateDayStatus: (date: string, status: DayStatus, notes?: string) => Promise<void>;
  updateTimeEntry: (date: string, entry: Partial<StoredTimeEntry>) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  refreshData: () => Promise<void>;

  monthValidation: MonthValidationResult;
  quarterSummary: QuarterSummary;
  mealVouchers: QuarterlyMealVoucherSummary;
  leaveBalance: LeaveBalanceSummary;
}

const WorkOrganizerContext = createContext<WorkOrganizerContextType | undefined>(undefined);

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export const WorkOrganizerProvider: React.FC<{
  children: React.ReactNode;
  initialYear?: number;
  initialMonth?: number;
}> = ({ children, initialYear, initialMonth }) => {
  const { user, isGuest, activeIdentity: authIdentity } = useAuth();
  const today = new Date();

  const [currentYear, setCurrentYear] = useState<number>(initialYear ?? today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth ?? today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  // Determine active storage identity
  const activeIdentity: StorageIdentity = useMemo(() => {
    if (authIdentity) return authIdentity;
    if (user && !isGuest && user.id !== GUEST_USER.id) {
      const config = localCache.getSupabaseConfig();
      const projectRef = extractProjectRef(config?.url || (import.meta.env.VITE_SUPABASE_URL as string));
      return { scope: 'cloud', userId: user.id, projectRef };
    }
    return { scope: 'guest' };
  }, [authIdentity, user, isGuest]);

  // Synchronous initial state from the active identity's storage
  const [days, setDays] = useState<Record<string, CalendarDayInfo>>(() => localCache.getCalendarDays(activeIdentity));
  const [timeEntries, setTimeEntries] = useState<Record<string, StoredTimeEntry>>(() => localCache.getTimeEntries(activeIdentity));
  const [settings, setSettings] = useState<AppSettings>(() => localCache.getSettings(activeIdentity));
  const [loading, setLoading] = useState<boolean>(true);

  // Invalidation token for dropping obsolete in-flight asynchronous responses across identity switches
  const sessionTokenRef = useRef<number>(0);

  // Identity and year synchronization
  useEffect(() => {
    sessionTokenRef.current += 1;
    const currentSession = sessionTokenRef.current;

    // 1. Immediately reset state to the active identity's cache
    localCache.setActiveIdentity(activeIdentity);
    setDays(localCache.getCalendarDays(activeIdentity));
    setTimeEntries(localCache.getTimeEntries(activeIdentity));
    setSettings(localCache.getSettings(activeIdentity));

    // 2. Load settings for the active identity
    workDataService.loadSettings(activeIdentity.userId, activeIdentity).then((loadedSettings) => {
      if (sessionTokenRef.current === currentSession) {
        setSettings(loadedSettings);
      }
    });

    // 3. Load year data for the active identity
    setLoading(true);
    workDataService
      .loadMonthData(currentYear, currentMonth, activeIdentity.userId, activeIdentity)
      .then((data) => {
        if (sessionTokenRef.current === currentSession) {
          setDays(data.days);
          setTimeEntries(data.timeEntries);
          setLoading(false);
        }
      })
      .catch(() => {
        if (sessionTokenRef.current === currentSession) {
          setLoading(false);
        }
      });
  }, [activeIdentity.scope, activeIdentity.userId, activeIdentity.projectRef, currentYear, currentMonth]);

  const refreshData = useCallback(async () => {
    const s = await workDataService.loadSettings(activeIdentity.userId, activeIdentity);
    setSettings(s);
    const data = await workDataService.loadMonthData(currentYear, currentMonth, activeIdentity.userId, activeIdentity);
    setDays(data.days);
    setTimeEntries(data.timeEntries);
  }, [activeIdentity, currentYear, currentMonth]);

  const setMonth = useCallback((year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
    const padded = String(month).padStart(2, '0');
    setSelectedDate(`${year}-${padded}-01`);
  }, []);

  const goToPrevMonth = useCallback(() => {
    if (currentMonth === 1) {
      setMonth(currentYear - 1, 12);
    } else {
      setMonth(currentYear, currentMonth - 1);
    }
  }, [currentYear, currentMonth, setMonth]);

  const goToNextMonth = useCallback(() => {
    if (currentMonth === 12) {
      setMonth(currentYear + 1, 1);
    } else {
      setMonth(currentYear, currentMonth + 1);
    }
  }, [currentYear, currentMonth, setMonth]);

  const goToToday = useCallback(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    setCurrentYear(y);
    setCurrentMonth(m);
    setSelectedDate(getTodayString());
  }, []);

  const updateDayStatus = useCallback(
    async (date: string, status: DayStatus, notes?: string) => {
      const updatedDay = await workDataService.saveDayStatus(date, status, notes, activeIdentity.userId, activeIdentity);
      setDays((prev) => ({ ...prev, [date]: updatedDay }));
    },
    [activeIdentity]
  );

  const updateTimeEntry = useCallback(
    async (date: string, entry: Partial<StoredTimeEntry>) => {
      const result = await workDataService.saveTimeEntry(date, entry, activeIdentity.userId, activeIdentity);
      setTimeEntries((prev) => ({ ...prev, [date]: result.timeEntry }));
      if (result.syncedDay) {
        setDays((prev) => ({ ...prev, [date]: result.syncedDay! }));
      }
    },
    [activeIdentity]
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>) => {
      const merged = await workDataService.saveSettings(newSettings, activeIdentity.userId, activeIdentity);
      setSettings(merged);
    },
    [activeIdentity]
  );

  // Computed: Month Policy Validation
  const monthValidation: MonthValidationResult = useMemo(() => {
    const daysList = Object.values(days);
    return validateMonthPolicy(
      currentYear,
      currentMonth,
      daysList,
      settings.maxSmartDaysMonth,
      settings.minPresenceDaysWeek,
      settings.maxSmartDaysWeek
    );
  }, [currentYear, currentMonth, days, settings]);

  // Computed: Quarter Summary (Banca Ore)
  const quarterSummary: QuarterSummary = useMemo(() => {
    const qInfo = getQuarterForMonth(currentYear, currentMonth);
    const monthDeltas: { month: number; deltaMinutes: number }[] = [];

    for (let m = qInfo.startMonth; m <= qInfo.endMonth; m++) {
      let monthTotalDelta = 0;
      const paddedM = String(m).padStart(2, '0');
      const prefix = `${currentYear}-${paddedM}`;

      for (const [dateStr, entry] of Object.entries(timeEntries)) {
        if (dateStr.startsWith(prefix)) {
          const calc = calculateDailyTime(entry, settings.minLunchBreakMinutes);
          monthTotalDelta += calc.deltaMinutes;
        }
      }

      monthDeltas.push({ month: m, deltaMinutes: monthTotalDelta });
    }

    return calculateQuarterBalance(currentYear, qInfo.quarterNumber, monthDeltas);
  }, [currentYear, currentMonth, timeEntries, settings.minLunchBreakMinutes]);

  // Computed: Meal Vouchers (Quarterly)
  const mealVouchers: QuarterlyMealVoucherSummary = useMemo(() => {
    const qInfo = getQuarterForMonth(currentYear, currentMonth);
    return calculateQuarterlyMealVouchers(
      currentYear,
      qInfo.quarterNumber,
      days,
      timeEntries,
      settings.canteenVoucherCost,
      settings.smartVoucherValue
    );
  }, [currentYear, currentMonth, days, timeEntries, settings.canteenVoucherCost, settings.smartVoucherValue]);

  // Computed: Annual Leave & PAR Balance
  const leaveBalance: LeaveBalanceSummary = useMemo(() => {
    return calculateAnnualLeaveBalance(
      currentYear,
      days,
      timeEntries,
      {
        yearlyFerieHours: settings.yearlyFerieHours,
        prevYearFerieResidualHours: settings.prevYearFerieResidualHours,
        yearlyParHours: settings.yearlyParHours,
        prevYearParResidualHours: settings.prevYearParResidualHours,
      },
      settings.standardDayHours
    );
  }, [currentYear, days, timeEntries, settings]);

  return (
    <WorkOrganizerContext.Provider
      value={{
        currentYear,
        currentMonth,
        selectedDate,
        days,
        timeEntries,
        settings,
        loading,
        setMonth,
        goToPrevMonth,
        goToNextMonth,
        goToToday,
        setSelectedDate,
        updateDayStatus,
        updateTimeEntry,
        updateSettings,
        refreshData,
        monthValidation,
        quarterSummary,
        mealVouchers,
        leaveBalance,
      }}
    >
      {children}
    </WorkOrganizerContext.Provider>
  );
};

export function useWorkOrganizer(): WorkOrganizerContextType {
  const context = useContext(WorkOrganizerContext);
  if (!context) {
    throw new Error('useWorkOrganizer must be used within a WorkOrganizerProvider');
  }
  return context;
}
