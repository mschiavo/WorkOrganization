/**
 * TimeCalculator Domain Engine
 *
 * Handles time conversions, punch interval calculations, minimum lunch break rules,
 * expected exit time projections (nominal and reduced), hourly permission additions,
 * completeness checks, sequence validation, and daily delta balance.
 */

export interface TimeEntryInput {
  morningIn?: string | null;  // Format "HH:mm"
  lunchOut?: string | null;   // Format "HH:mm"
  lunchIn?: string | null;    // Format "HH:mm"
  eveningOut?: string | null; // Format "HH:mm"
  permissionMinutes?: number;
  isSmartWork?: boolean;
}

export interface TimeCalculationResult {
  lunchDurationMinutes: number;
  workedMinutes: number;
  expectedExit8h: string | null; // Format "HH:mm" (Nominal exit time)
  expectedExit7h: string | null; // Format "HH:mm" (Reduced exit time)
  deltaMinutes: number;          // workedMinutes - nominalMinutes
  isComplete?: boolean;
  isValidSequence?: boolean;
  isProvisional?: boolean;
}

export interface TimeCalculatorOptions {
  minLunchMinutes?: number;
  standardDayHours?: number; // e.g. 8 or 7.5
  reducedDayHours?: number;  // e.g. 7 or 6.5
  allowNightShift?: boolean;
}

/**
 * Converts a "HH:mm" time string to minutes from midnight (0..1439).
 * Returns 0 if invalid or empty.
 */
