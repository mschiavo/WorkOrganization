import React from 'react';
import { useWorkOrganizer } from '../../context/WorkOrganizerContext';
import { calculateDailyTime, minutesToHHmm } from '../../core/domain/timeCalculator';
import { DayStatus } from '../../core/domain/policyValidator';
import { TimeInput } from '../../components/common/TimeInput';
import styles from './Timbrature.module.css';

export interface DayDetailCardProps {
  date?: string;
  onClose?: () => void;
}

const STATUS_OPTIONS: { status: DayStatus; label: string }[] = [
  { status: 'presenza', label: 'Presenza' },
  { status: 'smart', label: 'Smart' },
  { status: 'idea_smart', label: 'Idea Smart' },
  { status: 'ferie', label: 'Ferie' },
  { status: 'idea_ferie', label: 'Idea Ferie' },
  { status: 'chiusura', label: 'Chiusura' },
  { status: 'non_lavorativo', label: 'Non Lav.' },
];

const WEEKDAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

function formatItalianDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayName = WEEKDAY_NAMES[dateObj.getDay()];
  const paddedDay = String(d).padStart(2, '0');
  const paddedMonth = String(m).padStart(2, '0');
  return `${dayName} ${paddedDay}/${paddedMonth}/${y}`;
}

export const DayDetailCard: React.FC<DayDetailCardProps> = ({ date, onClose }) => {
  const {
    selectedDate,
    timeEntries,
    days,
    settings,
    updateTimeEntry,
    updateDayStatus,
  } = useWorkOrganizer();

  const targetDate = date || selectedDate;
  const entry = timeEntries[targetDate] || { date: targetDate };
  const day = days[targetDate];
  const isSmart = Boolean(entry.isSmartWork || day?.status === 'smart');

  const calc = calculateDailyTime(
    {
      morningIn: entry.morningIn,
      lunchOut: entry.lunchOut,
      lunchIn: entry.lunchIn,
      eveningOut: entry.eveningOut,
      permissionMinutes: entry.permissionMinutes,
      isSmartWork: isSmart,
    },
    settings.minLunchBreakMinutes
  );

  const handleNow = async (field: 'morningIn' | 'lunchOut' | 'lunchIn' | 'eveningOut') => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    await updateTimeEntry(targetDate, { [field]: `${hh}:${mm}` });
  };

  const handleSmartToggle = async () => {
    if (isSmart) {
      await updateTimeEntry(targetDate, { isSmartWork: false });
      await updateDayStatus(targetDate, 'presenza');
    } else {
      await updateTimeEntry(targetDate, { isSmartWork: true });
      await updateDayStatus(targetDate, 'smart');
    }
  };

  return (
    <div className={styles.detailCard} data-testid="day-detail-card">
      <div className={styles.detailHeader}>
        <div className={styles.detailTitle}>
          Dettaglio Giornata: {formatItalianDate(targetDate)}
        </div>
        {onClose && (
          <button
            type="button"
            data-testid="detail-close-btn"
            className={styles.detailCloseBtn}
            onClick={onClose}
            aria-label="Chiudi dettaglio"
          >
            ✕
          </button>
        )}
      </div>

      {/* Smart Working Toggle */}
      <div className={styles.smartToggleRow}>
        <div>
          <strong>Modalità Lavoro</strong>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {isSmart ? 'Smart working attivo (8h nominali, 0 min pausa)' : 'Presenza fisica / Orari da timbratore'}
          </div>
        </div>
        <button
          type="button"
          data-testid="toggle-smart-work"
          className={styles.smartToggleBtn}
          data-active={isSmart ? 'true' : 'false'}
          onClick={handleSmartToggle}
        >
          {isSmart ? '✓ Smart Working Attivo' : 'Attiva Smart Working'}
        </button>
      </div>

      {/* Stato Giornata Buttons */}
      <div className={styles.statusSection}>
        <div className={styles.statusSectionLabel}>Stato Giornata:</div>
        <div className={styles.statusButtonsGrid}>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.status}
              type="button"
              data-testid={`btn-status-${opt.status}`}
              data-active={day?.status === opt.status ? 'true' : 'false'}
              className={styles.statusOptionBtn}
              onClick={async () => {
                await updateDayStatus(targetDate, opt.status);
                if (opt.status === 'smart') {
                  await updateTimeEntry(targetDate, { isSmartWork: true });
                } else if (opt.status === 'presenza') {
                  await updateTimeEntry(targetDate, { isSmartWork: false });
                }
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Time inputs with "Adesso" buttons */}
      <div className={styles.timeInputsGrid}>
        <div className={styles.timeInputGroup}>
          <label className={styles.timeInputLabel}>Entrata Mattina</label>
          <div className={styles.timeInputWithBtn}>
            <TimeInput
              data-testid="input-morningIn"
              className={styles.timeInput}
              value={entry.morningIn ?? ''}
              disabled={isSmart}
              onChange={(val) => updateTimeEntry(targetDate, { morningIn: val })}
            />
            <button
              type="button"
              data-testid="btn-now-morningIn"
              className={styles.nowBtn}
              disabled={isSmart}
              onClick={() => handleNow('morningIn')}
            >
              Adesso
            </button>
          </div>
        </div>

        <div className={styles.timeInputGroup}>
          <label className={styles.timeInputLabel}>Uscita Pranzo</label>
          <div className={styles.timeInputWithBtn}>
            <TimeInput
              data-testid="input-lunchOut"
              className={styles.timeInput}
              value={entry.lunchOut ?? ''}
              disabled={isSmart}
              onChange={(val) => updateTimeEntry(targetDate, { lunchOut: val })}
            />
            <button
              type="button"
              data-testid="btn-now-lunchOut"
              className={styles.nowBtn}
              disabled={isSmart}
              onClick={() => handleNow('lunchOut')}
            >
              Adesso
            </button>
          </div>
        </div>

        <div className={styles.timeInputGroup}>
          <label className={styles.timeInputLabel}>Rientro Pranzo</label>
          <div className={styles.timeInputWithBtn}>
            <TimeInput
              data-testid="input-lunchIn"
              className={styles.timeInput}
              value={entry.lunchIn ?? ''}
              disabled={isSmart}
              onChange={(val) => updateTimeEntry(targetDate, { lunchIn: val })}
            />
            <button
              type="button"
              data-testid="btn-now-lunchIn"
              className={styles.nowBtn}
              disabled={isSmart}
              onClick={() => handleNow('lunchIn')}
            >
              Adesso
            </button>
          </div>
        </div>

        <div className={styles.timeInputGroup}>
          <label className={styles.timeInputLabel}>Uscita Sera</label>
          <div className={styles.timeInputWithBtn}>
            <TimeInput
              data-testid="input-eveningOut"
              className={styles.timeInput}
              value={entry.eveningOut ?? ''}
              disabled={isSmart}
              onChange={(val) => updateTimeEntry(targetDate, { eveningOut: val })}
            />
            <button
              type="button"
              data-testid="btn-now-eveningOut"
              className={styles.nowBtn}
              disabled={isSmart}
              onClick={() => handleNow('eveningOut')}
            >
              Adesso
            </button>
          </div>
        </div>
      </div>

      {/* Permissions, Canteen, and Notes */}
      <div className={styles.extraInputsRow}>
        <div className={styles.permInputWrapper}>
          <label className={styles.timeInputLabel}>Permesso (minuti):</label>
          <input
            type="number"
            min="0"
            step="15"
            data-testid="input-permissionMinutes"
            className={styles.permInput}
            value={entry.permissionMinutes ?? 0}
            onChange={(e) =>
              updateTimeEntry(targetDate, {
                permissionMinutes: parseInt(e.target.value, 10) || 0,
              })
            }
          />
        </div>

        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            data-testid="checkbox-canteenUsed"
            className={styles.checkboxInput}
            checked={Boolean(entry.canteenUsed)}
            onChange={(e) => updateTimeEntry(targetDate, { canteenUsed: e.target.checked })}
          />
          Buono Mensa (1,50 €)
        </label>
      </div>

      <div className={styles.notesSection}>
        <label htmlFor="input-day-notes" className={styles.timeInputLabel}>
          Note o giustificativo:
        </label>
        <input
          id="input-day-notes"
          type="text"
          data-testid="input-day-notes"
          className={styles.timeInput}
          placeholder="Es. permessi, sede trasferta, visita medica..."
          value={day?.notes ?? ''}
          onChange={(e) => updateDayStatus(targetDate, day?.status ?? 'presenza', e.target.value)}
        />
      </div>

      {/* Mathematical summary */}
      <div className={styles.mathSummaryBar}>
        <div className={styles.mathItem}>
          <span className={styles.mathLabel}>Uscita 8h</span>
          <span data-testid="detail-expected-8h" className={`${styles.mathValue} ${styles.heroStatHighlight}`}>
            {calc.expectedExit8h ?? '-'}
          </span>
        </div>
        <div className={styles.mathItem}>
          <span className={styles.mathLabel}>Uscita 7h</span>
          <span data-testid="detail-expected-7h" className={styles.mathValue}>
            {calc.expectedExit7h ?? '-'}
          </span>
        </div>
        <div className={styles.mathItem}>
          <span className={styles.mathLabel}>Ore Lavorate</span>
          <span data-testid="detail-worked-time" className={styles.mathValue}>
            {minutesToHHmm(calc.workedMinutes)}
          </span>
        </div>
        <div className={styles.mathItem}>
          <span className={styles.mathLabel}>Delta Giornata</span>
          <span
            data-testid="detail-delta"
            className={`${styles.mathValue} ${calc.deltaMinutes >= 0 ? styles.mathPositive : styles.mathNegative}`}
          >
            {minutesToHHmm(calc.deltaMinutes, true)}
          </span>
        </div>
        <div className={styles.mathItem}>
          <span className={styles.mathLabel}>Pausa Pranzo</span>
          <span data-testid="detail-lunch-duration" className={styles.mathValue}>
            {minutesToHHmm(calc.lunchDurationMinutes)}
          </span>
        </div>
      </div>
    </div>
  );
};
