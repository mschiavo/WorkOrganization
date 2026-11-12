/**
 * MealVouchersLedger Domain Engine
 *
 * Calculates canteen expenses, smart working voucher accruals,
 * and net financial balances with 2-decimal precision.
 */

export interface MealVoucherSummary {
  canteenUsedCount: number;
  canteenCostPerUnit: number;        // Default 1.50
  totalCanteenExpense: number;       // canteenUsedCount * 1.50
  smartVoucherCount: number;
  smartVoucherValuePerUnit: number;   // Default 8.00
  totalSmartVouchersValue: number;   // smartVoucherCount * 8.00
  netBalance: number;                // totalSmartVouchersValue - totalCanteenExpense
}

/**
 * Calculates meal vouchers ledger summary.
 *
 * @param canteenCount - Number of canteen meals used in presence (default unit cost: 1.50€)
 * @param smartCount - Number of smart working days accrued for meal vouchers (default unit value: 8.00€)
 * @param canteenCost - Optional override for canteen unit cost (default: 1.50€)
 * @param smartValue - Optional override for smart voucher unit value (default: 8.00€)
 */
export function calculateMealVouchers(
  canteenCount: number,
  smartCount: number,
  canteenCost?: number,
  smartValue?: number
): MealVoucherSummary {
  const safeCanteenCount = Math.max(0, isNaN(canteenCount) ? 0 : canteenCount);
  const safeSmartCount = Math.max(0, isNaN(smartCount) ? 0 : smartCount);

  const safeCanteenCost = canteenCost !== undefined && !isNaN(canteenCost) ? canteenCost : 1.50;
  const safeSmartValue = smartValue !== undefined && !isNaN(smartValue) ? smartValue : 8.00;

  // Rounding to 2 decimal places to prevent JavaScript floating point precision issues
  const totalCanteenExpense = Math.round(safeCanteenCount * safeCanteenCost * 100) / 100;
  const totalSmartVouchersValue = Math.round(safeSmartCount * safeSmartValue * 100) / 100;
  const netBalance = Math.round((totalSmartVouchersValue - totalCanteenExpense) * 100) / 100;

  return {
    canteenUsedCount: safeCanteenCount,
    canteenCostPerUnit: safeCanteenCost,
    totalCanteenExpense,
    smartVoucherCount: safeSmartCount,
    smartVoucherValuePerUnit: safeSmartValue,
    totalSmartVouchersValue,
    netBalance,
  };
}
