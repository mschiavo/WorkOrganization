import React from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useWorkOrganizer } from '../../context/WorkOrganizerContext';
import styles from './Header.module.css';

export interface MonthSelectorProps {
  currentYear?: number;
  currentMonth?: number;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onToday?: () => void;
}

const ITALIAN_MONTHS = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
];

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  currentYear: propYear,
  currentMonth: propMonth,
  onPrevMonth: propPrev,
  onNextMonth: propNext,
  onToday: propToday,
}) => {
  let ctxYear: number | undefined;
  let ctxMonth: number | undefined;
  let ctxPrev: (() => void) | undefined;
  let ctxNext: (() => void) | undefined;
  let ctxToday: (() => void) | undefined;

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const context = useWorkOrganizer();
    ctxYear = context.currentYear;
    ctxMonth = context.currentMonth;
    ctxPrev = context.goToPrevMonth;
    ctxNext = context.goToNextMonth;
    ctxToday = context.goToToday;
  } catch {
    // Used standalone outside WorkOrganizerProvider
  }

  const year = propYear ?? ctxYear ?? new Date().getFullYear();
  const month = propMonth ?? ctxMonth ?? new Date().getMonth() + 1;
  const onPrev = propPrev ?? ctxPrev;
  const onNext = propNext ?? ctxNext;
  const onToday = propToday ?? ctxToday;

  const monthName = ITALIAN_MONTHS[month - 1] ?? '';

  return (
    <div className={styles.monthSelector}>
      <button
        type="button"
        className={styles.navBtn}
        onClick={onPrev}
        data-testid="btn-prev-month"
        aria-label="Mese precedente"
      >
        <ChevronLeft size={18} />
      </button>

      <span className={styles.monthDisplay} data-testid="month-display">
        {monthName} {year}
      </span>

      <button
        type="button"
        className={styles.navBtn}
        onClick={onNext}
        data-testid="btn-next-month"
        aria-label="Mese successivo"
      >
        <ChevronRight size={18} />
      </button>

      {onToday && (
        <button
          type="button"
          className={styles.todayBtn}
          onClick={onToday}
          data-testid="btn-today"
          title="Torna ad oggi"
        >
          <CalendarIcon size={13} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
          Oggi
        </button>
      )}
    </div>
  );
};
