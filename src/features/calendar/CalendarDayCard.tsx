import React from 'react';
import { DayStatus } from '../../core/domain/policyValidator';
import styles from './Calendar.module.css';

export interface CalendarDayCardProps {
  date: string; // "YYYY-MM-DD"
  dayNumber: number;
  status?: DayStatus;
  notes?: string;
  isConfirmed?: boolean;
  isToday?: boolean;
  isSelected?: boolean;
  isOutsideMonth?: boolean;
  isHoliday?: boolean;
  isWeekend?: boolean;
  holidayName?: string;
  compact?: boolean;
  onClick?: (date: string) => void;
}

const STATUS_LABELS: Record<DayStatus, string> = {
  presenza: 'Presenza',
  smart: 'Smart',
  idea_smart: 'Idea Smart',
  ferie: 'Ferie',
  idea_ferie: 'Idea Ferie',
  chiusura: 'Chiusura',
  non_lavorativo: 'Non Lavorativo',
};

export const CalendarDayCard: React.FC<CalendarDayCardProps> = ({
  date,
  dayNumber,
  status,
  notes,
  isConfirmed = false,
  isToday = false,
  isSelected = false,
  isOutsideMonth = false,
  isHoliday = false,
  isWeekend = false,
  holidayName,
  compact = false,
  onClick,
}) => {
  const handleClick = () => {
    onClick?.(date);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(date);
    }
  };

  const statusLabel = status
    ? (isHoliday && status === 'non_lavorativo' ? 'Festivo' : STATUS_LABELS[status])
    : (compact ? '—' : 'Non impostato');

  return (
    <div
      className={`${styles.dayCard} ${compact ? styles.dayCardCompact : ''}`}
      data-testid={`day-card-${date}`}
      data-compact={compact ? 'true' : 'false'}
      data-status={status || 'empty'}
      data-today={isToday ? 'true' : 'false'}
      data-selected={isSelected ? 'true' : 'false'}
      data-weekend={isWeekend ? 'true' : 'false'}
      data-outside-month={isOutsideMonth ? 'true' : 'false'}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${date} - ${statusLabel}`}
    >
      <div className={styles.cardHeader}>
        <span className={styles.dayNumber} data-testid="day-number">
          {dayNumber}
        </span>
        <div className={styles.headerBadges}>
          {isHoliday && (
            <span
              className={styles.holidayBadge}
              data-testid="day-holiday-badge"
              title={holidayName || 'Festivo nazionale'}
            >
              Festivo
            </span>
          )}
          {isConfirmed && (
            <span
              className={styles.confirmedIcon}
              data-testid="day-confirmed-icon"
              title="Confermato"
            >
              ✓
            </span>
          )}
          {notes && (
            <span
              className={styles.notesIcon}
              data-testid="day-notes-indicator"
              title={notes}
            >
              📝
            </span>
          )}
        </div>
      </div>

      <div className={styles.cardBody}>
        <div
          className={styles.statusBadge}
          data-testid="day-status-badge"
          data-status={status || 'empty'}
          title={statusLabel}
        >
          {statusLabel}
        </div>
        {notes && !compact && (
          <div className={styles.notesExcerpt} title={notes}>
            {notes}
          </div>
        )}
      </div>
    </div>
  );
};
