import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../services/supabase/authContext';
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
  MealVoucherSummary,
  calculateMealVouchers,
} from '../core/domain/mealVouchersLedger';
import { calculateDailyTime } from '../core/domain/timeCalculator';
import {
  LeaveBalanceSummary,
  calculateAnnualLeaveBalance,
} from '../core/domain/leaveManager';
import { AppSettings, DEFAULT_SETTINGS } from '../services/storage/localCache';

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
  mealVouchers: MealVoucherSummary;
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
  const { user } = useAuth();
  const today = new Date();

  const [currentYear, setCurrentYear] = useState<number>(initialYear ?? today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(initialMonth ?? today.getMonth() + 1);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());

  const [days, setDays] = useState<Record<string, CalendarDayInfo>>({});
  const [timeEntries, setTimeEntries] = useState<Record<string, StoredTimeEntry>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await workDataService.loadMonthData(currentYear, currentMonth, user?.id);
      setDays(data.days);
      setTimeEntries(data.timeEntries);
      setSettings(data.settings);
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setDays({});
      setTimeEntries({});
    }
    loadData();
  }, [loadData, user?.id]);

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
      const updatedDay = await workDataService.saveDayStatus(date, status, notes, user?.id);
      setDays((prev) => ({ ...prev, [date]: updatedDay }));
    },
    [user?.id]
  );

  const updateTimeEntry = useCallback(
    async (date: string, entry: Partial<StoredTimeEntry>) => {
      const result = await workDataService.saveTimeEntry(date, entry, user?.id);
      setTimeEntries((prev) => ({ ...prev, [date]: result.timeEntry }));
      if (result.syncedDay) {
        setDays((prev) => ({ ...prev, [date]: result.syncedDay! }));
      }
    },
    [user?.id]
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<AppSettings>) => {
      const merged = await workDataService.saveSettings(newSettings, user?.id);
      setSettings(merged);
    },
    [user?.id]
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

  // Computed: Meal Vouchers
  const mealVouchers: MealVoucherSummary = useMemo(() => {
    const paddedMonth = String(currentMonth).padStart(2, '0');
    const monthPrefix = `${currentYear}-${paddedMonth}`;

    let canteenCount = 0;
    let smartCount = 0;

    for (const [dateStr, day] of Object.entries(days)) {
      if (dateStr.startsWith(monthPrefix)) {
        if (day.status === 'smart') {
          smartCount++;
        }
      }
    }

    for (const [dateStr, entry] of Object.entries(timeEntries)) {
      if (dateStr.startsWith(monthPrefix)) {
        if (entry.canteenUsed) {
          canteenCount++;
        }
      }
    }

    return calculateMealVouchers(
      canteenCount,
      smartCount,
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
        refreshData: loadData,
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
