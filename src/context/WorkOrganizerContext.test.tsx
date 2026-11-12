import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider } from '../services/supabase/authContext';
import { WorkOrganizerProvider, useWorkOrganizer } from './WorkOrganizerContext';
import { localCache } from '../services/storage/localCache';

const TestConsumer: React.FC = () => {
  const {
    currentYear,
    currentMonth,
    selectedDate,
    settings,
    monthValidation,
    quarterSummary,
    mealVouchers,
    leaveBalance,
    setMonth,
    goToNextMonth,
    goToPrevMonth,
    updateDayStatus,
    updateTimeEntry,
    updateSettings,
  } = useWorkOrganizer();

  return (
    <div>
      <span data-testid="year">{currentYear}</span>
      <span data-testid="month">{currentMonth}</span>
      <span data-testid="selected-date">{selectedDate}</span>
      <span data-testid="smart-status">{monthValidation.smartStatus}</span>
      <span data-testid="smart-count">{monthValidation.totalSmartDays}</span>
      <span data-testid="quarter-id">{quarterSummary.quarterId}</span>
      <span data-testid="net-vouchers">{mealVouchers.netBalance}</span>
      <span data-testid="max-smart">{settings.maxSmartDaysMonth}</span>
      <span data-testid="ferie-remaining">{leaveBalance.ferieRemainingHours}</span>
      <span data-testid="par-remaining">{leaveBalance.parRemainingHours}</span>

      <button data-testid="btn-next" onClick={goToNextMonth}>
        Next Month
      </button>
      <button data-testid="btn-prev" onClick={goToPrevMonth}>
        Prev Month
      </button>
      <button data-testid="btn-set-month" onClick={() => setMonth(2026, 11)}>
        Set Nov 2026
      </button>
      <button
        data-testid="btn-add-smart"
        onClick={() => updateDayStatus('2026-10-05', 'smart')}
      >
        Add Smart
      </button>
      <button
        data-testid="btn-add-punches"
        onClick={() =>
          updateTimeEntry('2026-10-06', {
            morningIn: '08:00',
            eveningOut: '17:00',
            canteenUsed: true,
          })
        }
      >
        Add Punches
      </button>
      <button
        data-testid="btn-change-setting"
        onClick={() => updateSettings({ maxSmartDaysMonth: 12 })}
      >
        Change Settings
      </button>
    </div>
  );
};

describe('WorkOrganizerContext', () => {
  beforeEach(() => {
    localCache.clearAll();
  });

  it('renders with initial year and month and provides defaults', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <WorkOrganizerProvider initialYear={2026} initialMonth={10}>
            <TestConsumer />
          </WorkOrganizerProvider>
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('year').textContent).toBe('2026');
    expect(screen.getByTestId('month').textContent).toBe('10');
    expect(screen.getByTestId('quarter-id').textContent).toBe('2026-Q4');
    expect(screen.getByTestId('smart-status').textContent).toBe('INCOMPLETO');
    expect(screen.getByTestId('ferie-remaining').textContent).toBe('160');
    expect(screen.getByTestId('par-remaining').textContent).toBe('88');
  });

  it('navigates next and prev months correctly', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <WorkOrganizerProvider initialYear={2026} initialMonth={10}>
            <TestConsumer />
          </WorkOrganizerProvider>
        </AuthProvider>
      );
    });

    await act(async () => {
      screen.getByTestId('btn-next').click();
    });

    expect(screen.getByTestId('month').textContent).toBe('11');

    await act(async () => {
      screen.getByTestId('btn-prev').click();
    });

    expect(screen.getByTestId('month').textContent).toBe('10');
  });

  it('reactively updates state and computed policy/vouchers when days and time entries change', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <WorkOrganizerProvider initialYear={2026} initialMonth={10}>
            <TestConsumer />
          </WorkOrganizerProvider>
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('smart-count').textContent).toBe('0');

    await act(async () => {
      screen.getByTestId('btn-add-smart').click();
    });

    expect(screen.getByTestId('smart-count').textContent).toBe('1');
    expect(Number(screen.getByTestId('net-vouchers').textContent)).toBe(8); // 1 smart * 8€

    await act(async () => {
      screen.getByTestId('btn-add-punches').click();
    });

    // 1 smart (8€) - 1 canteen (1.50€) = 6.50€
    expect(Number(screen.getByTestId('net-vouchers').textContent)).toBe(6.5);
  });

  it('reactively updates settings when updateSettings is called', async () => {
    await act(async () => {
      render(
        <AuthProvider>
          <WorkOrganizerProvider initialYear={2026} initialMonth={10}>
            <TestConsumer />
          </WorkOrganizerProvider>
        </AuthProvider>
      );
    });

    expect(screen.getByTestId('max-smart').textContent).toBe('10');

    await act(async () => {
      screen.getByTestId('btn-change-setting').click();
    });

    expect(screen.getByTestId('max-smart').textContent).toBe('12');
  });
});
