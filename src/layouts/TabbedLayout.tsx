import React, { useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { CalendarGrid } from '../features/calendar/CalendarGrid';
import { TimbratureTable } from '../features/timbrature/TimbratureTable';
import styles from './Layouts.module.css';

export const TabbedLayout: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'timbrature'>('calendar');

  return (
    <div className={styles.tabbedLayout} data-testid="tabbed-layout">
      {/* Tab Navigation */}
      <div className={styles.tabBar} role="tablist">
        <button
          type="button"
          role="tab"
          className={styles.tabBtn}
          data-testid="tab-btn-calendar"
          aria-selected={activeTab === 'calendar'}
          onClick={() => setActiveTab('calendar')}
        >
          <CalendarIcon size={16} />
          <span>Pianificazione Calendario</span>
        </button>

        <button
          type="button"
          role="tab"
          className={styles.tabBtn}
          data-testid="tab-btn-timbrature"
          aria-selected={activeTab === 'timbrature'}
          onClick={() => setActiveTab('timbrature')}
        >
          <Clock size={16} />
          <span>Registro Timbrature</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent} role="tabpanel">
        {activeTab === 'calendar' ? <CalendarGrid /> : <TimbratureTable />}
      </div>
    </div>
  );
};
