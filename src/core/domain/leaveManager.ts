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
  parTakenHours: number;              // Permessi goduti (giorni con status 'par' * standardDayHours + somma permessi orari)
  parPlannedHours: number;            // Permessi pianificati (giorni con status 'idea_par' * standardDayHours)
  parRemainingHours: number;          // Permessi residui disponibili
}

/**
 * Calculates annual leave balances (Ferie and PAR) for a specific year,
 * factoring in current allowances, carryover residuals from the previous year,
 * actual taken hours (from full days and partial permissions), and planned days ('idea_ferie' and 'idea_par').
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
  let parDaysTakenCount = 0;
  let parDaysPlannedCount = 0;

  for (const [dateStr, day] of Object.entries(daysMap)) {
    if (dateStr.startsWith(yearPrefix)) {
      if (day.status === 'ferie') {
        ferieDaysTakenCount++;
      } else if (day.status === 'idea_ferie') {
        ferieDaysPlannedCount++;
      } else if (day.status === 'par') {
        parDaysTakenCount++;
      } else if (day.status === 'idea_par') {
        parDaysPlannedCount++;
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

  const parHourlyTaken = Math.round((totalPermissionMinutes / 60) * 100) / 100;
  const parTakenHours = parDaysTakenCount * standardDayHours + parHourlyTaken;
  const parPlannedHours = parDaysPlannedCount * standardDayHours;
  const parRemainingHours = Math.round((parTotalEntitledHours - parTakenHours - parPlannedHours) * 100) / 100;

  return {
    ferieTotalEntitledHours,
    ferieTakenHours,
    feriePlannedHours,
    ferieRemainingHours,

    parTotalEntitledHours,
    parTakenHours,
    parPlannedHours,
    parRemainingHours,
  };
}
