import { DayStatus } from './policyValidator';

export interface LeaveSettings {
  yearlyFerieHours: number;           // default 160 (20 gg x 8h)
  prevYearFerieResidualHours: number; // default 0
  yearlyParHours: number;             // default 88 o 104
  prevYearParResidualHours: number;   // default 0
}

export interface LeaveBalanceSummary {
  ferieTotalEntitledHours: number;    // Totale ferie spettanti nell'anno (compreso residuo anno prec.)
  ferieTakenHours: number;            // Ferie godute (giorni con status 'ferie' * standardDayHours)
  feriePlannedHours: number;          // Ferie pianificate (giorni con status 'idea_ferie' * standardDayHours)
  ferieRemainingHours: number;        // Ferie residue disponibili al netto di godute e pianificate

  parTotalEntitledHours: number;      // Totale permessi/PAR spettanti nell'anno (compreso residuo anno prec.)
  parTakenHours: number;              // Permessi goduti (somma di tutti i permissionMinutes in ore)
  parRemainingHours: number;          // Permessi residui disponibili
}

/**
 * Calculates annual leave balances (Ferie and PAR) for a specific year,
 * factoring in current allowances, carryover residuals from the previous year,
 * actual taken hours, and planned 'idea_ferie' days.
 */
export function calculateAnnualLeaveBalance(
  year: number,
  daysMap: Record<string, { status?: DayStatus; date: string }>,
  timeEntriesMap: Record<string, { permissionMinutes?: number; date: string }>,
  settings: LeaveSettings,
  standardDayHours: number = 8
): LeaveBalanceSummary {
  const ferieTotalEntitledHours =
    (settings.yearlyFerieHours ?? 160) + (settings.prevYearFerieResidualHours ?? 0);
  const parTotalEntitledHours =
    (settings.yearlyParHours ?? 88) + (settings.prevYearParResidualHours ?? 0);

  const yearPrefix = `${year}-`;

  let ferieDaysTakenCount = 0;
  let ferieDaysPlannedCount = 0;

  for (const [dateStr, day] of Object.entries(daysMap)) {
    if (dateStr.startsWith(yearPrefix)) {
      if (day.status === 'ferie') {
        ferieDaysTakenCount++;
      } else if (day.status === 'idea_ferie') {
        ferieDaysPlannedCount++;
      }
    }
  }

  const ferieTakenHours = ferieDaysTakenCount * standardDayHours;
  const feriePlannedHours = ferieDaysPlannedCount * standardDayHours;
  const ferieRemainingHours = ferieTotalEntitledHours - ferieTakenHours - feriePlannedHours;

  let totalPermissionMinutes = 0;
  for (const [dateStr, entry] of Object.entries(timeEntriesMap)) {
    if (dateStr.startsWith(yearPrefix) && entry.permissionMinutes) {
      totalPermissionMinutes += entry.permissionMinutes;
    }
  }

  const parTakenHours = Math.round((totalPermissionMinutes / 60) * 100) / 100;
  const parRemainingHours = Math.round((parTotalEntitledHours - parTakenHours) * 100) / 100;

  return {
    ferieTotalEntitledHours,
    ferieTakenHours,
    feriePlannedHours,
    ferieRemainingHours,

    parTotalEntitledHours,
    parTakenHours,
    parRemainingHours,
  };
}
