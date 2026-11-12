/**
 * BancaOreManager Domain Engine
 *
 * Manages quarterly bank hours calculations, isolation across quarters,
 * validation of Month 1 non-negative balance, and progressive capacity/deficit tracking.
 */

export interface MonthDeltaInfo {
  month: number; // 1-12
  deltaMinutes: number;
}

export interface QuarterInfo {
  quarterId: string; // e.g. "2026-Q1"
  year: number;
  quarterNumber: number; // 1, 2, 3, 4
  startMonth: number; // e.g. 1 for Q1
  endMonth: number;   // e.g. 3 for Q1
}

export interface QuarterSummary {
  quarterId: string;
  year: number;
  quarterNumber: number;
  monthDeltas: MonthDeltaInfo[];
  totalDeltaMinutes: number;
  isMonth1Compliant: boolean; // Delta del primo mese del trimestre >= 0
  canCoverDeficit: boolean;   // true se totalDeltaMinutes >= 0 o se i deficit dei mesi 2/3 sono coperti
  warningReasons: string[];
}

/**
 * Returns quarter details for a given year and month (1-12).
 *
 * Q1: Months 1, 2, 3 (Jan - Mar)
 * Q2: Months 4, 5, 6 (Apr - Jun)
 * Q3: Months 7, 8, 9 (Jul - Sep)
 * Q4: Months 10, 11, 12 (Oct - Dec)
 */
export function getQuarterForMonth(year: number, month: number): QuarterInfo {
  if (month < 1 || month > 12 || !Number.isInteger(month)) {
    throw new Error(`Invalid month: ${month}. Month must be an integer between 1 and 12.`);
  }

  const quarterNumber = Math.ceil(month / 3);
  const startMonth = (quarterNumber - 1) * 3 + 1;
  const endMonth = quarterNumber * 3;
  const quarterId = `${year}-Q${quarterNumber}`;

  return {
    quarterId,
    year,
    quarterNumber,
    startMonth,
    endMonth,
  };
}

/**
 * Calculates quarterly bank hours balance.
 *
 * Overload 1: calculateQuarterBalance(year: number, quarterNumber: number, monthlyDeltas: MonthDeltaInfo[])
 * Overload 2: calculateQuarterBalance(quarterId: string, monthlyDeltas: MonthDeltaInfo[])
 */
export function calculateQuarterBalance(
  year: number,
  quarterNumber: number,
  monthlyDeltas: MonthDeltaInfo[]
): QuarterSummary;
export function calculateQuarterBalance(
  quarterId: string,
  monthlyDeltas: MonthDeltaInfo[]
): QuarterSummary;
export function calculateQuarterBalance(
  yearOrQuarterId: number | string,
  quarterNumberOrMonthlyDeltas: number | MonthDeltaInfo[],
  maybeMonthlyDeltas?: MonthDeltaInfo[]
): QuarterSummary {
  let year: number;
  let quarterNumber: number;
  let monthlyDeltas: MonthDeltaInfo[];

  if (typeof yearOrQuarterId === 'string') {
    const parts = yearOrQuarterId.split('-Q');
    year = parseInt(parts[0], 10);
    quarterNumber = parseInt(parts[1], 10);
    monthlyDeltas = (quarterNumberOrMonthlyDeltas as MonthDeltaInfo[]) || [];
  } else {
    year = yearOrQuarterId;
    quarterNumber = quarterNumberOrMonthlyDeltas as number;
    monthlyDeltas = maybeMonthlyDeltas || [];
  }

  const startMonth = (quarterNumber - 1) * 3 + 1;
  const endMonth = quarterNumber * 3;
  const quarterId = `${year}-Q${quarterNumber}`;

  const month1 = startMonth;
  const month2 = startMonth + 1;
  const month3 = endMonth;

  // Extract deltas specifically for the 3 months of this quarter (enforcing quarter isolation)
  const d1 = monthlyDeltas.find(d => d.month === month1)?.deltaMinutes ?? 0;
  const d2 = monthlyDeltas.find(d => d.month === month2)?.deltaMinutes ?? 0;
  const d3 = monthlyDeltas.find(d => d.month === month3)?.deltaMinutes ?? 0;

  const monthDeltas: MonthDeltaInfo[] = [
    { month: month1, deltaMinutes: d1 },
    { month: month2, deltaMinutes: d2 },
    { month: month3, deltaMinutes: d3 },
  ];

  const totalDeltaMinutes = d1 + d2 + d3;
  const isMonth1Compliant = d1 >= 0;

  // Progressive cumulative balances
  const cum2 = d1 + d2;
  const cum3 = totalDeltaMinutes;

  const canCoverDeficit = totalDeltaMinutes >= 0;

  const warningReasons: string[] = [];

  if (!isMonth1Compliant) {
    warningReasons.push('Il primo mese del trimestre ha un saldo negativo (< 0)');
  }

  if (cum2 < 0 || cum3 < 0) {
    warningReasons.push('Il saldo cumulato del trimestre scende sotto zero (deficit di capienza)');
  }

  return {
    quarterId,
    year,
    quarterNumber,
    monthDeltas,
    totalDeltaMinutes,
    isMonth1Compliant,
    canCoverDeficit,
    warningReasons,
  };
}
