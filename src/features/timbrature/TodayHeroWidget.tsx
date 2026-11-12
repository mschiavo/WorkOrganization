import React from 'react';
import { useWorkOrganizer } from '../../context/WorkOrganizerContext';
import { calculateDailyTime, minutesToHHmm } from '../../core/domain/timeCalculator';
import { TimeInput } from '../../components/common/TimeInput';
import styles from './Timbrature.module.css';

const WEEKDAY_NAMES = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getCurrentHHmm(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function formatItalianDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  const dayName = WEEKDAY_NAMES[dateObj.getDay()];
  const paddedDay = String(d).padStart(2, '0');
  const paddedMonth = String(m).padStart(2, '0');
  return `${dayName} ${paddedDay}/${paddedMonth}/${y}`;
}

const PUNCH_SLOTS: {
  field: 'morningIn' | 'lunchOut' | 'lunchIn' | 'eveningOut';
  label: string;
  buttonText: string;
}[] = [
  { field: 'morningIn', label: 'Entrata Mattina', buttonText: 'Adesso' },
  { field: 'lunchOut', label: 'Uscita Pranzo', buttonText: 'Adesso' },
  { field: 'lunchIn', label: 'Rientro Pranzo', buttonText: 'Adesso' },
  { field: 'eveningOut', label: 'Uscita Sera', buttonText: 'Adesso' },
];

export const TodayHeroWidget: React.FC = () => {
  const { timeEntries, days, settings, updateTimeEntry, setSelectedDate } = useWorkOrganizer();

  const todayStr = getTodayString();
  const entry = timeEntries[todayStr] || { date: todayStr };
  const day = days[todayStr];
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

  const handlePunchNow = async (field: 'morningIn' | 'lunchOut' | 'lunchIn' | 'eveningOut') => {
    const timeNow = getCurrentHHmm();
    await updateTimeEntry(todayStr, { [field]: timeNow });
    setSelectedDate(todayStr);
  };

  const handleTimeChange = async (
    field: 'morningIn' | 'lunchOut' | 'lunchIn' | 'eveningOut',
    val: string
  ) => {
    await updateTimeEntry(todayStr, { [field]: val });
    setSelectedDate(todayStr);
  };

  return (
    <div className={styles.heroCard} data-testid="today-hero-widget">
      <div className={styles.heroHeader}>
        <div className={styles.heroTitle}>
          <span>⏱️ Registrazione Veloce Oggi</span>
          <span className={styles.heroDateBadge} data-testid="hero-today-date">
            {formatItalianDate(todayStr)}
          </span>
        </div>
      </div>

      {/* 4 Timbrature Punch Slots with editable time input starting from now */}
      <div className={styles.heroActions}>
        {PUNCH_SLOTS.map((slot) => {
          const currentValue = entry[slot.field] ?? '';
          return (
            <div key={slot.field} className={styles.heroPunchSlot}>
              <span className={styles.heroPunchLabel}>{slot.label}</span>
              <div className={styles.heroPunchControls}>
                <TimeInput
                  data-testid={`hero-input-${slot.field}`}
                  className={styles.heroTimeInput}
                  value={currentValue}
                  onFocus={() => {
                    if (!entry[slot.field]) {
                      handleTimeChange(slot.field, getCurrentHHmm());
                    }
                  }}
                  onChange={(val) => handleTimeChange(slot.field, val)}
                />
                <button
                  type="button"
                  data-testid={`hero-btn-${slot.field}`}
                  className={styles.heroPunchBtn}
                  onClick={() => handlePunchNow(slot.field)}
                  title="Imposta ora attuale"
                >
                  {slot.buttonText}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.heroProjections}>
        <div className={styles.heroStatBox}>
          <span className={styles.heroStatLabel}>Uscita Prevista 8h</span>
          <span
            data-testid="hero-expected-8h"
            className={`${styles.heroStatValue} ${styles.heroStatHighlight}`}
          >
            {calc.expectedExit8h ?? '-'}
          </span>
        </div>

        <div className={styles.heroStatBox}>
          <span className={styles.heroStatLabel}>Uscita Minima 7h</span>
          <span data-testid="hero-expected-7h" className={styles.heroStatValue}>
            {calc.expectedExit7h ?? '-'}
          </span>
        </div>

        <div className={styles.heroStatBox}>
          <span className={styles.heroStatLabel}>Ore Lavorate</span>
          <span data-testid="hero-worked-time" className={styles.heroStatValue}>
            {minutesToHHmm(calc.workedMinutes)}
          </span>
        </div>

        <div className={styles.heroStatBox}>
          <span className={styles.heroStatLabel}>Delta Stimato</span>
          <span
            className={`${styles.heroStatValue} ${
              calc.deltaMinutes >= 0 ? styles.mathPositive : styles.mathNegative
            }`}
          >
            {minutesToHHmm(calc.deltaMinutes, true)}
          </span>
        </div>
      </div>
    </div>
  );
};
