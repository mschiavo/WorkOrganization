export type DayStatus =
  | 'presenza'
  | 'smart'
  | 'idea_smart'
  | 'ferie'
  | 'idea_ferie'
  | 'par'
  | 'idea_par'
  | 'chiusura'
  | 'non_lavorativo';

export interface CalendarDayInfo {
  date: string; // Formato "YYYY-MM-DD"
  status: DayStatus;
  notes?: string;
  isConfirmed?: boolean;
  updatedAt?: string;
}

export interface WeekValidationResult {
  weekNumber: number;
  startDate: string; // "YYYY-MM-DD" (Lunedì)
  endDate: string;   // "YYYY-MM-DD" (Domenica)
  presenceCount: number;
  smartCount: number; // smart + idea_smart
  ferieCount: number;
  closureCount: number;
  isCompliant: boolean;
  errorReason?: string;
}

export interface MonthValidationResult {
  year: number;
  month: number; // 1-12
  workingDaysCount: number;     // Feriali Lun-Ven esclusi festivi nazionali
  presenceDays: number;
  smartDoneDays: number;       // status === 'smart'
  smartPlannedDays: number;    // status === 'idea_smart'
  totalSmartDays: number;      // smartDoneDays + smartPlannedDays
  ferieDays: number;
  closureDays: number;
  unscheduledDaysCount: number; // Lavorativi feriali senza causale o non impostati
  smartStatus: 'OK' | 'INCOMPLETO' | 'ERRORE';
  weeks: WeekValidationResult[];
  isMonthFullyCompliant: boolean;
}

/**
 * Calculates Easter Sunday for a given year using Meeus/Jones/Butcher algorithm.
 */
function calculateEaster(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

/**
 * Formats year, month, day into "YYYY-MM-DD".
 */
function formatDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Formats a Date object in UTC as "YYYY-MM-DD".
 */
function formatDateUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  return formatDateString(y, m, day);
}

/**
 * Returns all 12 Italian national holidays for a given year sorted chronologically.
 */
export function getItalianHolidays(year: number): string[] {
  const holidays: string[] = [
    formatDateString(year, 1, 1),   // Capodanno
    formatDateString(year, 1, 6),   // Epifania
    formatDateString(year, 4, 25),  // Liberazione
    formatDateString(year, 5, 1),   // Festa del Lavoro
    formatDateString(year, 6, 2),   // Festa della Repubblica
    formatDateString(year, 8, 15),  // Ferragosto / Assunzione
    formatDateString(year, 11, 1),  // Tutti i Santi
    formatDateString(year, 12, 8),  // Immacolata Concezione
    formatDateString(year, 12, 25), // Natale
    formatDateString(year, 12, 26), // Santo Stefano
  ];

  // Mobile Easter and Pasquetta
  const easter = calculateEaster(year);
  const easterDate = new Date(Date.UTC(year, easter.month - 1, easter.day));
  holidays.push(formatDateUtc(easterDate));

  const pasquettaDate = new Date(Date.UTC(year, easter.month - 1, easter.day + 1));
  holidays.push(formatDateUtc(pasquettaDate));

  return holidays.sort();
}

/**
 * Checks whether a given "YYYY-MM-DD" date is an Italian national holiday.
 */
export function isItalianHoliday(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const year = Number(dateStr.slice(0, 4));
  if (Number.isNaN(year) || year <= 0) {
    return false;
  }
  const holidays = getItalianHolidays(year);
  return holidays.includes(dateStr);
}

/**
 * Checks whether a given date is a working day (Monday to Friday, non-holiday).
 */
export function isWorkingDay(dateStr: string): boolean {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const dayOfWeek = date.getUTCDay(); // 0 = Sun, 6 = Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }
  return !isItalianHoliday(dateStr);
}

/**
 * Computes ISO 8601 week number (1-53) for a given date.
 */
function getIsoWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  target.setUTCDate(target.getUTCDate() - dayNr + 3); // Thursday
  const thursdayYear = target.getUTCFullYear();
  const firstThursday = target.getTime();

  const jan4 = new Date(Date.UTC(thursdayYear, 0, 4));
  const jan4DayNr = (jan4.getUTCDay() + 6) % 7;
  const firstThursdayOfYear = new Date(Date.UTC(thursdayYear, 0, 4 - jan4DayNr + 3));

  return 1 + Math.round((firstThursday - firstThursdayOfYear.getTime()) / 604800000);
}

/**
 * Validates monthly smart working policy, weekly presences, and calendar completeness.
 */
