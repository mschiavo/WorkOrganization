import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TimbratureTable } from './TimbratureTable';
import { WorkOrganizerProvider } from '../../context/WorkOrganizerContext';
import { AuthContext, AuthContextType } from '../../services/supabase/authContext';
import { localCache } from '../../services/storage/localCache';

const renderWithProviders = async (
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
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    continueAsGuest: vi.fn(),
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

describe('TimbratureTable Feature', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders all 31 days for October 2026', async () => {
    await renderWithProviders(<TimbratureTable />);

    expect(screen.getByTestId('timbrature-table')).toBeInTheDocument();
    expect(screen.getByTestId('row-2026-10-01')).toBeInTheDocument();
    expect(screen.getByTestId('row-2026-10-31')).toBeInTheDocument();
  });

  it('marks selected row with data-selected="true" and handles row click', async () => {
    const onRowClick = vi.fn();
    await renderWithProviders(<TimbratureTable onRowClick={onRowClick} />);

    const rowOct5 = screen.getByTestId('row-2026-10-05');
    await act(async () => {
      fireEvent.click(rowOct5);
    });

    expect(onRowClick).toHaveBeenCalledWith('2026-10-05');
    expect(screen.getByTestId('row-2026-10-05')).toHaveAttribute('data-selected', 'true');
  });

  it('allows changing day status via interactive status select dropdown', async () => {
    await renderWithProviders(<TimbratureTable />);

    const selectOct5 = screen.getByTestId('status-select-2026-10-05') as HTMLSelectElement;
    expect(selectOct5).toBeInTheDocument();

    await act(async () => {
      fireEvent.change(selectOct5, { target: { value: 'smart' } });
    });

    expect(selectOct5.value).toBe('smart');
    expect(localCache.getCalendarDays()['2026-10-05']?.status).toBe('smart');
  });

  it('renders static status badge instead of select dropdown when readOnly is true', async () => {
    localCache.saveCalendarDay('2026-10-05', {
      date: '2026-10-05',
      status: 'smart',
      isConfirmed: true,
    });

    await renderWithProviders(<TimbratureTable readOnly={true} />);

    // Select dropdown should NOT be rendered
    expect(screen.queryByTestId('status-select-2026-10-05')).not.toBeInTheDocument();

    // Static badge should be rendered
    const row = screen.getByTestId('row-2026-10-05');
    expect(row).toHaveTextContent('Smart');
  });

  it('displays presence punches, lunch break duration, worked time, and expected exits', async () => {
    localCache.saveTimeEntry('2026-10-05', {
      date: '2026-10-05',
      morningIn: '08:30',
      lunchOut: '13:00',
      lunchIn: '13:45', // 45m lunch
      eveningOut: '17:45', // 8h15m net worked -> +00:15 delta
      canteenUsed: true,
    });
    localCache.saveCalendarDay('2026-10-05', {
      date: '2026-10-05',
      status: 'presenza',
      notes: 'Meeting sede',
      isConfirmed: true,
    });

    await renderWithProviders(<TimbratureTable />);

    const row = screen.getByTestId('row-2026-10-05');
    expect(row).toHaveTextContent('08:30'); // morningIn
    expect(row).toHaveTextContent('13:00'); // lunchOut
    expect(row).toHaveTextContent('13:45'); // lunchIn
    expect(row).toHaveTextContent('00:45'); // lunchDuration
    expect(row).toHaveTextContent('17:45'); // eveningOut
    expect(row).toHaveTextContent('08:30'); // workedMinutes (4h30m + 4h00m = 8h30m)
    expect(row).toHaveTextContent('+00:30'); // delta (+30m)
    expect(row).toHaveTextContent('🍽️'); // canteen badge
    expect(row).toHaveTextContent('Meeting sede'); // notes
  });

  it('displays smart working row with 08:00 worked time, +00:00 delta, and no lunch duration', async () => {
    localCache.saveTimeEntry('2026-10-06', {
      date: '2026-10-06',
      isSmartWork: true,
    });
    localCache.saveCalendarDay('2026-10-06', {
      date: '2026-10-06',
      status: 'smart',
      isConfirmed: true,
    });

    await renderWithProviders(<TimbratureTable />);

    const row = screen.getByTestId('row-2026-10-06');
    expect(row).toHaveTextContent('Smart');
    expect(row).toHaveTextContent('08:00');
    expect(row).toHaveTextContent('+00:00');
  });

  it('renders monthly summary totals at footer', async () => {
    // Oct 5: 8h worked
    localCache.saveTimeEntry('2026-10-05', {
      date: '2026-10-05',
      morningIn: '08:30',
      eveningOut: '17:00', // 8h worked
      canteenUsed: true,
    });
    // Oct 6: Smart 8h worked
    localCache.saveTimeEntry('2026-10-06', {
      date: '2026-10-06',
      isSmartWork: true,
    });

    await renderWithProviders(<TimbratureTable />);

    const totalsRow = screen.getByTestId('timbrature-totals-row');
    expect(totalsRow).toBeInTheDocument();
    // 8h + 8h = 16:00 worked hours
    expect(screen.getByTestId('total-worked-hours')).toHaveTextContent('16:00');
    expect(screen.getByTestId('total-delta')).toHaveTextContent('+00:00');
    expect(screen.getByTestId('total-canteen-vouchers')).toHaveTextContent('1');
  });
});
