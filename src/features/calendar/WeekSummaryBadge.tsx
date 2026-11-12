import React from 'react';
import { WeekValidationResult } from '../../core/domain/policyValidator';
import styles from './Calendar.module.css';

export interface WeekSummaryBadgeProps {
  week: WeekValidationResult;
  compact?: boolean;
}

export const WeekSummaryBadge: React.FC<WeekSummaryBadgeProps> = ({ week, compact = false }) => {
  return (
    <div
      className={styles.weekSummaryBadge}
      data-testid={`week-summary-${week.weekNumber}`}
      data-compliant={week.isCompliant ? 'true' : 'false'}
    >
      {week.isCompliant ? (
        <>
          <span>✓ Settimana {week.weekNumber}: Conforme</span>
          {!compact && (
            <span className={styles.weekStats}>
              ({week.presenceCount} Presenza, {week.smartCount} Smart)
            </span>
          )}
        </>
      ) : (
        <>
          <span>⚠ Settimana {week.weekNumber}:</span>
          <span className={styles.weekErrorReason} data-testid="week-error-reason">
            {week.errorReason || 'Non conforme'}
          </span>
          {!compact && (
            <span className={styles.weekStats}>
              ({week.presenceCount} Pres., {week.smartCount} Smart)
            </span>
          )}
        </>
      )}
    </div>
  );
};
