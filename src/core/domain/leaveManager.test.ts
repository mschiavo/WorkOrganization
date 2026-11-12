import { describe, it, expect } from 'vitest';
import { calculateAnnualLeaveBalance, LeaveSettings } from './leaveManager';

describe('leaveManager Domain Engine', () => {
  const defaultSettings: LeaveSettings = {
    yearlyFerieHours: 160,          // 20 giorni * 8h
    prevYearFerieResidualHours: 24, // 3 giorni residui
    yearlyParHours: 88,             // 88 ore PAR
    prevYearParResidualHours: 12,   // 12 ore residue
  };

  it('calculates total entitled hours correctly from current year and previous year residuals', () => {
    const summary = calculateAnnualLeaveBalance(2026, {}, {}, defaultSettings);

    expect(summary.ferieTotalEntitledHours).toBe(184); // 160 + 24
    expect(summary.ferieTakenHours).toBe(0);
    expect(summary.feriePlannedHours).toBe(0);
    expect(summary.ferieRemainingHours).toBe(184);

    expect(summary.parTotalEntitledHours).toBe(100); // 88 + 12
    expect(summary.parTakenHours).toBe(0);
    expect(summary.parRemainingHours).toBe(100);
  });

  it('calculates ferie taken (ferie) and ferie planned (idea_ferie) for the year', () => {
    const daysMap = {
      // 2 giorni di ferie godute nel 2026 = 16h
      '2026-08-10': { date: '2026-08-10', status: 'ferie' as const },
      '2026-08-11': { date: '2026-08-11', status: 'ferie' as const },
      // 3 giorni di ferie pianificate (idea_ferie) nel 2026 = 24h
      '2026-12-28': { date: '2026-12-28', status: 'idea_ferie' as const },
      '2026-12-29': { date: '2026-12-29', status: 'idea_ferie' as const },
      '2026-12-30': { date: '2026-12-30', status: 'idea_ferie' as const },
      // Un giorno del 2027 che non deve essere conteggiato nel 2026
      '2027-01-04': { date: '2027-01-04', status: 'ferie' as const },
    };

    const summary = calculateAnnualLeaveBalance(2026, daysMap, {}, defaultSettings);

    expect(summary.ferieTakenHours).toBe(16);
    expect(summary.feriePlannedHours).toBe(24);
    // 184 - 16 - 24 = 144 ore rimanenti
    expect(summary.ferieRemainingHours).toBe(144);
  });

  it('calculates PAR taken and remaining from permission minutes across the year', () => {
    const timeEntriesMap = {
      // 3 ore di permesso (180 min)
      '2026-05-12': { date: '2026-05-12', permissionMinutes: 180 },
      // 1.5 ore di permesso (90 min)
      '2026-06-20': { date: '2026-06-20', permissionMinutes: 90 },
      // Voce del 2025 da non includere
      '2025-11-10': { date: '2025-11-10', permissionMinutes: 120 },
    };

    const summary = calculateAnnualLeaveBalance(2026, {}, timeEntriesMap, defaultSettings);

    // 180 + 90 = 270 min = 4.5 ore
    expect(summary.parTakenHours).toBe(4.5);
    // 100 - 4.5 = 95.5 ore rimanenti
    expect(summary.parRemainingHours).toBe(95.5);
  });
});
