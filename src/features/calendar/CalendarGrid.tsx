import React from 'react';
import { useWorkOrganizer } from '../../context/WorkOrganizerContext';
import { isItalianHoliday } from '../../core/domain/policyValidator';
import { CalendarDayCard } from './CalendarDayCard';
import { WeekSummaryBadge } from './WeekSummaryBadge';
import styles from './Calendar.module.css';

export interface CalendarGridProps {
  onSelectDay?: (date: string) => void;
  compact?: boolean;
}

const WEEKDAY_NAMES = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

function getDaysInWeek(startDateStr: string): string[] {
  const result: string[] = [];
  const [y, m, d] = startDateStr.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  for (let i = 0; i < 7; i++) {
    const cur = new Date(start);
    cur.setDate(start.getDate() + i);
    const yr = cur.getFullYear();
    const mo = String(cur.getMonth() + 1).padStart(2, '0');
    const da = String(cur.getDate()).padStart(2, '0');
    result.push(`${yr}-${mo}-${da}`);
  }
  return result;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ onSelectDay, compact = false }) => {
  const {
    currentMonth,
    selectedDate,
    setSelectedDate,
    days,
    timeEntries,
    monthValidation,
  } = useWorkOrganizer();

  const now = new Date();
  const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const handleDayClick = (date: string) => {
    setSelectedDate(date);
    onSelectDay?.(date);
  };

  return (
    <div
      className={styles.calendarContainer}
      data-testid="calendar-grid"
      data-compact={compact ? 'true' : 'false'}
    >
      {/* Weekday column headers (Monday through Sunday) */}
      <div className={styles.weekdayHeaderRow}>
        {WEEKDAY_NAMES.map((name, idx) => (
          <div
            key={name}
            className={`${styles.weekdayHeaderCell} ${
              idx >= 5 ? styles.weekdayHeaderCellWeekend : ''
            }`}
          >
            {name}
          </div>
        ))}
      </div>

      {/* Week Rows */}
      <div className={`${styles.weeksContainer} ${compact ? styles.weeksContainerCompact : ''}`}>
        {monthValidation.weeks.map((week) => {
          const weekDates = getDaysInWeek(week.startDate);

          return (
            <div
              key={week.weekNumber}
              className={`${styles.weekRow} ${compact ? styles.weekRowCompact : ''}`}
            >
              {/* Week summary badge */}
              <div className={compact ? styles.weekSummaryCompact : styles.weekSummaryWrapper}>
                <WeekSummaryBadge week={week} compact={compact} />
              </div>

              {/* 7 Days Grid */}
              <div className={`${styles.daysGrid} ${compact ? styles.daysGridCompact : ''}`}>
                {weekDates.map((dateStr) => {
                  const dayRecord = days[dateStr];
                  const [yStr, mStr, dStr] = dateStr.split('-');
                  const dateYear = parseInt(yStr, 10);
                  const dateMonth = parseInt(mStr, 10);
                  const dayNumber = parseInt(dStr, 10);
                  const dateObj = new Date(dateYear, dateMonth - 1, dayNumber);
                  const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6; // Sun or Sat
                  const isHoliday = isItalianHoliday(dateStr);
                  const effectiveStatus = dayRecord?.status ?? (isWeekend || isHoliday ? 'non_lavorativo' : undefined);

                  return (
                    <CalendarDayCard
                      key={dateStr}
                      date={dateStr}
                      dayNumber={dayNumber}
                      status={effectiveStatus}
                      notes={dayRecord?.notes}
                      isConfirmed={dayRecord?.isConfirmed}
                      isToday={dateStr === todayString}
                      isSelected={dateStr === selectedDate}
                      isOutsideMonth={dateMonth !== currentMonth}
                      isHoliday={isHoliday}
                      isWeekend={isWeekend}
                      isFuture={dateStr > todayString}
                      canteenUsed={timeEntries[dateStr]?.canteenUsed}
                      compact={compact}
                      onClick={handleDayClick}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
