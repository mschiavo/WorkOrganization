/**
 * Parses user input in flexible duration formats into total integer minutes.
 * Supports:
 * - Plain number: "3" -> 3 hours = 180 min
 * - Hours with unit: "3h", "3H" -> 180 min
 * - Minutes with unit: "50m", "50M" -> 50 min
 * - Combined hours and minutes: "3h50", "3h50m", "3H50M" -> 230 min
 * - Colon format: "3:50", "03:50" -> 230 min
 * - Decimal hours: "1.5", "1.5h", "1,5h" -> 90 min
 * Returns 0 if input is invalid or empty.
 */
export function parseFlexibleDuration(input: string | number | undefined | null): number {
  if (input === undefined || input === null) return 0;
  if (typeof input === 'number') {
    if (isNaN(input) || input <= 0) return 0;
    return Math.round(input * 60);
  }

  const str = input.trim();
  if (!str) return 0;

  // Case 1: Decimal hours with comma or period (e.g. "1,5h", "1.5h", "1.5")
  const decimalMatch = str.match(/^(\d+)[.,](\d+)\s*h?$/i);
  if (decimalMatch) {
    const hours = parseFloat(`${decimalMatch[1]}.${decimalMatch[2]}`);
    return Math.round(hours * 60);
  }

  // Case 2: Colon notation "HH:mm" (e.g. "3:50", "03:50")
  const colonMatch = str.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colonMatch) {
    const h = parseInt(colonMatch[1], 10);
    const m = parseInt(colonMatch[2], 10);
    return h * 60 + m;
  }

  // Case 3: Combined "3h50", "3h50m", "3h 50m"
  const combinedMatch = str.match(/^(\d+)\s*h\s*(\d+)\s*m?$/i);
  if (combinedMatch) {
    const h = parseInt(combinedMatch[1], 10);
    const m = parseInt(combinedMatch[2], 10);
    return h * 60 + m;
  }

  // Case 4: Minutes only "50m", "50M"
  const minutesMatch = str.match(/^(\d+)\s*m$/i);
  if (minutesMatch) {
    return parseInt(minutesMatch[1], 10);
  }

  // Case 5: Hours only "3h", "3H"
  const hoursMatch = str.match(/^(\d+)\s*h$/i);
  if (hoursMatch) {
    return parseInt(hoursMatch[1], 10) * 60;
  }

  // Case 6: Plain integer (default interpretation is hours: e.g. "3" -> 3h = 180 min)
  const plainIntMatch = str.match(/^(\d+)$/);
  if (plainIntMatch) {
    return parseInt(plainIntMatch[1], 10) * 60;
  }

  return 0;
}

/**
 * Formats total minutes into a human-friendly duration string.
 * Examples:
 * - 180 -> "3h"
 * - 230 -> "3h 50m"
 * - 50 -> "50m"
 * - 0 -> ""
 */
export function formatFlexibleDuration(minutes: number | undefined | null): string {
  if (!minutes || isNaN(minutes) || minutes <= 0) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h > 0 && m > 0) {
    return `${h}h ${m}m`;
  }
  if (h > 0) {
    return `${h}h`;
  }
  return `${m}m`;
}
