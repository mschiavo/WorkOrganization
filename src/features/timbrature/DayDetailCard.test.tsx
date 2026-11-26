import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DayDetailCard } from './DayDetailCard';
import { TodayHeroWidget } from './TodayHeroWidget';
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

describe('DayDetailCard Feature', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders date, time inputs, "Adesso" buttons, smart work toggle, and mathematical summary', async () => {
    localCache.saveTimeEntry('2026-10-05', {
      date: '2026-10-05',
      morningIn: '08:30',
      lunchOut: '13:00',
      lunchIn: '13:30',
      eveningOut: '17:00',
      permissionMinutes: 0,
      canteenUsed: true,
    });

    await renderWithProviders(<DayDetailCard date="2026-10-05" />);

    expect(screen.getByTestId('day-detail-card')).toBeInTheDocument();
    expect(screen.getByTestId('input-morningIn')).toHaveValue('08:30');
    expect(screen.getByTestId('input-lunchOut')).toHaveValue('13:00');
    expect(screen.getByTestId('input-lunchIn')).toHaveValue('13:30');
    expect(screen.getByTestId('input-eveningOut')).toHaveValue('17:00');

    expect(screen.getByTestId('btn-now-morningIn')).toBeInTheDocument();
    expect(screen.getByTestId('btn-now-lunchOut')).toBeInTheDocument();
    expect(screen.getByTestId('btn-now-lunchIn')).toBeInTheDocument();
    expect(screen.getByTestId('btn-now-eveningOut')).toBeInTheDocument();

    expect(screen.getByTestId('checkbox-canteenUsed')).toBeChecked();
    expect(screen.getByTestId('toggle-smart-work')).toBeInTheDocument();

    // Mathematical summary
    // 08:30 to 17:00 is 8.5h minus 30m lunch = 8h worked, delta 0
    expect(screen.getByTestId('detail-worked-time')).toHaveTextContent('08:00');
    expect(screen.getByTestId('detail-delta')).toHaveTextContent('+00:00');
    expect(screen.getByTestId('detail-expected-8h')).toHaveTextContent('17:00');
    expect(screen.getByTestId('detail-expected-7h')).toHaveTextContent('16:00');
    expect(screen.getByTestId('detail-lunch-duration')).toHaveTextContent('00:30');
  });

  it('allows selecting day status via status buttons directly on DayDetailCard', async () => {
    await renderWithProviders(<DayDetailCard date="2026-10-15" />);

    expect(screen.getByTestId('btn-status-presenza')).toBeInTheDocument();
    expect(screen.getByTestId('btn-status-smart')).toBeInTheDocument();
    expect(screen.getByTestId('btn-status-ferie')).toBeInTheDocument();
    expect(screen.getByTestId('btn-status-par')).toBeInTheDocument();
    expect(screen.getByTestId('btn-status-chiusura')).toBeInTheDocument();
    expect(screen.getByTestId('btn-status-non_lavorativo')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-status-ferie'));
    });

    expect(localCache.getCalendarDays()['2026-10-15']?.status).toBe('ferie');
    expect(screen.getByTestId('btn-status-ferie')).toHaveAttribute('data-active', 'true');
  });

  it('resets a day by clearing status, punches, and notes via btn-reset-day', async () => {
    localCache.saveCalendarDay('2026-10-20', { date: '2026-10-20', status: 'smart', notes: 'Important note' });
    localCache.saveTimeEntry('2026-10-20', { date: '2026-10-20', morningIn: '08:30', isSmartWork: true });

    await renderWithProviders(<DayDetailCard date="2026-10-20" />);

    expect(screen.getByTestId('btn-reset-day')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-reset-day'));
    });

    expect(localCache.getCalendarDays()['2026-10-20']).toBeUndefined();
    expect(localCache.getTimeEntries()['2026-10-20']).toBeUndefined();
  });

  it('entering morningIn dynamically calculates expected exits 8h and 7h', async () => {
    await renderWithProviders(<DayDetailCard date="2026-10-06" />);

    const morningInput = screen.getByTestId('input-morningIn');
    await act(async () => {
      fireEvent.change(morningInput, { target: { value: '09:00' } });
    });

    // 09:00 + 30m default min lunch + 8h = 17:30 (8h) and 16:30 (7h)
    expect(screen.getByTestId('detail-expected-8h')).toHaveTextContent('17:30');
    expect(screen.getByTestId('detail-expected-7h')).toHaveTextContent('16:30');
  });

  it('clicking "Adesso" button fills current time into the input', async () => {
    await renderWithProviders(<DayDetailCard date="2026-10-07" />);

    const now = new Date();
    const expectedHH = String(now.getHours()).padStart(2, '0');
    const expectedMM = String(now.getMinutes()).padStart(2, '0');
    const expectedTime = `${expectedHH}:${expectedMM}`;

    const btnNow = screen.getByTestId('btn-now-morningIn');
    await act(async () => {
      fireEvent.click(btnNow);
    });

    const morningInput = screen.getByTestId('input-morningIn');
    expect(morningInput).toHaveValue(expectedTime);
  });

  it('toggling Smart Working sets isSmartWork: true with 8h nominal and 0 delta', async () => {
    await renderWithProviders(<DayDetailCard date="2026-10-08" />);

    const smartToggle = screen.getByTestId('toggle-smart-work');
    await act(async () => {
      fireEvent.click(smartToggle);
    });

    // In smart working: 08:00 worked time, delta 0, lunch duration 0
    expect(screen.getByTestId('detail-worked-time')).toHaveTextContent('08:00');
    expect(screen.getByTestId('detail-delta')).toHaveTextContent('+00:00');
    expect(screen.getByTestId('detail-lunch-duration')).toHaveTextContent('00:00');
  });

  it('updates canteenUsed checkbox correctly', async () => {
    await renderWithProviders(<DayDetailCard date="2026-10-09" />);

    const checkbox = screen.getByTestId('checkbox-canteenUsed');
    expect(checkbox).not.toBeChecked();

    await act(async () => {
      fireEvent.click(checkbox);
    });

    expect(checkbox).toBeChecked();
  });

  it('recalculates worked time and delta when permissionMinutes is added', async () => {
    localCache.saveTimeEntry('2026-10-10', {
      date: '2026-10-10',
      morningIn: '08:30',
      lunchOut: '13:00',
      lunchIn: '13:30',
      eveningOut: '16:00', // 7h net worked
      permissionMinutes: 0,
    });

    await renderWithProviders(<DayDetailCard date="2026-10-10" />);

    expect(screen.getByTestId('detail-worked-time')).toHaveTextContent('07:00');
    expect(screen.getByTestId('detail-delta')).toHaveTextContent('-01:00');

    // Add 1 hour (1h) permission
    const permInput = screen.getByTestId('input-permissionMinutes');
    await act(async () => {
      fireEvent.change(permInput, { target: { value: '1h' } });
    });

    // 7h + 1h permission = 8h worked, delta 0
    expect(screen.getByTestId('detail-worked-time')).toHaveTextContent('08:00');
    expect(screen.getByTestId('detail-delta')).toHaveTextContent('+00:00');
  });

  it('allows selecting PAR and Idea PAR statuses directly from buttons', async () => {
    // Past date for PAR
    const { unmount } = await renderWithProviders(<DayDetailCard date="2020-10-15" />);

    const parBtn = screen.getByTestId('btn-status-par');
    expect(parBtn).toBeInTheDocument();
    expect(parBtn).toHaveTextContent('PAR');

    await act(async () => {
      fireEvent.click(parBtn);
    });
    expect(parBtn).toHaveAttribute('data-active', 'true');

    unmount();

    // Future date for Idea PAR
    await renderWithProviders(<DayDetailCard date="2099-10-15" />);
    const ideaParBtn = screen.getByTestId('btn-status-idea_par');
    expect(ideaParBtn).toBeInTheDocument();
    expect(ideaParBtn).toHaveTextContent('Idea PAR');

    await act(async () => {
      fireEvent.click(ideaParBtn);
    });
    expect(ideaParBtn).toHaveAttribute('data-active', 'true');
  });

  it('renders only actual statuses (Smart, Ferie, PAR) for past dates (< today) and hides Idea* statuses', async () => {
    // A past date
    await renderWithProviders(<DayDetailCard date="2020-01-15" />);

    // Actual statuses must exist
    expect(screen.getByTestId('btn-status-smart')).toBeInTheDocument();
    expect(screen.getByTestId('btn-status-ferie')).toBeInTheDocument();
    expect(screen.getByTestId('btn-status-par')).toBeInTheDocument();
    expect(screen.getByTestId('btn-status-presenza')).toBeInTheDocument();

    // Idea* planning statuses must NOT exist
    expect(screen.queryByTestId('btn-status-idea_smart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-status-idea_ferie')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-status-idea_par')).not.toBeInTheDocument();
  });

  it('renders only planning statuses (Idea Smart, Idea Ferie, Idea PAR) for future dates (>= today) and hides actual statuses', async () => {
    // A future date
    await renderWithProviders(<DayDetailCard date="2099-01-15" />);

    // Idea* planning statuses must exist
    expect(screen.getByTestId('btn-status-idea_smart')).toBeInTheDocument();
    expect(screen.getByTestId('btn-status-idea_ferie')).toBeInTheDocument();
    expect(screen.getByTestId('btn-status-idea_par')).toBeInTheDocument();
    expect(screen.getByTestId('btn-status-presenza')).toBeInTheDocument();

    // Actual statuses must NOT exist
    expect(screen.queryByTestId('btn-status-smart')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-status-ferie')).not.toBeInTheDocument();
    expect(screen.queryByTestId('btn-status-par')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = vi.fn();
    await renderWithProviders(<DayDetailCard date="2026-10-12" onClose={handleClose} />);

    const closeBtn = screen.getByTestId('detail-close-btn');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

describe('TodayHeroWidget Feature', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders today date, quick punch buttons, and live exit displays', async () => {
    await renderWithProviders(<TodayHeroWidget />);

    expect(screen.getByTestId('today-hero-widget')).toBeInTheDocument();
    expect(screen.getByTestId('hero-today-date')).toBeInTheDocument();
    expect(screen.getByTestId('hero-btn-morningIn')).toBeInTheDocument();
    expect(screen.getByTestId('hero-btn-lunchOut')).toBeInTheDocument();
    expect(screen.getByTestId('hero-btn-lunchIn')).toBeInTheDocument();
    expect(screen.getByTestId('hero-btn-eveningOut')).toBeInTheDocument();
    expect(screen.getByTestId('hero-expected-8h')).toBeInTheDocument();
    expect(screen.getByTestId('hero-expected-7h')).toBeInTheDocument();
  });

  it('clicking "Entra Ora" registers current time and shows expected exits', async () => {
    await renderWithProviders(<TodayHeroWidget />);

    const entraBtn = screen.getByTestId('hero-btn-morningIn');
    await act(async () => {
      fireEvent.click(entraBtn);
    });

    // Expected exits should now be computed and not '-'
    expect(screen.getByTestId('hero-expected-8h')).not.toHaveTextContent('-');
    expect(screen.getByTestId('hero-expected-7h')).not.toHaveTextContent('-');
  });

  it('allows manual time editing for punches in TodayHeroWidget with current time default', async () => {
    await renderWithProviders(<TodayHeroWidget />);

    const morningInput = screen.getByTestId('hero-input-morningIn') as HTMLInputElement;
    expect(morningInput).toBeInTheDocument();

    // User can manually set punch time
    await act(async () => {
      fireEvent.change(morningInput, { target: { value: '08:45' } });
    });

    expect(morningInput.value).toBe('08:45');
    // Expected exit for 08:45 + 30m lunch + 8h = 17:15
    expect(screen.getByTestId('hero-expected-8h')).toHaveTextContent('17:15');
  });
});
