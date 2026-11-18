import React, { useMemo } from 'react';
import { useWorkOrganizer } from '../../context/WorkOrganizerContext';
import { calculateDailyTime, minutesToHHmm } from '../../core/domain/timeCalculator';
import { isItalianHoliday, DayStatus } from '../../core/domain/policyValidator';
import styles from './Timbrature.module.css';

export interface TimbratureTableProps {
  onRowClick?: (date: string) => void;
  readOnly?: boolean;
}

const SHORT_WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

function getStatusLabel(status?: DayStatus): string {
  switch (status) {
    case 'presenza':
      return 'Presenza';
    case 'smart':
      return 'Smart';
    case 'idea_smart':
      return 'Idea Smart';
    case 'ferie':
      return 'Ferie';
    case 'idea_ferie':
      return 'Idea Ferie';
    case 'par':
      return 'PAR';
    case 'idea_par':
      return 'Idea PAR';
    case 'chiusura':
      return 'Chiusura';
    case 'non_lavorativo':
      return 'Non Lav.';
    default:
      return '-';
  }
}

function getStatusClass(status?: DayStatus): string {
  switch (status) {
    case 'presenza':
      return styles.statusPresenza;
    case 'smart':
      return styles.statusSmart;
    case 'idea_smart':
      return styles.statusIdeaSmart;
    case 'ferie':
      return styles.statusFerie;
    case 'idea_ferie':
      return styles.statusIdeaFerie;
    case 'par':
      return styles.statusPar;
    case 'idea_par':
      return styles.statusIdeaPar;
    case 'chiusura':
      return styles.statusChiusura;
    case 'non_lavorativo':
      return styles.statusNonLavorativo;
    default:
      return '';
  }
}

