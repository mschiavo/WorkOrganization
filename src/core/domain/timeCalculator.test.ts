import { describe, it, expect } from 'vitest';
import {
  hhMmToMinutes,
  minutesToHHmm,
  calculateDailyTime,
  type TimeEntryInput,
  type TimeCalculationResult,
} from './timeCalculator';

describe('TimeCalculator Domain Service', () => {
  describe('hhMmToMinutes', () => {
    it('converts standard "HH:mm" time strings to minutes from midnight', () => {
      expect(hhMmToMinutes('08:01')).toBe(481);
      expect(hhMmToMinutes('00:00')).toBe(0);
      expect(hhMmToMinutes('12:06')).toBe(726);
      expect(hhMmToMinutes('12:35')).toBe(755);
      expect(hhMmToMinutes('17:36')).toBe(1056);
      expect(hhMmToMinutes('23:59')).toBe(1439);
    });

    it('handles single-digit hours or minutes correctly', () => {
      expect(hhMmToMinutes('8:5')).toBe(485);
      expect(hhMmToMinutes('0:0')).toBe(0);
    });

    it('handles whitespace around time strings', () => {
      expect(hhMmToMinutes('  08:01  ')).toBe(481);
    });

    it('returns 0 for empty or invalid inputs', () => {
      expect(hhMmToMinutes('')).toBe(0);
      expect(hhMmToMinutes('invalid')).toBe(0);
      // @ts-expect-error test invalid runtime inputs
      expect(hhMmToMinutes(null)).toBe(0);
      // @ts-expect-error test invalid runtime inputs
      expect(hhMmToMinutes(undefined)).toBe(0);
    });
  });

  describe('minutesToHHmm', () => {
    it('converts minutes to "HH:mm" without sign by default', () => {
      expect(minutesToHHmm(481)).toBe('08:01');
      expect(minutesToHHmm(0)).toBe('00:00');
      expect(minutesToHHmm(545)).toBe('09:05');
      expect(minutesToHHmm(991)).toBe('16:31');
      expect(minutesToHHmm(931)).toBe('15:31');
    });

    it('formats sign correctly when showSign is true', () => {
      expect(minutesToHHmm(65, true)).toBe('+01:05');
      expect(minutesToHHmm(-15, true)).toBe('-00:15');
      expect(minutesToHHmm(0, true)).toBe('+00:00');
      expect(minutesToHHmm(480, true)).toBe('+08:00');
      expect(minutesToHHmm(-480, true)).toBe('-08:00');
    });

    it('always shows minus sign for negative minutes even if showSign is false', () => {
      expect(minutesToHHmm(-15)).toBe('-00:15');
      expect(minutesToHHmm(-65, false)).toBe('-01:05');
    });

    it('handles durations greater than 24 hours', () => {
      expect(minutesToHHmm(1500)).toBe('25:00');
      expect(minutesToHHmm(1500, true)).toBe('+25:00');
      expect(minutesToHHmm(-1500, true)).toBe('-25:00');
    });

    it('handles non-finite values gracefully', () => {
      expect(minutesToHHmm(NaN)).toBe('00:00');
      expect(minutesToHHmm(Infinity)).toBe('00:00');
    });
  });

  describe('calculateDailyTime - Smart Working', () => {
    it('returns nominal 8h (480m), 0m lunch, 0m delta and null expected exits for smart work', () => {
      const input: TimeEntryInput = {
        isSmartWork: true,
      };

      const result: TimeCalculationResult = calculateDailyTime(input);

      expect(result).toEqual({
        lunchDurationMinutes: 0,
        workedMinutes: 480,
        expectedExit8h: null,
        expectedExit7h: null,
        deltaMinutes: 0,
      });
    });

    it('ignores any punch times when isSmartWork is true', () => {
      const input: TimeEntryInput = {
        morningIn: '08:00',
        lunchOut: '12:00',
        lunchIn: '13:00',
        eveningOut: '18:00',
        isSmartWork: true,
      };

      const result = calculateDailyTime(input);

      expect(result).toEqual({
        lunchDurationMinutes: 0,
        workedMinutes: 480,
        expectedExit8h: null,
        expectedExit7h: null,
        deltaMinutes: 0,
      });
    });

    it('handles smart working with permission minutes subtracting from worked time while completing nominal 8h', () => {
      const input: TimeEntryInput = {
        isSmartWork: true,
        permissionMinutes: 180, // 3 ore di permesso
      };

      const result = calculateDailyTime(input);

      expect(result).toEqual({
        lunchDurationMinutes: 0,
        workedMinutes: 300, // 480 - 180 = 300 min (5h lavorate)
        expectedExit8h: null,
        expectedExit7h: null,
        deltaMinutes: 0,
      });
    });
  });

  describe('calculateDailyTime - Standard Presence with Lunch < 30 minutes', () => {
    it('forces lunch to minimum 30m when actual lunch is 29m and calculates correct exits and delta', () => {
      // Test case from brief:
      // morningIn "08:01", lunchOut "12:06", lunchIn "12:35" (29m actual), eveningOut "17:36"
      // Net span: (17:36 - 08:01) = 575m - 30m lunch = 545m (9h 05m)
      // Delta: 545 - 480 = +65m (+01:05)
      // Expected exit 8h: 08:01 + 30m + 8h = 16:31
      // Expected exit 7h: 16:31 - 1h = 15:31
      const input: TimeEntryInput = {
        morningIn: '08:01',
        lunchOut: '12:06',
        lunchIn: '12:35',
        eveningOut: '17:36',
      };

      const result = calculateDailyTime(input);

      expect(result.lunchDurationMinutes).toBe(30);
      expect(result.workedMinutes).toBe(545);
      expect(result.deltaMinutes).toBe(65);
      expect(result.expectedExit8h).toBe('16:31');
      expect(result.expectedExit7h).toBe('15:31');
    });

    it('forces lunch to 30m when actual lunch is 0m or very small (e.g. 10m)', () => {
      const input: TimeEntryInput = {
        morningIn: '08:00',
        lunchOut: '12:00',
        lunchIn: '12:10',
        eveningOut: '16:30',
      };

      const result = calculateDailyTime(input);

      expect(result.lunchDurationMinutes).toBe(30);
      // Span 8h 30m (510m) - 30m forced lunch = 480m (8h 00m)
      expect(result.workedMinutes).toBe(480);
      expect(result.deltaMinutes).toBe(0);
      expect(result.expectedExit8h).toBe('16:30');
      expect(result.expectedExit7h).toBe('15:30');
    });
  });

  describe('calculateDailyTime - Longer Lunch Break (> 30 minutes)', () => {
    it('preserves actual lunch duration when it exceeds minimum (e.g. 45m)', () => {
      // Test case from brief:
      // morningIn "08:01", lunchOut "12:00", lunchIn "12:45" (45m actual), eveningOut "17:36"
      // Net span: 575m - 45m = 530m (8h 50m)
      // Delta: 530 - 480 = +50m
      // Expected exit 8h: 08:01 + 45m + 8h = 16:46
      // Expected exit 7h: 15:46
      const input: TimeEntryInput = {
        morningIn: '08:01',
        lunchOut: '12:00',
        lunchIn: '12:45',
        eveningOut: '17:36',
      };

      const result = calculateDailyTime(input);

      expect(result.lunchDurationMinutes).toBe(45);
      expect(result.workedMinutes).toBe(530);
      expect(result.deltaMinutes).toBe(50);
      expect(result.expectedExit8h).toBe('16:46');
      expect(result.expectedExit7h).toBe('15:46');
    });

    it('adapts correctly when custom minLunchMinutes is provided', () => {
      const input: TimeEntryInput = {
        morningIn: '08:00',
        lunchOut: '12:00',
        lunchIn: '12:20', // 20m actual
        eveningOut: '16:30',
      };

      // Force minLunch to 45m
      const result = calculateDailyTime(input, 45);

      expect(result.lunchDurationMinutes).toBe(45);
      // Span 510m - 45m = 465m
      expect(result.workedMinutes).toBe(465);
      expect(result.deltaMinutes).toBe(-15);
      expect(result.expectedExit8h).toBe('16:45');
      expect(result.expectedExit7h).toBe('15:45');
    });
  });

  describe('calculateDailyTime - Hourly Permissions (permissionMinutes)', () => {
    it('adds permissionMinutes directly to workedMinutes and deltaMinutes', () => {
      // morningIn 08:00, lunch 12:00-12:30 (30m), eveningOut 15:30 (7h worked = 420m)
      // permissionMinutes: 90m (1h 30m)
      // total worked: 420 + 90 = 510m (8h 30m)
      // delta: 510 - 480 = +30m
      const input: TimeEntryInput = {
        morningIn: '08:00',
        lunchOut: '12:00',
        lunchIn: '12:30',
        eveningOut: '15:30',
        permissionMinutes: 90,
      };

      const result = calculateDailyTime(input);

      expect(result.lunchDurationMinutes).toBe(30);
      expect(result.workedMinutes).toBe(510);
      expect(result.deltaMinutes).toBe(30);
      // Expected exit remains based on nominal 8h shift + lunch
      expect(result.expectedExit8h).toBe('16:30');
      expect(result.expectedExit7h).toBe('15:30');
    });

    it('handles full-day permission with no punch stamps', () => {
      const input: TimeEntryInput = {
        permissionMinutes: 480,
      };

      const result = calculateDailyTime(input);

      expect(result.workedMinutes).toBe(480);
      expect(result.deltaMinutes).toBe(0);
      expect(result.lunchDurationMinutes).toBe(0);
      expect(result.expectedExit8h).toBeNull();
      expect(result.expectedExit7h).toBeNull();
    });
  });

  describe('calculateDailyTime - Partial Day (In Progress)', () => {
    it('calculates expected exit times with default 30m lunch when only morningIn is entered', () => {
      // Brief rule 6:
      // morningIn "08:01" alone -> workedMinutes = 0, expectedExit8h = 16:31, expectedExit7h = 15:31
      const input: TimeEntryInput = {
        morningIn: '08:01',
      };

      const result = calculateDailyTime(input);

      expect(result.workedMinutes).toBe(0);
      expect(result.deltaMinutes).toBe(0);
      expect(result.lunchDurationMinutes).toBe(0);
      expect(result.expectedExit8h).toBe('16:31');
      expect(result.expectedExit7h).toBe('15:31');
    });

    it('updates expected exits with actual lunch when lunch punches are present but eveningOut is pending', () => {
      const input: TimeEntryInput = {
        morningIn: '08:00',
        lunchOut: '12:00',
        lunchIn: '12:45', // 45m lunch
      };

      const result = calculateDailyTime(input);

      expect(result.lunchDurationMinutes).toBe(45);
      expect(result.workedMinutes).toBe(0);
      expect(result.deltaMinutes).toBe(0);
      expect(result.expectedExit8h).toBe('16:45');
      expect(result.expectedExit7h).toBe('15:45');
    });

    it('returns empty/null result for completely empty input', () => {
      const result = calculateDailyTime({});

      expect(result).toEqual({
        lunchDurationMinutes: 0,
        workedMinutes: 0,
        expectedExit8h: null,
        expectedExit7h: null,
        deltaMinutes: 0,
      });
    });
  });

  describe('calculateDailyTime - Continuous Presence without Lunch Punches', () => {
    it('applies default 30m lunch deduction when morningIn and eveningOut are present without lunch punches', () => {
      // 08:00 to 16:30 = 510m - 30m default lunch = 480m worked (8h)
      const input: TimeEntryInput = {
        morningIn: '08:00',
        eveningOut: '16:30',
      };

      const result = calculateDailyTime(input);

      expect(result.lunchDurationMinutes).toBe(30);
      expect(result.workedMinutes).toBe(480);
      expect(result.deltaMinutes).toBe(0);
      expect(result.expectedExit8h).toBe('16:30');
      expect(result.expectedExit7h).toBe('15:30');
    });
  });

  describe('calculateDailyTime - Early Exit and Hour Deficit', () => {
    it('computes negative delta correctly when user exits earlier than 8h', () => {
      // morningIn 08:00, lunch 12:00-12:30 (30m), eveningOut 16:00
      // Net worked: (16:00 - 08:00) - 30m = 480 - 30 = 450m (7h 30m)
      // Delta: 450 - 480 = -30m
      const input: TimeEntryInput = {
        morningIn: '08:00',
        lunchOut: '12:00',
        lunchIn: '12:30',
        eveningOut: '16:00',
      };

      const result = calculateDailyTime(input);

      expect(result.lunchDurationMinutes).toBe(30);
      expect(result.workedMinutes).toBe(450);
      expect(result.deltaMinutes).toBe(-30);
      expect(result.expectedExit8h).toBe('16:30');
      expect(result.expectedExit7h).toBe('15:30');
    });
  });

  describe('calculateDailyTime - Midnight Rollover and Night Shifts', () => {
    it('handles night shifts spanning past midnight correctly', () => {
      // morningIn 22:00, lunch 02:00-02:30 (30m), eveningOut 06:30
      // Span: 22:00 to 06:30 = 8h 30m (510m)
      // Net worked: 510 - 30 = 480m
      // Delta: 0
      // Expected exit 8h: (22:00 + 30m + 8h) % 24h = 06:30
      // Expected exit 7h: 05:30
      const input: TimeEntryInput = {
        morningIn: '22:00',
        lunchOut: '02:00',
        lunchIn: '02:30',
        eveningOut: '06:30',
      };

      const result = calculateDailyTime(input);

      expect(result.lunchDurationMinutes).toBe(30);
      expect(result.workedMinutes).toBe(480);
      expect(result.deltaMinutes).toBe(0);
      expect(result.expectedExit8h).toBe('06:30');
      expect(result.expectedExit7h).toBe('05:30');
    });
  });

  describe('P2.2 Strict Calculation & Incomplete Day Rules', () => {
    it('08:00 / 12:00 / mancante / 16:30 non accredita un delta definitivo di +30 minuti', () => {
      const input: TimeEntryInput = {
        morningIn: '08:00',
        lunchOut: '12:00',
        lunchIn: null, // Asymmetric missing lunch entry
        eveningOut: '16:30',
      };

      const result = calculateDailyTime(input);

      // Must apply at least min lunch break (30m) or mark incomplete/provisional, and NEVER credit +30m delta!
      expect(result.deltaMinutes).not.toBe(30);
      expect(result.deltaMinutes).toBeLessThanOrEqual(0);
      expect(result.isComplete).toBe(false);
    });

    it('09:00 -> 08:00 senza cambio data valido non accredita +14h30 o 23h', () => {
      const input: TimeEntryInput = {
        morningIn: '09:00',
        eveningOut: '08:00',
      };

      const result = calculateDailyTime(input);

      // Inverted daytime punches are invalid and must not accrue 22-23 hours
      expect(result.workedMinutes).toBe(0);
      expect(result.isValidSequence).toBe(false);
    });

    it('con nominale 7h30, ridotto 6h30 e pausa 30m, ingresso alle 08:00 produce uscite 16:00 e 15:00', () => {
      const input: TimeEntryInput = {
        morningIn: '08:00',
      };

      const result = calculateDailyTime(input, {
        minLunchMinutes: 30,
        standardDayHours: 7.5, // 7h30m = 450m
        reducedDayHours: 6.5,  // 6h30m = 390m
      });

      // 08:00 (480) + 30m lunch + 7h30 (450) = 960m -> 16:00
      expect(result.expectedExit8h).toBe('16:00');
      // 08:00 (480) + 30m lunch + 6h30 (390) = 900m -> 15:00
      expect(result.expectedExit7h).toBe('15:00');
    });

    it('permessi in smart riducono le ore effettive ma conservano la quadratura contrattuale (delta 0)', () => {
      const input: TimeEntryInput = {
        isSmartWork: true,
        permissionMinutes: 120, // 2h permission
      };

      const result = calculateDailyTime(input, {
        standardDayHours: 8,
      });

      expect(result.workedMinutes).toBe(360); // 6h effettive
      expect(result.deltaMinutes).toBe(0);    // quadratura a 8h
    });
  });
});