export function hhMmToMinutes(timeStr: string): number {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * Converts total minutes into a formatted string "HH:mm".
 * If showSign is true, prefixes with '+' or '-' (e.g. "+01:05", "-00:15", "+00:00").
 * If showSign is false, negative numbers still preserve '-' (e.g. "-00:15").
 */
export function minutesToHHmm(minutes: number, showSign: boolean = false): string {
  if (!isFinite(minutes)) {
    return showSign ? '+00:00' : '00:00';
  }

  const isNegative = minutes < 0;
  const absMinutes = Math.abs(Math.round(minutes));
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;

  const paddedHours = String(hours).padStart(2, '0');
  const paddedMins = String(mins).padStart(2, '0');

  if (isNegative) {
    return `-${paddedHours}:${paddedMins}`;
  }
  if (showSign) {
    return `+${paddedHours}:${paddedMins}`;
  }
  return `${paddedHours}:${paddedMins}`;
}

/**
 * Calculates daily working time statistics given punch timestamps and day flags.
 *
 * @param input Daily punch entry timestamps and flags
 * @param options TimeCalculatorOptions or minimum lunch break in minutes
 * @returns TimeCalculationResult with lunch duration, worked minutes, expected exits, and delta
 */
export function calculateDailyTime(
  input: TimeEntryInput,
  options?: TimeCalculatorOptions | number
): TimeCalculationResult {
  const minLunchMinutes = typeof options === 'number' ? options : (options?.minLunchMinutes ?? 30);
  const standardDayHours = typeof options === 'object' && options?.standardDayHours ? options.standardDayHours : 8;
  const reducedDayHours = typeof options === 'object' && options?.reducedDayHours ? options.reducedDayHours : 7;
  const allowNightShift = typeof options === 'object' && options?.allowNightShift !== undefined ? Boolean(options.allowNightShift) : false;

  const nominalMinutes = Math.round(standardDayHours * 60);
  const reducedMinutes = Math.round(reducedDayHours * 60);

  // 1. Smart Working rule: nominal worked minus permissions, credited exactly to nominal, 0 delta.
  if (input.isSmartWork) {
    const permission = input.permissionMinutes ?? 0;
    const workedMinutes = Math.max(0, nominalMinutes - permission);

    return {
      lunchDurationMinutes: 0,
      workedMinutes,
      expectedExit8h: null,
      expectedExit7h: null,
      deltaMinutes: 0,
    };
  }

  const morningIn = input.morningIn?.trim() || null;
  const lunchOut = input.lunchOut?.trim() || null;
  const lunchIn = input.lunchIn?.trim() || null;
  const eveningOut = input.eveningOut?.trim() || null;
  const permissionMinutes = input.permissionMinutes ?? 0;

  let isComplete = true;
  let isValidSequence = true;
  let isProvisional = false;

  // Asymmetric lunch punches check
  const hasAsymmetricLunch = Boolean((lunchOut && !lunchIn) || (!lunchOut && lunchIn));
  if (hasAsymmetricLunch) {
    isComplete = false;
    isProvisional = true;
  }

  // 2. Lunch duration calculation
  let lunchDurationMinutes = 0;
  let lunchForExit = minLunchMinutes;

  if (lunchOut && lunchIn) {
    let rawLunch = hhMmToMinutes(lunchIn) - hhMmToMinutes(lunchOut);
    if (rawLunch < 0) {
      if (allowNightShift) {
        rawLunch += 1440;
      } else {
        isValidSequence = false;
        rawLunch = minLunchMinutes;
      }
    }
    lunchDurationMinutes = Math.max(rawLunch, minLunchMinutes);
    lunchForExit = lunchDurationMinutes;
  } else if (!lunchOut && !lunchIn && morningIn && eveningOut) {
    // Presence day completed without explicit lunch punches: company default lunch deduction applies
    lunchDurationMinutes = minLunchMinutes;
    lunchForExit = minLunchMinutes;
  } else if (hasAsymmetricLunch && morningIn && eveningOut) {
    // Asymmetric lunch with evening punch: provisional deduction of minimum lunch applies
    lunchDurationMinutes = minLunchMinutes;
    lunchForExit = minLunchMinutes;
  } else {
    // Lunch not recorded or day still in progress before lunch
    lunchDurationMinutes = 0;
    lunchForExit = minLunchMinutes;
  }

  // 3. Expected exits calculation (when morningIn is present)
  let expectedExit8h: string | null = null;
  let expectedExit7h: string | null = null;

  if (morningIn) {
    const morningMinutes = hhMmToMinutes(morningIn);
    const exitNominalMinutes = (morningMinutes + lunchForExit + nominalMinutes) % 1440;
    const exitReducedMinutes = (morningMinutes + lunchForExit + reducedMinutes) % 1440;

    expectedExit8h = minutesToHHmm(exitNominalMinutes);
    expectedExit7h = minutesToHHmm(exitReducedMinutes);
  }

  // 4. Worked minutes and delta calculation
  let workedMinutes = 0;
  let deltaMinutes = 0;

  if (morningIn && eveningOut) {
    const inMin = hhMmToMinutes(morningIn);
    const outMin = hhMmToMinutes(eveningOut);
    let span = outMin - inMin;

    if (span <= 0) {
      // Night shift condition: allow if explicit or starting in late evening (>= 20:00) and ending in morning (<= 12:00)
      if (allowNightShift || (inMin >= 1200 && outMin <= 720)) {
        span += 1440;
      } else {
        // Inverted daytime punches are invalid (e.g. 09:00 -> 08:00)
        isValidSequence = false;
        span = 0;
      }
    }

    if (isValidSequence) {
      const netWorked = Math.max(0, span - lunchDurationMinutes);
      workedMinutes = netWorked + permissionMinutes;

      if (isComplete) {
        deltaMinutes = workedMinutes - nominalMinutes;
      } else {
        // Incomplete day: never credit positive delta, cap at <= 0
        deltaMinutes = Math.min(0, workedMinutes - nominalMinutes);
      }
    } else {
      workedMinutes = 0;
      deltaMinutes = 0;
    }
  } else if (!morningIn && !eveningOut && permissionMinutes > 0) {
    // Full day off with permit (no punches)
    workedMinutes = permissionMinutes;
    deltaMinutes = workedMinutes - nominalMinutes;
  } else {
    // Day in progress or empty
    workedMinutes = 0;
    deltaMinutes = 0;
  }

  const res: TimeCalculationResult = {
    lunchDurationMinutes,
    workedMinutes,
    expectedExit8h,
    expectedExit7h,
    deltaMinutes,
  };

  if (!isComplete) {
    res.isComplete = false;
  }
  if (!isValidSequence) {
    res.isValidSequence = false;
  }
  if (isProvisional) {
    res.isProvisional = true;
  }

  return res;
}
