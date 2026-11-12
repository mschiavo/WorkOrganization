import { describe, it, expect } from 'vitest';
import {
  isItalianHoliday,
  getItalianHolidays,
  isWorkingDay,
  validateMonthPolicy,
  type CalendarDayInfo,
  type DayStatus,
} from './policyValidator';

describe('PolicyValidator Domain Service', () => {
  describe('Italian Holidays (getItalianHolidays & isItalianHoliday)', () => {
    it('returns all 12 Italian national holidays sorted for 2026', () => {
      const holidays2026 = getItalianHolidays(2026);
      expect(holidays2026).toHaveLength(12);

      // Verify all fixed holidays are present
      expect(holidays2026).toContain('2026-01-01'); // Capodanno
      expect(holidays2026).toContain('2026-01-06'); // Epifania
      expect(holidays2026).toContain('2026-04-25'); // Liberazione
      expect(holidays2026).toContain('2026-05-01'); // Festa del Lavoro
      expect(holidays2026).toContain('2026-06-02'); // Festa della Repubblica
      expect(holidays2026).toContain('2026-08-15'); // Ferragosto
      expect(holidays2026).toContain('2026-11-01'); // Tutti i Santi
      expect(holidays2026).toContain('2026-12-08'); // Immacolata
      expect(holidays2026).toContain('2026-12-25'); // Natale
      expect(holidays2026).toContain('2026-12-26'); // Santo Stefano

      // Easter 2026: April 5, Pasquetta: April 6
      expect(holidays2026).toContain('2026-04-05');
      expect(holidays2026).toContain('2026-04-06');

      // Verify array is sorted chronologically
      const sorted = [...holidays2026].sort();
      expect(holidays2026).toEqual(sorted);
    });

    it('computes mobile Easter and Pasquetta dates correctly across different years', () => {
      // 2025: Pasqua = 2025-04-20, Pasquetta = 2025-04-21
      expect(isItalianHoliday('2025-04-20')).toBe(true);
      expect(isItalianHoliday('2025-04-21')).toBe(true);
      expect(isItalianHoliday('2025-04-19')).toBe(false);

      // 2024: Pasqua = 2024-03-31, Pasquetta = 2024-04-01
      expect(isItalianHoliday('2024-03-31')).toBe(true);
      expect(isItalianHoliday('2024-04-01')).toBe(true);

      // 2027: Pasqua = 2027-03-28, Pasquetta = 2027-03-29
      expect(isItalianHoliday('2027-03-28')).toBe(true);
      expect(isItalianHoliday('2027-03-29')).toBe(true);
    });

    it('identifies fixed Italian holidays and returns false for regular days', () => {
      expect(isItalianHoliday('2026-01-01')).toBe(true);
      expect(isItalianHoliday('2026-01-02')).toBe(false);
      expect(isItalianHoliday('2026-08-15')).toBe(true);
      expect(isItalianHoliday('2026-08-14')).toBe(false);
      expect(isItalianHoliday('2026-11-01')).toBe(true);
      expect(isItalianHoliday('2026-11-02')).toBe(false);
    });

    it('returns false for invalid date strings', () => {
      expect(isItalianHoliday('')).toBe(false);
      expect(isItalianHoliday('invalid')).toBe(false);
    });
  });

  describe('isWorkingDay', () => {
    it('returns true for standard Monday-Friday non-holiday working days', () => {
      expect(isWorkingDay('2026-01-02')).toBe(true); // Friday
      expect(isWorkingDay('2026-01-05')).toBe(true); // Monday
      expect(isWorkingDay('2026-04-07')).toBe(true); // Tuesday after Easter
      expect(isWorkingDay('2026-11-02')).toBe(true); // Monday
    });

    it('returns false for Saturdays and Sundays', () => {
      expect(isWorkingDay('2026-01-03')).toBe(false); // Saturday
      expect(isWorkingDay('2026-01-04')).toBe(false); // Sunday
      expect(isWorkingDay('2026-11-07')).toBe(false); // Saturday
      expect(isWorkingDay('2026-11-08')).toBe(false); // Sunday
    });

    it('returns false for national holidays falling on weekdays', () => {
      expect(isWorkingDay('2026-01-01')).toBe(false); // Thursday (Capodanno)
      expect(isWorkingDay('2026-01-06')).toBe(false); // Tuesday (Epifania)
      expect(isWorkingDay('2026-04-06')).toBe(false); // Monday (Pasquetta)
      expect(isWorkingDay('2026-05-01')).toBe(false); // Friday (Festa del Lavoro)
      expect(isWorkingDay('2026-06-02')).toBe(false); // Tuesday (Festa della Repubblica)
      expect(isWorkingDay('2026-12-08')).toBe(false); // Tuesday (Immacolata)
      expect(isWorkingDay('2026-12-25')).toBe(false); // Friday (Natale)
    });

    it('returns false for invalid dates', () => {
      expect(isWorkingDay('')).toBe(false);
      expect(isWorkingDay('not-a-date')).toBe(false);
    });
  });

  describe('validateMonthPolicy - Monthly Smart Target', () => {
    // Helper to generate calendar days for a month
    const createMonthDays = (
      year: number,
      month: number,
      overrides: Record<string, DayStatus>
    ): CalendarDayInfo[] => {
      const daysCount = new Date(Date.UTC(year, month, 0)).getUTCDate();
      const result: CalendarDayInfo[] = [];

      for (let day = 1; day <= daysCount; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const status: DayStatus = overrides[dateStr] ?? (isWorkingDay(dateStr) ? 'presenza' : 'non_lavorativo');
        result.push({ date: dateStr, status });
      }
      return result;
    };

    it('sets smartStatus to "OK" when smart + idea_smart equals exactly 10', () => {
      // November 2026 has 21 working days. Assign 6 smart, 4 idea_smart, 11 presenza.
      const smartDates = [
        '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
        '2026-11-10', '2026-11-11'
      ];
      const ideaDates = [
        '2026-11-17', '2026-11-18', '2026-11-24', '2026-11-25'
      ];

      const overrides: Record<string, DayStatus> = {};
      smartDates.forEach(d => { overrides[d] = 'smart'; });
      ideaDates.forEach(d => { overrides[d] = 'idea_smart'; });

      const days = createMonthDays(2026, 11, overrides);
      const res = validateMonthPolicy(2026, 11, days);

      expect(res.smartDoneDays).toBe(6);
      expect(res.smartPlannedDays).toBe(4);
      expect(res.totalSmartDays).toBe(10);
      expect(res.smartStatus).toBe('OK');
    });

    it('sets smartStatus to "INCOMPLETO" when total smart days are less than 10', () => {
      const smartDates = [
        '2026-11-03', '2026-11-04', '2026-11-10', '2026-11-11',
        '2026-11-17', '2026-11-18', '2026-11-24', '2026-11-25'
      ]; // 8 smart days total

      const overrides: Record<string, DayStatus> = {};
      smartDates.forEach(d => { overrides[d] = 'smart'; });

      const days = createMonthDays(2026, 11, overrides);
      const res = validateMonthPolicy(2026, 11, days);

      expect(res.totalSmartDays).toBe(8);
      expect(res.smartStatus).toBe('INCOMPLETO');
      expect(res.isMonthFullyCompliant).toBe(false);
    });

    it('sets smartStatus to "ERRORE" when total smart days exceed 10', () => {
      const smartDates = [
        '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06',
        '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13',
        '2026-11-17', '2026-11-18', '2026-11-24', '2026-11-25'
      ]; // 12 smart days

      const overrides: Record<string, DayStatus> = {};
      smartDates.forEach(d => { overrides[d] = 'smart'; });

      const days = createMonthDays(2026, 11, overrides);
      const res = validateMonthPolicy(2026, 11, days);

      expect(res.totalSmartDays).toBe(12);
      expect(res.smartStatus).toBe('ERRORE');
      expect(res.isMonthFullyCompliant).toBe(false);
    });

    it('respects a custom maxSmartPerMonth parameter', () => {
      const smartDates = ['2026-11-03', '2026-11-04', '2026-11-10', '2026-11-11', '2026-11-17', '2026-11-18', '2026-11-24', '2026-11-25'];
      const overrides: Record<string, DayStatus> = {};
      smartDates.forEach(d => { overrides[d] = 'smart'; });

      const days = createMonthDays(2026, 11, overrides);
      // With maxSmartPerMonth = 8, 8 days should be OK
      const res = validateMonthPolicy(2026, 11, days, 8);
      expect(res.smartStatus).toBe('OK');
    });
  });

  describe('validateMonthPolicy - Working Days and Unscheduled Days Calculation', () => {
    it('computes correct workingDaysCount for months with holidays', () => {
      // January 2026: 31 days. Weekends: 9 days (3,4, 10,11, 17,18, 24,25, 31).
      // Holidays on weekdays: 2026-01-01 (Thu), 2026-01-06 (Tue).
      // Working days = 31 - 9 - 2 = 20.
      const res = validateMonthPolicy(2026, 1, []);
      expect(res.workingDaysCount).toBe(20);
    });

    it('calculates unscheduledDaysCount when working days have no record or improper non_lavorativo', () => {
      // In November 2026 (21 working days), pass only 18 days with valid status
      // Nov 2, 3, 4 are either missing or marked non_lavorativo
      const days: CalendarDayInfo[] = [
        { date: '2026-11-02', status: 'non_lavorativo' }, // improper non_lavorativo on Monday
        // 2026-11-03 missing entirely
        // 2026-11-04 missing entirely
      ];

      // Fill remaining 18 working days with 'presenza'
      const allDays = new Date(Date.UTC(2026, 11, 0)).getUTCDate();
      for (let d = 5; d <= allDays; d++) {
        const dateStr = `2026-11-${String(d).padStart(2, '0')}`;
        if (isWorkingDay(dateStr)) {
          days.push({ date: dateStr, status: 'presenza' });
        }
      }

      const res = validateMonthPolicy(2026, 11, days);
      expect(res.workingDaysCount).toBe(21);
      expect(res.unscheduledDaysCount).toBe(3);
      expect(res.isMonthFullyCompliant).toBe(false);
    });

    it('unscheduledDaysCount is 0 when all working days of the month have valid presence/smart/ferie/chiusura', () => {
      const days: CalendarDayInfo[] = [];
      const allDays = new Date(Date.UTC(2026, 11, 0)).getUTCDate();
      for (let d = 1; d <= allDays; d++) {
        const dateStr = `2026-11-${String(d).padStart(2, '0')}`;
        if (isWorkingDay(dateStr)) {
          days.push({ date: dateStr, status: 'presenza' });
        }
      }

      const res = validateMonthPolicy(2026, 11, days);
      expect(res.unscheduledDaysCount).toBe(0);
    });
  });

  describe('validateMonthPolicy - Weekly Rules (minPresencePerWeek and maxSmartPerWeek)', () => {
    it('validates a compliant week with 1 presenza and 4 smart', () => {
      // Week: 2026-11-02 (Mon) to 2026-11-08 (Sun)
      const days: CalendarDayInfo[] = [
        { date: '2026-11-02', status: 'presenza' },
        { date: '2026-11-03', status: 'smart' },
        { date: '2026-11-04', status: 'smart' },
        { date: '2026-11-05', status: 'smart' },
        { date: '2026-11-06', status: 'smart' },
      ];

      const res = validateMonthPolicy(2026, 11, days);
      const week = res.weeks.find(w => w.startDate === '2026-11-02');

      expect(week).toBeDefined();
      expect(week?.presenceCount).toBe(1);
      expect(week?.smartCount).toBe(4);
      expect(week?.isCompliant).toBe(true);
      expect(week?.errorReason).toBeUndefined();
    });

    it('marks week non-compliant when presence is 0 and smart is 4 ("Manca presenza obbligatoria")', () => {
      const days: CalendarDayInfo[] = [
        { date: '2026-11-02', status: 'ferie' },
        { date: '2026-11-03', status: 'smart' },
        { date: '2026-11-04', status: 'smart' },
        { date: '2026-11-05', status: 'smart' },
        { date: '2026-11-06', status: 'smart' },
      ];

      const res = validateMonthPolicy(2026, 11, days);
      const week = res.weeks.find(w => w.startDate === '2026-11-02');

      expect(week).toBeDefined();
      expect(week?.presenceCount).toBe(0);
      expect(week?.smartCount).toBe(4);
      expect(week?.ferieCount).toBe(1);
      expect(week?.isCompliant).toBe(false);
      expect(week?.errorReason).toBe('Manca presenza obbligatoria');
    });

    it('marks week non-compliant when smart exceeds maxSmartPerWeek (5 smart) ("Superato massimo 4 smart")', () => {
      const days: CalendarDayInfo[] = [
        { date: '2026-11-02', status: 'smart' },
        { date: '2026-11-03', status: 'smart' },
        { date: '2026-11-04', status: 'smart' },
        { date: '2026-11-05', status: 'smart' },
        { date: '2026-11-06', status: 'smart' },
      ];

      const res = validateMonthPolicy(2026, 11, days);
      const week = res.weeks.find(w => w.startDate === '2026-11-02');

      expect(week).toBeDefined();
      expect(week?.smartCount).toBe(5);
      expect(week?.isCompliant).toBe(false);
      expect(week?.errorReason).toBe('Superato massimo 4 smart');
    });

    it('enforces that ferie does not compensate mandatory presence when smart days are worked', () => {
      // 4 smart + 1 ferie + 0 presenze -> Non Compliant
      const days: CalendarDayInfo[] = [
        { date: '2026-11-02', status: 'ferie' },
        { date: '2026-11-03', status: 'smart' },
        { date: '2026-11-04', status: 'smart' },
        { date: '2026-11-05', status: 'smart' },
        { date: '2026-11-06', status: 'idea_smart' },
      ];

      const res = validateMonthPolicy(2026, 11, days);
      const week = res.weeks.find(w => w.startDate === '2026-11-02');

      expect(week?.smartCount).toBe(4);
      expect(week?.presenceCount).toBe(0);
      expect(week?.isCompliant).toBe(false);
      expect(week?.errorReason).toBe('Manca presenza obbligatoria');
    });

    it('allows a full week of ferie or closures without presence (All-vacation week exception)', () => {
      // 5 days of ferie, 0 smart -> Compliant (no work done, no mandatory presence needed)
      const days: CalendarDayInfo[] = [
        { date: '2026-11-02', status: 'ferie' },
        { date: '2026-11-03', status: 'ferie' },
        { date: '2026-11-04', status: 'ferie' },
        { date: '2026-11-05', status: 'ferie' },
        { date: '2026-11-06', status: 'chiusura' },
      ];

      const res = validateMonthPolicy(2026, 11, days);
      const week = res.weeks.find(w => w.startDate === '2026-11-02');

      expect(week?.ferieCount).toBe(4);
      expect(week?.closureCount).toBe(1);
      expect(week?.smartCount).toBe(0);
      expect(week?.presenceCount).toBe(0);
      expect(week?.isCompliant).toBe(true);
      expect(week?.errorReason).toBeUndefined();
    });

    it('allows an all-holiday/vacation week without presence (e.g. Pasquetta week with 4 ferie and 1 holiday)', () => {
      // Week of Easter Monday 2026: 2026-04-06 (Pasquetta holiday), 2026-04-07..10 (ferie)
      const days: CalendarDayInfo[] = [
        { date: '2026-04-07', status: 'ferie' },
        { date: '2026-04-08', status: 'ferie' },
        { date: '2026-04-09', status: 'ferie' },
        { date: '2026-04-10', status: 'ferie' },
      ];

      const res = validateMonthPolicy(2026, 4, days);
      const week = res.weeks.find(w => w.startDate === '2026-04-06');

      expect(week?.presenceCount).toBe(0);
      expect(week?.smartCount).toBe(0);
      expect(week?.ferieCount).toBe(4);
      expect(week?.isCompliant).toBe(true);
    });

    it('requires presence if even 1 day of smart is worked during a mostly-vacation week', () => {
      // 1 smart + 4 ferie + 0 presenze -> Non Compliant
      const days: CalendarDayInfo[] = [
        { date: '2026-11-02', status: 'ferie' },
        { date: '2026-11-03', status: 'ferie' },
        { date: '2026-11-04', status: 'ferie' },
        { date: '2026-11-05', status: 'ferie' },
        { date: '2026-11-06', status: 'smart' },
      ];

      const res = validateMonthPolicy(2026, 11, days);
      const week = res.weeks.find(w => w.startDate === '2026-11-02');

      expect(week?.smartCount).toBe(1);
      expect(week?.presenceCount).toBe(0);
      expect(week?.isCompliant).toBe(false);
      expect(week?.errorReason).toBe('Manca presenza obbligatoria');
    });

    it('respects custom minPresencePerWeek and maxSmartPerWeek parameters', () => {
      const days: CalendarDayInfo[] = [
        { date: '2026-11-02', status: 'presenza' },
        { date: '2026-11-03', status: 'smart' },
        { date: '2026-11-04', status: 'smart' },
        { date: '2026-11-05', status: 'smart' },
        { date: '2026-11-06', status: 'presenza' },
      ];

      // Custom rule: minPresence = 3, maxSmart = 2
      const res = validateMonthPolicy(2026, 11, days, 10, 3, 2);
      const week = res.weeks.find(w => w.startDate === '2026-11-02');

      // smartCount is 3, which exceeds maxSmart 2
      expect(week?.isCompliant).toBe(false);
      expect(week?.errorReason).toBe('Superato massimo 2 smart');
    });
  });

  describe('validateMonthPolicy - Boundary Weeks (Settimana a cavallo di mese)', () => {
    it('evaluates boundary week at beginning of month using adjacent month days passed in days', () => {
      // Nov 2026: 2026-11-01 is Sunday.
      // Week 44 starts Monday 2026-10-26 and ends Sunday 2026-11-01.
      // October days passed in days: Oct 26 (presenza), Oct 27-30 (smart)
      const days: CalendarDayInfo[] = [
        { date: '2026-10-26', status: 'presenza' },
        { date: '2026-10-27', status: 'smart' },
        { date: '2026-10-28', status: 'smart' },
        { date: '2026-10-29', status: 'smart' },
        { date: '2026-10-30', status: 'smart' },
        { date: '2026-11-01', status: 'non_lavorativo' }, // Sunday
      ];

      const res = validateMonthPolicy(2026, 11, days);
      const week44 = res.weeks.find(w => w.startDate === '2026-10-26');

      expect(week44).toBeDefined();
      expect(week44?.presenceCount).toBe(1);
      expect(week44?.smartCount).toBe(4);
      expect(week44?.isCompliant).toBe(true);

      // Verify October days are NOT counted in November's monthly statistics
      expect(res.presenceDays).toBe(0);
      expect(res.smartDoneDays).toBe(0);
    });

    it('evaluates boundary week at end of month using following month days passed in days', () => {
      // Nov 2026: 2026-11-30 is Monday.
      // Week 49 starts Monday 2026-11-30 and ends Sunday 2026-12-06.
      // Nov 30 is smart, Dec 1 is presenza (passed in days), Dec 2-4 smart
      const days: CalendarDayInfo[] = [
        { date: '2026-11-30', status: 'smart' },
        { date: '2026-12-01', status: 'presenza' },
        { date: '2026-12-02', status: 'smart' },
        { date: '2026-12-03', status: 'smart' },
        { date: '2026-12-04', status: 'smart' },
      ];

      const res = validateMonthPolicy(2026, 11, days);
      const week49 = res.weeks.find(w => w.startDate === '2026-11-30');

      expect(week49).toBeDefined();
      expect(week49?.presenceCount).toBe(1);
      expect(week49?.smartCount).toBe(4);
      expect(week49?.isCompliant).toBe(true);

      // In November statistics, only Nov 30 (1 smart) is counted
      expect(res.smartDoneDays).toBe(1);
      expect(res.presenceDays).toBe(0);
    });

    it('flags boundary week as non-compliant when smart is worked but presence is missing in passed days', () => {
      // Nov 30 is smart, but Dec 1-4 have 0 presenze
      const days: CalendarDayInfo[] = [
        { date: '2026-11-30', status: 'smart' },
        { date: '2026-12-01', status: 'smart' },
      ];

      const res = validateMonthPolicy(2026, 11, days);
      const week49 = res.weeks.find(w => w.startDate === '2026-11-30');

      expect(week49?.isCompliant).toBe(false);
      expect(week49?.errorReason).toBe('Manca presenza obbligatoria');
    });
  });

  describe('validateMonthPolicy - isMonthFullyCompliant Global Result', () => {
    it('returns isMonthFullyCompliant = true when smartStatus is OK, all weeks compliant, and unscheduledDaysCount = 0', () => {
      // Build a realistic November 2026 plan:
      // Working days: 21 days total.
      // We schedule 10 smart days and 11 presence days.
      // Every week has at least 1 presence and <= 4 smart.
      const days: CalendarDayInfo[] = [
        // Week 44: Oct 26-31 adjacent days
        { date: '2026-10-26', status: 'presenza' },
        { date: '2026-10-27', status: 'smart' },
        { date: '2026-10-28', status: 'smart' },
        { date: '2026-10-29', status: 'smart' },
        { date: '2026-10-30', status: 'smart' },
        { date: '2026-11-01', status: 'non_lavorativo' },

        // Week 45 (Nov 2 - Nov 8): 1 presenza, 4 smart
        { date: '2026-11-02', status: 'presenza' },
        { date: '2026-11-03', status: 'smart' },
        { date: '2026-11-04', status: 'smart' },
        { date: '2026-11-05', status: 'smart' },
        { date: '2026-11-06', status: 'smart' },

        // Week 46 (Nov 9 - Nov 15): 2 presenze, 3 smart
        { date: '2026-11-09', status: 'presenza' },
        { date: '2026-11-10', status: 'smart' },
        { date: '2026-11-11', status: 'smart' },
        { date: '2026-11-12', status: 'smart' },
        { date: '2026-11-13', status: 'presenza' },

        // Week 47 (Nov 16 - Nov 22): 3 presenze, 2 smart
        { date: '2026-11-16', status: 'presenza' },
        { date: '2026-11-17', status: 'idea_smart' },
        { date: '2026-11-18', status: 'idea_smart' },
        { date: '2026-11-19', status: 'presenza' },
        { date: '2026-11-20', status: 'presenza' },

        // Week 48 (Nov 23 - Nov 29): 4 presenze, 1 smart
        { date: '2026-11-23', status: 'presenza' },
        { date: '2026-11-24', status: 'smart' },
        { date: '2026-11-25', status: 'presenza' },
        { date: '2026-11-26', status: 'presenza' },
        { date: '2026-11-27', status: 'presenza' },

        // Week 49 (Nov 30 - Dec 6): Nov 30 is presenza (no smart in Nov for this week)
        { date: '2026-11-30', status: 'presenza' },
        { date: '2026-12-01', status: 'presenza' },
        { date: '2026-12-02', status: 'smart' },
      ];

      const res = validateMonthPolicy(2026, 11, days);

      expect(res.workingDaysCount).toBe(21);
      expect(res.presenceDays).toBe(11);
      expect(res.smartDoneDays).toBe(8);
      expect(res.smartPlannedDays).toBe(2);
      expect(res.totalSmartDays).toBe(10);
      expect(res.smartStatus).toBe('OK');
      expect(res.unscheduledDaysCount).toBe(0);
      expect(res.weeks.every(w => w.isCompliant)).toBe(true);
      expect(res.isMonthFullyCompliant).toBe(true);
    });

    it('returns isMonthFullyCompliant = false if any condition fails', () => {
      // 9 smart (smartStatus INCOMPLETO) -> false
      const daysIncomplete: CalendarDayInfo[] = [];
      const allDays = new Date(Date.UTC(2026, 11, 0)).getUTCDate();
      let smartSet = 0;
      for (let d = 1; d <= allDays; d++) {
        const dateStr = `2026-11-${String(d).padStart(2, '0')}`;
        if (isWorkingDay(dateStr)) {
          if (smartSet < 9) {
            daysIncomplete.push({ date: dateStr, status: 'smart' });
            smartSet++;
          } else {
            daysIncomplete.push({ date: dateStr, status: 'presenza' });
          }
        }
      }

      const res = validateMonthPolicy(2026, 11, daysIncomplete);
      expect(res.smartStatus).toBe('INCOMPLETO');
      expect(res.isMonthFullyCompliant).toBe(false);
    });
  });
});
