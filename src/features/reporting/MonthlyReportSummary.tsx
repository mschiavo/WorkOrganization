import React, { useMemo } from 'react';
import { useWorkOrganizer } from '../../context/WorkOrganizerContext';
import { calculateDailyTime, minutesToHHmm } from '../../core/domain/timeCalculator';
import styles from './Reporting.module.css';

const ITALIAN_MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
];

export const MonthlyReportSummary: React.FC = () => {
  const {
    currentYear,
    currentMonth,
    days,
    timeEntries,
    settings,
    monthValidation,
    quarterSummary,
    mealVouchers,
    leaveBalance,
  } = useWorkOrganizer();

  const monthName = ITALIAN_MONTHS[currentMonth - 1] || '';

  const { totalWorkedMinutes, totalDeltaMinutes } = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const paddedM = String(currentMonth).padStart(2, '0');
    let worked = 0;
    let delta = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const paddedD = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${paddedM}-${paddedD}`;
      const entry = timeEntries[dateStr];
      const day = days[dateStr];
      const isSmart = day?.status === 'smart' || entry?.isSmartWork;

      if (isSmart) {
        worked += 480;
      } else if (entry) {
        const calc = calculateDailyTime(entry, settings.minLunchBreakMinutes);
        worked += calc.workedMinutes;
        if (entry.morningIn && entry.eveningOut) {
          delta += calc.deltaMinutes;
        }
      }
    }

    return { totalWorkedMinutes: worked, totalDeltaMinutes: delta };
  }, [currentYear, currentMonth, days, timeEntries, settings.minLunchBreakMinutes]);

  const nominalWorkMinutes = monthValidation.workingDaysCount * settings.standardDayHours * 60;

  return (
    <div className={styles.summaryCard} data-testid="monthly-report-summary">
      <div className={styles.summaryHeader}>
        <h2 className={styles.summaryTitle}>
          <span>📊 Report Mensile & Statistiche: {monthName} {currentYear}</span>
        </h2>
        <span className={styles.readOnlyBadge}>Modalità Consultazione (Pura Lettura)</span>
      </div>

      <div className={styles.statsGrid}>
        {/* Ore Lavorate */}
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Ore Lavorate Effettive</span>
          <span className={`${styles.statValue} ${styles.statHighlight}`} data-testid="report-stat-worked-hours">
            {minutesToHHmm(totalWorkedMinutes)}
          </span>
          <span className={styles.statSubtext}>
            Nominali: {minutesToHHmm(nominalWorkMinutes)} ({monthValidation.workingDaysCount} gg feriali)
          </span>
        </div>

        {/* Saldo Banca Ore Mese */}
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Delta Banca Ore Mese</span>
          <span
            className={`${styles.statValue} ${
              totalDeltaMinutes >= 0 ? styles.statPositive : styles.statNegative
            }`}
            data-testid="report-stat-delta-month"
          >
            {minutesToHHmm(totalDeltaMinutes, true)}
          </span>
          <span className={styles.statSubtext}>
            Cumulativo {quarterSummary.quarterId}: {minutesToHHmm(quarterSummary.totalDeltaMinutes, true)}
          </span>
        </div>

        {/* Presenze in sede */}
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Presenze in Sede</span>
          <span className={styles.statValue} data-testid="report-stat-presence-days">
            {monthValidation.presenceDays} gg
          </span>
          <span className={styles.statSubtext}>
            Minimo settimanale: {settings.minPresenceDaysWeek} gg / sett.
          </span>
        </div>

        {/* Smart Working */}
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Smart Working</span>
          <span className={styles.statValue} data-testid="report-stat-smart-days">
            {monthValidation.totalSmartDays} / {settings.maxSmartDaysMonth} gg
          </span>
          <span className={styles.statSubtext}>
            {monthValidation.smartDoneDays} svolti, {monthValidation.smartPlannedDays} pianificati (Stato: {monthValidation.smartStatus})
          </span>
        </div>

        {/* Assenze / Ferie */}
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Ferie & Chiusure</span>
          <span className={styles.statValue}>
            {monthValidation.ferieDays + monthValidation.closureDays} gg
          </span>
          <span className={styles.statSubtext}>
            {monthValidation.ferieDays} ferie, {monthValidation.closureDays} chiusure aziendali
          </span>
        </div>

        {/* Bilancio Buoni Pasto Trimestrali */}
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Saldo Buoni Pasto ({mealVouchers.quarterId || 'Trimestre'})</span>
          <span
            className={`${styles.statValue} ${
              mealVouchers.netBalance >= 0 ? styles.statPositive : styles.statNegative
            }`}
            data-testid="report-stat-net-vouchers"
          >
            € {mealVouchers.netBalance.toFixed(2)}
          </span>
          <span className={styles.statSubtext}>
            +{mealVouchers.smartVoucherCount} Smart (+€{(mealVouchers.smartVoucherCount * mealVouchers.smartVoucherValuePerUnit).toFixed(2)}) | -{mealVouchers.canteenUsedCount} Mense (-€{(mealVouchers.canteenUsedCount * mealVouchers.canteenCostPerUnit).toFixed(2)})
          </span>
        </div>

        {/* Ferie Annuali */}
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Ferie Annuali Residue</span>
          <span
            className={`${styles.statValue} ${leaveBalance.ferieRemainingHours >= 0 ? styles.statHighlight : styles.statNegative}`}
            data-testid="report-stat-ferie-balance"
          >
            {leaveBalance.ferieRemainingHours}h
          </span>
          <span className={styles.statSubtext}>
            Spettanti: {leaveBalance.ferieTotalEntitledHours}h | Godute: {leaveBalance.ferieTakenHours}h | Pianificate: {leaveBalance.feriePlannedHours}h
          </span>
        </div>

        {/* PAR Annuali */}
        <div className={styles.statBox}>
          <span className={styles.statLabel}>Permessi PAR Residui</span>
          <span
            className={`${styles.statValue} ${leaveBalance.parRemainingHours >= 0 ? styles.statPositive : styles.statNegative}`}
            data-testid="report-stat-par-balance"
          >
            {leaveBalance.parRemainingHours}h
          </span>
          <span className={styles.statSubtext}>
            Spettanti: {leaveBalance.parTotalEntitledHours}h | Usati: {leaveBalance.parTakenHours}h
          </span>
        </div>
      </div>
    </div>
  );
};
