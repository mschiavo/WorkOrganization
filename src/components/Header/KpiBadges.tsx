import React from 'react';
import { Laptop, Clock, Utensils, Palmtree } from 'lucide-react';
import { useWorkOrganizer } from '../../context/WorkOrganizerContext';
import { MonthValidationResult } from '../../core/domain/policyValidator';
import { QuarterSummary } from '../../core/domain/bancaOreManager';
import { MealVoucherSummary } from '../../core/domain/mealVouchersLedger';
import { LeaveBalanceSummary } from '../../core/domain/leaveManager';
import { minutesToHHmm } from '../../core/domain/timeCalculator';
import styles from './Header.module.css';

export interface KpiBadgesProps {
  monthValidation?: MonthValidationResult;
  quarterSummary?: QuarterSummary;
  mealVouchers?: MealVoucherSummary;
  leaveBalance?: LeaveBalanceSummary;
  maxSmartDays?: number;
}

export const KpiBadges: React.FC<KpiBadgesProps> = ({
  monthValidation: propValidation,
  quarterSummary: propQuarter,
  mealVouchers: propVouchers,
  leaveBalance: propLeave,
  maxSmartDays: propMaxSmart,
}) => {
  let ctxValidation: MonthValidationResult | undefined;
  let ctxQuarter: QuarterSummary | undefined;
  let ctxVouchers: MealVoucherSummary | undefined;
  let ctxLeave: LeaveBalanceSummary | undefined;
  let ctxMaxSmart: number | undefined;

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const context = useWorkOrganizer();
    ctxValidation = context.monthValidation;
    ctxQuarter = context.quarterSummary;
    ctxVouchers = context.mealVouchers;
    ctxLeave = context.leaveBalance;
    ctxMaxSmart = context.settings.maxSmartDaysMonth;
  } catch {
    // Standalone usage
  }

  const validation = propValidation ?? ctxValidation;
  const quarter = propQuarter ?? ctxQuarter;
  const vouchers = propVouchers ?? ctxVouchers;
  const leave = propLeave ?? ctxLeave;
  const maxSmart = propMaxSmart ?? ctxMaxSmart ?? 10;

  if (!validation || !quarter || !vouchers) {
    return null;
  }

  const bancaOreStatus = quarter.totalDeltaMinutes >= 0 ? 'positive' : 'negative';
  const vouchersStatus = vouchers.netBalance >= 0 ? 'positive' : 'negative';

  return (
    <div className={styles.kpiGroup}>
      <div
        className={styles.kpiBadge}
        data-testid="kpi-smart"
        data-status={validation.smartStatus}
        title={`Smart svolti: ${validation.smartDoneDays}, pianificati: ${validation.smartPlannedDays}`}
      >
        <Laptop size={14} />
        <span>
          Smart: {validation.totalSmartDays}/{maxSmart} gg
        </span>
      </div>

      <div
        className={styles.kpiBadge}
        data-testid="kpi-banca-ore"
        data-status={bancaOreStatus}
        title={`Saldo cumulato ${quarter.quarterId}`}
      >
        <Clock size={14} />
        <span>
          {quarter.quarterId}: {minutesToHHmm(quarter.totalDeltaMinutes, true)}
        </span>
      </div>

      <div
        className={styles.kpiBadge}
        data-testid="kpi-buoni"
        data-status={vouchersStatus}
        title={`Smart maturate: € ${(vouchers.smartVoucherCount * vouchers.smartVoucherValuePerUnit).toFixed(2)}, Mensa usata: € ${(vouchers.canteenUsedCount * vouchers.canteenCostPerUnit).toFixed(2)}`}
      >
        <Utensils size={14} />
        <span>Buoni: € {vouchers.netBalance.toFixed(2)}</span>
      </div>

      {leave && (
        <div
          className={styles.kpiBadge}
          data-testid="kpi-ferie"
          data-status={leave.ferieRemainingHours >= 0 ? 'positive' : 'negative'}
          title={`Ferie Spettanti: ${leave.ferieTotalEntitledHours}h, Godute: ${leave.ferieTakenHours}h, Pianificate: ${leave.feriePlannedHours}h`}
        >
          <Palmtree size={14} />
          <span>Ferie: {leave.ferieRemainingHours}h</span>
        </div>
      )}

      {leave && (
        <div
          className={styles.kpiBadge}
          data-testid="kpi-par"
          data-status={leave.parRemainingHours >= 0 ? 'positive' : 'negative'}
          title={`PAR Spettanti: ${leave.parTotalEntitledHours}h, Usati: ${leave.parTakenHours}h`}
        >
          <Clock size={14} />
          <span>PAR: {leave.parRemainingHours}h</span>
        </div>
      )}
    </div>
  );
};
