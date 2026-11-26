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

export interface QuarterlyMealVoucherSummary extends MealVoucherSummary {
  quarterId: string;
  quarterNumber: number;
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

/**
 * Calculates quarterly meal vouchers ledger summary across the 3 months of the quarter.
 *
 * Q1: Months 1, 2, 3
 * Q2: Months 4, 5, 6
 * Q3: Months 7, 8, 9
 * Q4: Months 10, 11, 12
 */
export function calculateQuarterlyMealVouchers(
  year: number,
  quarterNumber: number,
  daysMap: Record<string, { status?: string; date: string }>,
  timeEntriesMap: Record<string, { canteenUsed?: boolean; isSmartWork?: boolean; date: string }>,
  canteenCost?: number,
  smartValue?: number
): QuarterlyMealVoucherSummary {
  const quarterStartMonth = (quarterNumber - 1) * 3 + 1;
  const quarterEndMonth = quarterStartMonth + 2;

  let totalSmartCount = 0;
  let totalCanteenCount = 0;

  for (let m = quarterStartMonth; m <= quarterEndMonth; m++) {
    const paddedM = String(m).padStart(2, '0');
    const prefix = `${year}-${paddedM}-`;

    for (const [dateStr, entry] of Object.entries(timeEntriesMap)) {
      if (dateStr.startsWith(prefix) && entry.canteenUsed) {
        const day = daysMap[dateStr];
        if (!day || day.status === 'presenza') {
          totalCanteenCount++;
        }
      }
    }

    for (const [dateStr, day] of Object.entries(daysMap)) {
      if (dateStr.startsWith(prefix) && day.status === 'smart') {
        totalSmartCount++;
      }
    }
  }

  const baseSummary = calculateMealVouchers(
    totalCanteenCount,
    totalSmartCount,
    canteenCost,
    smartValue
  );

  return {
    ...baseSummary,
    quarterId: `${year}-Q${quarterNumber}`,
    quarterNumber,
  };
}
