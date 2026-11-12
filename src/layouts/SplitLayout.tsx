import React from 'react';
import { useWorkOrganizer } from '../context/WorkOrganizerContext';
import { CalendarGrid } from '../features/calendar/CalendarGrid';
import { DayDetailCard } from '../features/timbrature/DayDetailCard';
import styles from './Layouts.module.css';

export const SplitLayout: React.FC = () => {
  const { selectedDate, setSelectedDate } = useWorkOrganizer();

  return (
    <div className={styles.splitLayout} data-testid="split-layout">
      {/* Left Column: Compact Calendar Grid */}
      <div className={styles.splitLeftCol}>
        <CalendarGrid compact={true} onSelectDay={setSelectedDate} />
      </div>

      {/* Right Column: Selected Day Detail Card */}
      <div className={styles.splitRightCol}>
        <DayDetailCard date={selectedDate} />
      </div>
    </div>
  );
};
