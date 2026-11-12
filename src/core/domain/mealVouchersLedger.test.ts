import { describe, it, expect } from 'vitest';
import {
  calculateMealVouchers,
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
});
