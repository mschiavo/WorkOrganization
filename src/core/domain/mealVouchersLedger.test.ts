import { describe, it, expect } from 'vitest';
import {
  calculateMealVouchers,
  calculateQuarterlyMealVouchers,
  MealVoucherSummary,
} from './mealVouchersLedger';

describe('MealVouchersLedger Domain Engine', () => {
  describe('calculateMealVouchers', () => {
    it('calculates voucher summary with default rates (canteen 1.50€, smart 8.00€)', () => {
      // 6 canteen meals, 10 smart working vouchers
      // Expense: 6 * 1.50 = 9.00
      // Value: 10 * 8.00 = 80.00
      // Net: 80.00 - 9.00 = +71.00
      const summary = calculateMealVouchers(6, 10);

      expect(summary).toEqual<MealVoucherSummary>({
        canteenUsedCount: 6,
        canteenCostPerUnit: 1.50,
        totalCanteenExpense: 9.00,
        smartVoucherCount: 10,
        smartVoucherValuePerUnit: 8.00,
        totalSmartVouchersValue: 80.00,
        netBalance: 71.00,
      });
    });

    it('handles zero canteen usage and full smart vouchers', () => {
      // 0 canteen, 15 smart working days
      // Expense: 0.00, Value: 15 * 8.00 = 120.00, Net: +120.00
      const summary = calculateMealVouchers(0, 15);

      expect(summary.canteenUsedCount).toBe(0);
      expect(summary.totalCanteenExpense).toBe(0.00);
      expect(summary.smartVoucherCount).toBe(15);
      expect(summary.totalSmartVouchersValue).toBe(120.00);
      expect(summary.netBalance).toBe(120.00);
    });

    it('handles presence-only usage (no smart vouchers)', () => {
      // 12 canteen meals, 0 smart vouchers
      // Expense: 12 * 1.50 = 18.00, Value: 0.00, Net: -18.00
      const summary = calculateMealVouchers(12, 0);

      expect(summary.canteenUsedCount).toBe(12);
      expect(summary.totalCanteenExpense).toBe(18.00);
      expect(summary.smartVoucherCount).toBe(0);
      expect(summary.totalSmartVouchersValue).toBe(0.00);
      expect(summary.netBalance).toBe(-18.00);
    });

    it('supports custom rates for canteen cost and smart voucher value', () => {
      // Custom: canteen 2.20€, smart 7.50€
      // Counts: 5 canteen, 8 smart
      // Expense: 5 * 2.20 = 11.00
      // Value: 8 * 7.50 = 60.00
      // Net: 60.00 - 11.00 = 49.00
      const summary = calculateMealVouchers(5, 8, 2.20, 7.50);

      expect(summary.canteenCostPerUnit).toBe(2.20);
      expect(summary.smartVoucherValuePerUnit).toBe(7.50);
      expect(summary.totalCanteenExpense).toBe(11.00);
      expect(summary.totalSmartVouchersValue).toBe(60.00);
      expect(summary.netBalance).toBe(49.00);
    });

    it('properly rounds monetary values to 2 decimal places preventing float drift', () => {
      // 7 canteen meals at 1.33€ = 9.31
      // 3 smart vouchers at 7.15€ = 21.45
      // Net balance: 21.45 - 9.31 = 12.14
      const summary = calculateMealVouchers(7, 3, 1.33, 7.15);

      expect(summary.totalCanteenExpense).toBe(9.31);
      expect(summary.totalSmartVouchersValue).toBe(21.45);
      expect(summary.netBalance).toBe(12.14);
    });

    it('safely handles negative or NaN counts by treating them as 0', () => {
      const summary = calculateMealVouchers(-5, -2);

      expect(summary.canteenUsedCount).toBe(0);
      expect(summary.smartVoucherCount).toBe(0);
      expect(summary.totalCanteenExpense).toBe(0.00);
      expect(summary.totalSmartVouchersValue).toBe(0.00);
      expect(summary.netBalance).toBe(0.00);
    });

    it('handles zero counts for both canteen and smart', () => {
      const summary = calculateMealVouchers(0, 0);

      expect(summary.canteenUsedCount).toBe(0);
      expect(summary.smartVoucherCount).toBe(0);
      expect(summary.totalCanteenExpense).toBe(0.00);
      expect(summary.totalSmartVouchersValue).toBe(0.00);
      expect(summary.netBalance).toBe(0.00);
    });
  });

  describe('calculateQuarterlyMealVouchers', () => {
    it('aggregates canteen and smart working days across the 3 months of the quarter', () => {
      const daysMap = {
        '2026-10-01': { date: '2026-10-01', status: 'presenza' },
        '2026-10-02': { date: '2026-10-02', status: 'smart' },
        '2026-11-05': { date: '2026-11-05', status: 'smart' },
        '2026-12-10': { date: '2026-12-10', status: 'smart' },
        // Out of quarter (September Q3)
        '2026-09-15': { date: '2026-09-15', status: 'smart' },
      };

      const timeEntriesMap = {
        // Oct: 1 canteen used
        '2026-10-01': { date: '2026-10-01', canteenUsed: true },
        // Nov: 1 canteen used
        '2026-11-02': { date: '2026-11-02', canteenUsed: true },
        // Out of quarter canteen (September Q3)
        '2026-09-15': { date: '2026-09-15', canteenUsed: true },
      };

      // Q4 is months 10, 11, 12
      // Smart count in Q4 = 3 (Oct 2, Nov 5, Dec 10) * 8.00€ = 24.00€
      // Canteen in Q4 = 2 (Oct 1, Nov 2) * 1.50€ = 3.00€
      // Net balance = 24.00 - 3.00 = +21.00€
      const result = calculateQuarterlyMealVouchers(
        2026,
        4,
        daysMap,
        timeEntriesMap
      );

      expect(result.quarterId).toBe('2026-Q4');
      expect(result.quarterNumber).toBe(4);
      expect(result.smartVoucherCount).toBe(3);
      expect(result.canteenUsedCount).toBe(2);
      expect(result.totalSmartVouchersValue).toBe(24.00);
      expect(result.totalCanteenExpense).toBe(3.00);
      expect(result.netBalance).toBe(21.00);
    });
  });
});
