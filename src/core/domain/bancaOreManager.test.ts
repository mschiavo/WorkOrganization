import { describe, it, expect } from 'vitest';
import {
  getQuarterForMonth,
  calculateQuarterBalance,
  MonthDeltaInfo,
  QuarterInfo,
} from './bancaOreManager';

describe('BancaOreManager Domain Engine', () => {
  describe('getQuarterForMonth', () => {
    it('correctly maps Q1 months (1, 2, 3) to 2026-Q1', () => {
      const qJan = getQuarterForMonth(2026, 1);
      expect(qJan).toEqual<QuarterInfo>({
        quarterId: '2026-Q1',
        year: 2026,
        quarterNumber: 1,
        startMonth: 1,
        endMonth: 3,
      });

      const qFeb = getQuarterForMonth(2026, 2);
      expect(qFeb.quarterId).toBe('2026-Q1');
      expect(qFeb.quarterNumber).toBe(1);

      const qMar = getQuarterForMonth(2026, 3);
      expect(qMar.quarterId).toBe('2026-Q1');
      expect(qMar.startMonth).toBe(1);
      expect(qMar.endMonth).toBe(3);
    });

    it('correctly maps Q2 months (4, 5, 6) to 2026-Q2', () => {
      const qApr = getQuarterForMonth(2026, 4);
      expect(qApr).toEqual<QuarterInfo>({
        quarterId: '2026-Q2',
        year: 2026,
        quarterNumber: 2,
        startMonth: 4,
        endMonth: 6,
      });

      const qJun = getQuarterForMonth(2026, 6);
      expect(qJun.quarterId).toBe('2026-Q2');
      expect(qJun.quarterNumber).toBe(2);
    });

    it('correctly maps Q3 months (7, 8, 9) to 2026-Q3', () => {
      const qJul = getQuarterForMonth(2026, 7);
      expect(qJul).toEqual<QuarterInfo>({
        quarterId: '2026-Q3',
        year: 2026,
        quarterNumber: 3,
        startMonth: 7,
        endMonth: 9,
      });

      const qSep = getQuarterForMonth(2026, 9);
      expect(qSep.quarterId).toBe('2026-Q3');
    });

    it('correctly maps Q4 months (10, 11, 12) to 2026-Q4', () => {
      const qOct = getQuarterForMonth(2026, 10);
      expect(qOct).toEqual<QuarterInfo>({
        quarterId: '2026-Q4',
        year: 2026,
        quarterNumber: 4,
        startMonth: 10,
        endMonth: 12,
      });

      const qDec = getQuarterForMonth(2026, 12);
      expect(qDec.quarterId).toBe('2026-Q4');
    });

    it('throws error for invalid month values', () => {
      expect(() => getQuarterForMonth(2026, 0)).toThrow(/Invalid month/);
      expect(() => getQuarterForMonth(2026, 13)).toThrow(/Invalid month/);
      expect(() => getQuarterForMonth(2026, -1)).toThrow(/Invalid month/);
    });
  });

  describe('calculateQuarterBalance', () => {
    it('calculates balanced Q1 with positive month deltas', () => {
      const deltas: MonthDeltaInfo[] = [
        { month: 1, deltaMinutes: 60 },
        { month: 2, deltaMinutes: 30 },
        { month: 3, deltaMinutes: 45 },
      ];

      const summary = calculateQuarterBalance(2026, 1, deltas);

      expect(summary.quarterId).toBe('2026-Q1');
      expect(summary.year).toBe(2026);
      expect(summary.quarterNumber).toBe(1);
      expect(summary.totalDeltaMinutes).toBe(135);
      expect(summary.isMonth1Compliant).toBe(true);
      expect(summary.canCoverDeficit).toBe(true);
      expect(summary.warningReasons).toHaveLength(0);
      expect(summary.monthDeltas).toEqual([
        { month: 1, deltaMinutes: 60 },
        { month: 2, deltaMinutes: 30 },
        { month: 3, deltaMinutes: 45 },
      ]);
    });

    it('detects violation when first month of quarter has negative delta (< 0)', () => {
      const deltas: MonthDeltaInfo[] = [
        { month: 1, deltaMinutes: -30 }, // Month 1 violation
        { month: 2, deltaMinutes: 60 },
        { month: 3, deltaMinutes: 30 },
      ];

      const summary = calculateQuarterBalance(2026, 1, deltas);

      expect(summary.isMonth1Compliant).toBe(false);
      expect(summary.totalDeltaMinutes).toBe(60);
      expect(summary.canCoverDeficit).toBe(true); // Total delta is positive
      expect(summary.warningReasons).toContain(
        'Il primo mese del trimestre ha un saldo negativo (< 0)'
      );
    });

    it('allows negative delta in month 2 when covered by month 1 surplus', () => {
      const deltas: MonthDeltaInfo[] = [
        { month: 1, deltaMinutes: 120 }, // Month 1 surplus (+120)
        { month: 2, deltaMinutes: -60 }, // Month 2 deficit, but cum = +60
        { month: 3, deltaMinutes: 15 },  // Month 3 cum = +75
      ];

      const summary = calculateQuarterBalance(2026, 1, deltas);

      expect(summary.isMonth1Compliant).toBe(true);
      expect(summary.canCoverDeficit).toBe(true);
      expect(summary.totalDeltaMinutes).toBe(75);
      expect(summary.warningReasons).toHaveLength(0);
    });

    it('warns when progressive cumulative balance drops below 0 during month 2', () => {
      const deltas: MonthDeltaInfo[] = [
        { month: 1, deltaMinutes: 30 },
        { month: 2, deltaMinutes: -70 }, // Progressive cum drops to -40
        { month: 3, deltaMinutes: 60 },  // Final cum = +20
      ];

      const summary = calculateQuarterBalance(2026, 1, deltas);

      expect(summary.isMonth1Compliant).toBe(true);
      expect(summary.totalDeltaMinutes).toBe(20);
      expect(summary.canCoverDeficit).toBe(true);
      // Cumulative balance dipped below zero, triggering capacity warning
      expect(summary.warningReasons.some(w => w.includes('scende sotto zero'))).toBe(true);
    });

    it('detects uncovered deficit when quarter ends with negative total balance', () => {
      const deltas: MonthDeltaInfo[] = [
        { month: 1, deltaMinutes: 30 },
        { month: 2, deltaMinutes: -60 },
        { month: 3, deltaMinutes: -30 },
      ];

      const summary = calculateQuarterBalance(2026, 1, deltas);

      expect(summary.isMonth1Compliant).toBe(true);
      expect(summary.totalDeltaMinutes).toBe(-60);
      expect(summary.canCoverDeficit).toBe(false);
      expect(summary.warningReasons.some(w => w.includes('deficit') || w.includes('scende sotto zero'))).toBe(true);
    });

    it('enforces quarter boundary isolation (azzeramento) for Q2 (months 4, 5, 6)', () => {
      // In Q2, month 4 is the first month and must have delta >= 0
      const deltasQ2: MonthDeltaInfo[] = [
        { month: 1, deltaMinutes: 500 }, // From Q1 - must NOT carry over or satisfy month 4 rule
        { month: 4, deltaMinutes: -10 }, // First month of Q2 is negative
        { month: 5, deltaMinutes: 40 },
        { month: 6, deltaMinutes: 20 },
      ];

      const summary = calculateQuarterBalance(2026, 2, deltasQ2);

      expect(summary.quarterId).toBe('2026-Q2');
      expect(summary.quarterNumber).toBe(2);
      expect(summary.isMonth1Compliant).toBe(false); // Month 4 is month 1 of Q2
      expect(summary.warningReasons).toContain(
        'Il primo mese del trimestre ha un saldo negativo (< 0)'
      );
      // Total delta must only sum months 4, 5, 6 (-10 + 40 + 20 = 50)
      expect(summary.totalDeltaMinutes).toBe(50);
      expect(summary.monthDeltas).toEqual([
        { month: 4, deltaMinutes: -10 },
        { month: 5, deltaMinutes: 40 },
        { month: 6, deltaMinutes: 20 },
      ]);
    });

    it('supports overloaded call signature with quarterId string (e.g. "2026-Q3")', () => {
      const deltas: MonthDeltaInfo[] = [
        { month: 7, deltaMinutes: 10 },
        { month: 8, deltaMinutes: 20 },
        { month: 9, deltaMinutes: 30 },
      ];

      const summary = calculateQuarterBalance('2026-Q3', deltas);

      expect(summary.quarterId).toBe('2026-Q3');
      expect(summary.year).toBe(2026);
      expect(summary.quarterNumber).toBe(3);
      expect(summary.totalDeltaMinutes).toBe(60);
      expect(summary.isMonth1Compliant).toBe(true);
      expect(summary.canCoverDeficit).toBe(true);
    });

    it('handles empty or missing month deltas gracefully by defaulting to 0', () => {
      const summary = calculateQuarterBalance(2026, 4, []);

      expect(summary.quarterId).toBe('2026-Q4');
      expect(summary.year).toBe(2026);
      expect(summary.quarterNumber).toBe(4);
      expect(summary.totalDeltaMinutes).toBe(0);
      expect(summary.isMonth1Compliant).toBe(true);
      expect(summary.canCoverDeficit).toBe(true);
      expect(summary.warningReasons).toHaveLength(0);
      expect(summary.monthDeltas).toEqual([
        { month: 10, deltaMinutes: 0 },
        { month: 11, deltaMinutes: 0 },
        { month: 12, deltaMinutes: 0 },
      ]);
    });

    it('correctly handles unordered monthly deltas', () => {
      const deltas: MonthDeltaInfo[] = [
        { month: 3, deltaMinutes: 15 },
        { month: 1, deltaMinutes: 45 },
        { month: 2, deltaMinutes: 30 },
      ];

      const summary = calculateQuarterBalance(2026, 1, deltas);

      expect(summary.totalDeltaMinutes).toBe(90);
      expect(summary.monthDeltas[0]).toEqual({ month: 1, deltaMinutes: 45 });
      expect(summary.monthDeltas[1]).toEqual({ month: 2, deltaMinutes: 30 });
      expect(summary.monthDeltas[2]).toEqual({ month: 3, deltaMinutes: 15 });
    });
  });
});