export const TimbratureTable: React.FC<TimbratureTableProps> = ({ onRowClick, readOnly = false }) => {
  const {
    currentYear,
    currentMonth,
    selectedDate,
    setSelectedDate,
    days,
    timeEntries,
    settings,
    updateDayStatus,
  } = useWorkOrganizer();

  const monthDates = useMemo(() => {
    const lastDay = new Date(currentYear, currentMonth, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => {
      const day = i + 1;
      const paddedM = String(currentMonth).padStart(2, '0');
      const paddedD = String(day).padStart(2, '0');
      return `${currentYear}-${paddedM}-${paddedD}`;
    });
  }, [currentYear, currentMonth]);

  // Compute monthly calculations and totals
  const { rowsData, totals } = useMemo(() => {
    let totalWorkedMinutes = 0;
    let totalDeltaMinutes = 0;
    let totalCanteenVouchers = 0;
    let workedDaysCount = 0;

    const rows = monthDates.map((dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const dayOfWeek = SHORT_WEEKDAYS[dateObj.getDay()];
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const isHoliday = isItalianHoliday(dateStr);

      const entry = timeEntries[dateStr];
      const day = days[dateStr];
      const isSmart = Boolean(entry?.isSmartWork || day?.status === 'smart');

      const calc = calculateDailyTime(
        {
          morningIn: entry?.morningIn,
          lunchOut: entry?.lunchOut,
          lunchIn: entry?.lunchIn,
          eveningOut: entry?.eveningOut,
          permissionMinutes: entry?.permissionMinutes,
          isSmartWork: isSmart,
        },
        settings.minLunchBreakMinutes
      );

      if (calc.workedMinutes > 0) {
        totalWorkedMinutes += calc.workedMinutes;
        totalDeltaMinutes += calc.deltaMinutes;
        workedDaysCount++;
      }

      if (entry?.canteenUsed) {
        totalCanteenVouchers++;
      }

      const effectiveStatus: DayStatus | undefined =
        day?.status ??
        (isSmart ? 'smart' : calc.workedMinutes > 0 ? 'presenza' : isWeekend || isHoliday ? 'non_lavorativo' : undefined);

      return {
        dateStr,
        dayNumber: d,
        dayOfWeek,
        isWeekend,
        isHoliday,
        status: effectiveStatus,
        entry,
        day,
        calc,
        isSmart,
      };
    });

    return {
      rowsData: rows,
      totals: {
        totalWorkedMinutes,
        totalDeltaMinutes,
        totalCanteenVouchers,
        workedDaysCount,
      },
    };
  }, [monthDates, timeEntries, days, settings.minLunchBreakMinutes]);

  const handleRowClick = (dateStr: string) => {
    setSelectedDate(dateStr);
    onRowClick?.(dateStr);
  };

  return (
    <div className={styles.tableWrapper} data-testid="timbrature-table">
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Giorno</th>
            <th>Stato</th>
            <th>Entrata</th>
            <th>Usc. Pranzo</th>
            <th>Rientro</th>
            <th>Pausa</th>
            <th>Usc. Sera</th>
            <th>Permessi</th>
            <th>Ore Lav.</th>
            <th>Uscita 7h</th>
            <th>Uscita 8h</th>
            <th>Delta</th>
            <th>Mensa</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {rowsData.map((row) => {
            const isSelected = row.dateStr === selectedDate;
            const deltaSign = row.calc.deltaMinutes >= 0 ? styles.mathPositive : styles.mathNegative;

            return (
              <tr
                key={row.dateStr}
                data-testid={`row-${row.dateStr}`}
                data-selected={isSelected ? 'true' : 'false'}
                data-weekend={row.isWeekend ? 'true' : 'false'}
                data-holiday={row.isHoliday ? 'true' : 'false'}
                onClick={() => handleRowClick(row.dateStr)}
              >
                <td className={styles.dayCell}>
                  <span>{String(row.dayNumber).padStart(2, '0')}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{row.dayOfWeek}</span>
                </td>

                <td>
                  {readOnly ? (
                    row.status ? (
                      <span className={`${styles.statusBadge} ${getStatusClass(row.status)}`}>
                        {getStatusLabel(row.status)}
                      </span>
                    ) : (
                      '-'
                    )
                  ) : (
                    /* 
                      CONTROLLO INSERIMENTO RAPIDO DA TABELLA:
                      Decommentare/usare questo blocco quando si desidera permettere la modifica diretta
                      dello stato dalla tabella timbrature:
                    */
                    <select
                      className={`${styles.statusSelect} ${getStatusClass(row.status)}`}
                      data-testid={`status-select-${row.dateStr}`}
                      value={row.status || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        const newStatus = e.target.value as DayStatus;
                        updateDayStatus(row.dateStr, newStatus);
                      }}
                    >
                      <option value="">-</option>
                      <option value="presenza">Presenza</option>
                      <option value="smart">Smart Working</option>
                      <option value="idea_smart">Idea Smart</option>
                      <option value="ferie">Ferie</option>
                      <option value="idea_ferie">Idea Ferie</option>
                      <option value="par">PAR</option>
                      <option value="idea_par">Idea PAR</option>
                      <option value="chiusura">Chiusura</option>
                      <option value="non_lavorativo">Non Lavorativo</option>
                    </select>
                  )}
                </td>

                <td>{row.entry?.morningIn || '-'}</td>
                <td>{row.entry?.lunchOut || '-'}</td>
                <td>{row.entry?.lunchIn || '-'}</td>
                <td>
                  {row.isSmart
                    ? '00:00'
                    : row.calc.lunchDurationMinutes > 0
                    ? minutesToHHmm(row.calc.lunchDurationMinutes)
                    : '-'}
                </td>
                <td>{row.entry?.eveningOut || '-'}</td>
                <td>
                  {row.entry?.permissionMinutes ? minutesToHHmm(row.entry.permissionMinutes) : '-'}
                </td>
                <td style={{ fontWeight: 600 }}>
                  {row.calc.workedMinutes > 0 ? minutesToHHmm(row.calc.workedMinutes) : '-'}
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>
                  {row.calc.expectedExit7h || '-'}
                </td>
                <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                  {row.calc.expectedExit8h || '-'}
                </td>
                <td
                  className={row.calc.workedMinutes > 0 ? deltaSign : undefined}
                  style={{ fontWeight: 600 }}
                >
                  {row.calc.workedMinutes > 0 ? minutesToHHmm(row.calc.deltaMinutes, true) : '-'}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {row.entry?.canteenUsed ? '🍽️' : '-'}
                </td>
                <td style={{ color: 'var(--text-secondary)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {row.day?.notes || '-'}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr data-testid="timbrature-totals-row">
            <td colSpan={2}>
              Totali Mese ({totals.workedDaysCount} gg)
            </td>
            <td colSpan={6}>-</td>
            <td data-testid="total-worked-hours" style={{ fontWeight: 700 }}>
              {minutesToHHmm(totals.totalWorkedMinutes)}
            </td>
            <td colSpan={2}>-</td>
            <td
              data-testid="total-delta"
              className={totals.totalDeltaMinutes >= 0 ? styles.mathPositive : styles.mathNegative}
              style={{ fontWeight: 700 }}
            >
              {minutesToHHmm(totals.totalDeltaMinutes, true)}
            </td>
            <td data-testid="total-canteen-vouchers" style={{ textAlign: 'center', fontWeight: 700 }}>
              {totals.totalCanteenVouchers}
            </td>
            <td>-</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};
