import React from 'react';
import { useWorkOrganizer } from '../context/WorkOrganizerContext';
import { SplitLayout } from './SplitLayout';
import { SmartSheetLayout } from './SmartSheetLayout';
import styles from './Layouts.module.css';

export const LayoutContainer: React.FC = () => {
  const { settings } = useWorkOrganizer();
  const layout = settings.preferredLayout === 'smart-sheet' ? 'smart-sheet' : 'split';

  return (
    <main
      className={styles.layoutContainer}
      data-testid="layout-container"
      data-layout={layout}
    >
      {layout === 'smart-sheet' ? <SmartSheetLayout /> : <SplitLayout />}
    </main>
  );
};