export function validateMonthPolicy(
  year: number,
  month: number, // 1-12
  days: CalendarDayInfo[],
  maxSmartPerMonth = 10,
  minPresencePerWeek = 1,
  maxSmartPerWeek = 4
): MonthValidationResult {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const monthEndDateStr = formatDateString(year, month, daysInMonth);

  const dayMap = new Map<string, CalendarDayInfo>();
  for (const d of days) {
    dayMap.set(d.date, d);
  }

  // 1. Calculate month-level metrics
  let workingDaysCount = 0;
  let presenceDays = 0;
  let smartDoneDays = 0;
  let smartPlannedDays = 0;
  let ferieDays = 0;
  let closureDays = 0;
  let unscheduledDaysCount = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = formatDateString(year, month, day);
    const isWorking = isWorkingDay(dateStr);

    if (isWorking) {
      workingDaysCount++;
    }

    const dayInfo = dayMap.get(dateStr);
    const status = dayInfo?.status;

    if (status === 'presenza') {
      presenceDays++;
    } else if (status === 'smart') {
      smartDoneDays++;
    } else if (status === 'idea_smart') {
      smartPlannedDays++;
    } else if (status === 'ferie' || status === 'idea_ferie') {
      ferieDays++;
    } else if (status === 'chiusura') {
      closureDays++;
    }

    if (isWorking && (!status || status === 'non_lavorativo')) {
      unscheduledDaysCount++;
    }
  }

  const totalSmartDays = smartDoneDays + smartPlannedDays;

  let smartStatus: 'OK' | 'INCOMPLETO' | 'ERRORE';
  if (totalSmartDays === maxSmartPerMonth) {
    smartStatus = 'OK';
  } else if (totalSmartDays < maxSmartPerMonth) {
    smartStatus = 'INCOMPLETO';
  } else {
    smartStatus = 'ERRORE';
  }

  // 2. Weekly evaluation (Monday to Sunday)
  const firstDayOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const firstDayOfWeek = firstDayOfMonth.getUTCDay();
  const diffToMon = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const currentMonday = new Date(Date.UTC(year, month - 1, 1 - diffToMon));

  const weeks: WeekValidationResult[] = [];

  while (formatDateUtc(currentMonday) <= monthEndDateStr) {
    const mondayStr = formatDateUtc(currentMonday);
    const sundayDate = new Date(currentMonday.getTime() + 6 * 86400000);
    const sundayStr = formatDateUtc(sundayDate);
    const weekNumber = getIsoWeekNumber(currentMonday);

    let weekPresence = 0;
    let weekSmart = 0;
    let weekFerie = 0;
    let weekClosure = 0;

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentMonday.getTime() + i * 86400000);
      const dayStr = formatDateUtc(dayDate);
      const dayInfo = dayMap.get(dayStr);

      if (dayInfo) {
        if (dayInfo.status === 'presenza') {
          weekPresence++;
        } else if (dayInfo.status === 'smart' || dayInfo.status === 'idea_smart') {
          weekSmart++;
        } else if (dayInfo.status === 'ferie' || dayInfo.status === 'idea_ferie') {
          weekFerie++;
        } else if (dayInfo.status === 'chiusura') {
          weekClosure++;
        }
      }
    }

          // Determine if presence is required for this week
          let isPresenceRequired = false;
          if (weekSmart > 0) {
          isPresenceRequired = true;
          } else {
          let allWeekdaysCovered = true;
          for (let i = 0; i < 5; i++) {
          const dayDate = new Date(currentMonday.getTime() + i * 86400000);
          const dayStr = formatDateUtc(dayDate);
          const isHoliday = isItalianHoliday(dayStr);
          const dayInfo = dayMap.get(dayStr);
          const isCoveredNonWorking =
            dayInfo?.status === 'ferie' ||
            dayInfo?.status === 'idea_ferie' ||
            dayInfo?.status === 'par' ||
            dayInfo?.status === 'idea_par' ||
            dayInfo?.status === 'chiusura';

        // Check if day is outside the target month
        const isOutsideMonth = dayDate.getUTCFullYear() !== year || dayDate.getUTCMonth() + 1 !== month;
        const isUnscheduledOutside = isOutsideMonth && (!dayInfo || dayInfo.status === 'non_lavorativo');

        if (!isHoliday && !isCoveredNonWorking && !isUnscheduledOutside) {
          allWeekdaysCovered = false;
          break;
        }
      }
      isPresenceRequired = !allWeekdaysCovered;
    }

    let isCompliant = true;
    let errorReason: string | undefined;

    if (weekSmart > maxSmartPerWeek) {
      isCompliant = false;
      errorReason = `Superato massimo ${maxSmartPerWeek} smart`;
    } else if (isPresenceRequired && weekPresence < minPresencePerWeek) {
      isCompliant = false;
      errorReason = 'Manca presenza obbligatoria';
    }

    weeks.push({
      weekNumber,
      startDate: mondayStr,
      endDate: sundayStr,
      presenceCount: weekPresence,
      smartCount: weekSmart,
      ferieCount: weekFerie,
      closureCount: weekClosure,
      isCompliant,
      errorReason,
    });

    currentMonday.setUTCDate(currentMonday.getUTCDate() + 7);
  }

  const isMonthFullyCompliant =
    smartStatus === 'OK' &&
    weeks.every((w) => w.isCompliant) &&
    unscheduledDaysCount === 0;

  return {
    year,
    month,
    workingDaysCount,
    presenceDays,
    smartDoneDays,
    smartPlannedDays,
    totalSmartDays,
    ferieDays,
    closureDays,
    unscheduledDaysCount,
    smartStatus,
    weeks,
    isMonthFullyCompliant,
  };
}
