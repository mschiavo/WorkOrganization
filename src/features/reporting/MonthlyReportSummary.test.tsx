import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MonthlyReportSummary } from './MonthlyReportSummary';
import { WorkOrganizerProvider } from '../../context/WorkOrganizerContext';
import { AuthContext, AuthContextType } from '../../services/supabase/authContext';
import { localCache } from '../../services/storage/localCache';

const renderWithProviders = async (ui: React.ReactElement) => {
  const defaultAuthValue: AuthContextType = {
    user: null,
    session: null,
    isGuest: true,
    isConfigured: false,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    continueAsGuest: vi.fn(),
  };

  let utils!: ReturnType<typeof render>;
  await act(async () => {
    utils = render(
      <AuthContext.Provider value={defaultAuthValue}>
        <WorkOrganizerProvider initialYear={2026} initialMonth={10}>
          {ui}
        </WorkOrganizerProvider>
      </AuthContext.Provider>
    );
  });
  return utils;
};

describe('MonthlyReportSummary Component', () => {
  beforeEach(() => {
    localStorage.clear();
    localCache.clearAll();
  });

  it('renders all monthly report statistics (hours, banca ore, smart/presence, vouchers)', async () => {
    await renderWithProviders(<MonthlyReportSummary />);

    expect(screen.getByTestId('monthly-report-summary')).toBeInTheDocument();
    expect(screen.getByTestId('report-stat-worked-hours')).toBeInTheDocument();
    expect(screen.getByTestId('report-stat-delta-month')).toBeInTheDocument();
    expect(screen.getByTestId('report-stat-presence-days')).toBeInTheDocument();
    expect(screen.getByTestId('report-stat-smart-days')).toBeInTheDocument();
    expect(screen.getByTestId('report-stat-net-vouchers')).toBeInTheDocument();
    expect(screen.getByTestId('report-stat-ferie-balance')).toBeInTheDocument();
    expect(screen.getByTestId('report-stat-par-balance')).toBeInTheDocument();
  });
});
