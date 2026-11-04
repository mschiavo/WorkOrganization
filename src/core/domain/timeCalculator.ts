/**
 * TimeCalculator Domain Engine
 *
 * Handles time conversions, punch interval calculations, minimum lunch break rules,
 * expected exit time projections (7h and 8h), hourly permission additions, and daily delta balance.
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
  expectedExit8h: string | null; // Format "HH:mm"
  expectedExit7h: string | null; // Format "HH:mm"
  deltaMinutes: number;          // workedMinutes - 480 (or relative to nominal 8h)
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
 * @param minLunchMinutes Minimum required lunch break in minutes (defaults to 30)
 * @returns TimeCalculationResult with lunch duration, worked minutes, expected exits, and delta
 */
export function calculateDailyTime(
  input: TimeEntryInput,
  minLunchMinutes: number = 30
): TimeCalculationResult {
  // 1. Smart Working rule: exactly 8h nominal worked, 0m lunch, 0 delta, no exit times.
  if (input.isSmartWork) {
    return {
      lunchDurationMinutes: 0,
      workedMinutes: 480,
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

  // 2. Lunch duration calculation
  let lunchDurationMinutes = 0;
  let lunchForExit = minLunchMinutes;

  if (lunchOut && lunchIn) {
    let rawLunch = hhMmToMinutes(lunchIn) - hhMmToMinutes(lunchOut);
    if (rawLunch < 0) rawLunch += 1440; // Midnight rollover
    lunchDurationMinutes = Math.max(rawLunch, minLunchMinutes);
    lunchForExit = lunchDurationMinutes;
  } else if (!lunchOut && !lunchIn && morningIn && eveningOut) {
    // Presence day completed without explicit lunch punches: company default lunch deduction applies
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
    const exit8hMinutes = (morningMinutes + lunchForExit + 480) % 1440;
    const exit7hMinutes = ((exit8hMinutes - 60) % 1440 + 1440) % 1440;

    expectedExit8h = minutesToHHmm(exit8hMinutes);
    expectedExit7h = minutesToHHmm(exit7hMinutes);
  }

  // 4. Worked minutes and delta calculation
  let workedMinutes = 0;
  let deltaMinutes = 0;

  if (morningIn && eveningOut) {
    let span = hhMmToMinutes(eveningOut) - hhMmToMinutes(morningIn);
    if (span < 0) span += 1440; // Night shift / midnight rollover

    const netWorked = Math.max(0, span - lunchDurationMinutes);
    workedMinutes = netWorked + permissionMinutes;
    deltaMinutes = workedMinutes - 480;
  } else if (!morningIn && !eveningOut && permissionMinutes > 0) {
    // Full day off with permit (no punches)
    workedMinutes = permissionMinutes;
    deltaMinutes = workedMinutes - 480;
  } else {
    // Day in progress or empty: worked time not finalized yet
    workedMinutes = 0;
    deltaMinutes = 0;
  }

  return {
    lunchDurationMinutes,
    workedMinutes,
    expectedExit8h,
    expectedExit7h,
    deltaMinutes,
  };
}
