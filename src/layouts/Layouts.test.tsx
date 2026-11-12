import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LayoutContainer } from './LayoutContainer';
import { SplitLayout } from './SplitLayout';
import { SmartSheetLayout } from './SmartSheetLayout';
import { WorkOrganizerProvider, useWorkOrganizer } from '../context/WorkOrganizerContext';
import { AuthContext, AuthContextType } from '../services/supabase/authContext';
import { localCache } from '../services/storage/localCache';

const renderLayoutWithProviders = async (
  ui: React.ReactElement,
  options?: {
    initialYear?: number;
    initialMonth?: number;
  }
) => {
  const defaultAuthValue: AuthContextType = {
    user: null,
    session: null,
    isGuest: true,
    isConfigured: false,
    loading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    continueAsGuest: () => {},
  };

  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(
      <AuthContext.Provider value={defaultAuthValue}>
        <WorkOrganizerProvider
          initialYear={options?.initialYear ?? 2026}
          initialMonth={options?.initialMonth ?? 10}
        >
          {ui}
        </WorkOrganizerProvider>
      </AuthContext.Provider>
    );
  });
  return utils;
};

const LayoutSwitcherHelper: React.FC = () => {
  const { updateSettings } = useWorkOrganizer();
  return (
    <div>
      <button
        data-testid="switch-to-split"
        onClick={() => updateSettings({ preferredLayout: 'split' })}
      >
        Split
      </button>
      <button
        data-testid="switch-to-sheet"
        onClick={() => updateSettings({ preferredLayout: 'smart-sheet' })}
      >
        Sheet
      </button>
      <LayoutContainer />
    </div>
  );
};

describe('Two Switchable Layouts Feature (Split and Smart Sheet)', () => {
  beforeEach(() => {
    localCache.clearAll();
  });

  describe('SplitLayout Component', () => {
    it('renders compact calendar on the left and DayDetailCard on the right', async () => {
      await renderLayoutWithProviders(<SplitLayout />);

      const splitContainer = screen.getByTestId('split-layout');
      expect(splitContainer).toBeInTheDocument();

      const compactGrid = screen.getByTestId('calendar-grid');
      expect(compactGrid).toHaveAttribute('data-compact', 'true');

      const dayDetailCard = screen.getByTestId('day-detail-card');
      expect(dayDetailCard).toBeInTheDocument();
    });
  });

  describe('SmartSheetLayout Component', () => {
    it('renders MonthlyReportSummary on top and TimbratureTable below in pure read-only mode', async () => {
      await renderLayoutWithProviders(<SmartSheetLayout />);

      const sheetContainer = screen.getByTestId('smart-sheet-layout');
      expect(sheetContainer).toBeInTheDocument();

      expect(screen.getByTestId('monthly-report-summary')).toBeInTheDocument();
      expect(screen.getByTestId('timbrature-table')).toBeInTheDocument();
    });
  });

  describe('LayoutContainer Switching', () => {
    it('defaults to Split layout and dynamically switches between Split and Smart Sheet', async () => {
      await renderLayoutWithProviders(<LayoutSwitcherHelper />);

      // Default layout is split
      let container = screen.getByTestId('layout-container');
      expect(container).toHaveAttribute('data-layout', 'split');
      expect(screen.getByTestId('split-layout')).toBeInTheDocument();
      expect(screen.queryByTestId('tabbed-layout')).not.toBeInTheDocument();

      // Switch to Smart Sheet
      await act(async () => {
        fireEvent.click(screen.getByTestId('switch-to-sheet'));
      });
      container = screen.getByTestId('layout-container');
      expect(container).toHaveAttribute('data-layout', 'smart-sheet');
      expect(screen.getByTestId('smart-sheet-layout')).toBeInTheDocument();

      // Switch back to Split
      await act(async () => {
        fireEvent.click(screen.getByTestId('switch-to-split'));
      });
      container = screen.getByTestId('layout-container');
      expect(container).toHaveAttribute('data-layout', 'split');
      expect(screen.getByTestId('split-layout')).toBeInTheDocument();
    });
  });
});
