import React from 'react';
import { MonthlyReportSummary } from '../features/reporting/MonthlyReportSummary';
// import { TodayHeroWidget } from '../features/timbrature/TodayHeroWidget';
import { TimbratureTable } from '../features/timbrature/TimbratureTable';
import styles from './Layouts.module.css';

export const SmartSheetLayout: React.FC = () => {
  return (
    <div className={styles.smartSheetLayout} data-testid="smart-sheet-layout">
      {/* 
        CONTROLLO INSERIMENTO RAPIDO (WIDGET OGGI):
        Commentato per mantenere la vista Sheet come report mensile di pura visualizzazione.
        Per ripristinare il widget interattivo TodayHeroWidget, decommentare il blocco seguente:
        <div className={styles.heroWrapper}>
          <TodayHeroWidget />
        </div>
      */}

      {/* Report Mensile & Statistiche Complete (Pura Visualizzazione) */}
      <div className={styles.heroWrapper}>
        <MonthlyReportSummary />
      </div>

      {/* Main: Full Monthly Table (Pura Visualizzazione / Read-Only) */}
      <div className={styles.sheetTableWrapper}>
        <TimbratureTable readOnly={true} />
      </div>
    </div>
  );
};
