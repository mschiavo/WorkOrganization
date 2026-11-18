import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { CalendarGrid } from './CalendarGrid';
import { CalendarDayCard } from './CalendarDayCard';
import { WeekSummaryBadge } from './WeekSummaryBadge';
import { StatusSelectorModal } from './StatusSelectorModal';
import { WorkOrganizerProvider } from '../../context/WorkOrganizerContext';
import { AuthContext, AuthContextType } from '../../services/supabase/authContext';
import { localCache } from '../../services/storage/localCache';
import { WeekValidationResult } from '../../core/domain/policyValidator';

const renderCalendarWithProviders = async (
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

describe('Calendar & Month Planning Grid Feature', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('CalendarDayCard Component', () => {
    it('renders day number, status badge, confirmed checkmark, and notes indicator', () => {
      render(
        <CalendarDayCard
          date="2026-10-05"
          dayNumber={5}
          status="presenza"
          isConfirmed={true}
          notes="Incontro con cliente"
          isToday={false}
          isSelected={false}
          isOutsideMonth={false}
        />
      );

      expect(screen.getByTestId('day-number')).toHaveTextContent('5');
      const badge = screen.getByTestId('day-status-badge');
      expect(badge).toHaveTextContent('Presenza');
      expect(badge).toHaveAttribute('data-status', 'presenza');
      expect(screen.getByTestId('day-confirmed-icon')).toBeInTheDocument();
      expect(screen.getByTestId('day-notes-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('day-notes-indicator')).toHaveAttribute('title', 'Incontro con cliente');
    });

    it('renders checkmark for past confirmed days and yellow clock for future planned days', () => {
      // Past day
      const { rerender } = render(
        <CalendarDayCard
          date="2020-01-01"
          dayNumber={1}
          status="presenza"
          isConfirmed={true}
          isFuture={false}
        />
      );

      expect(screen.getByTestId('day-confirmed-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('day-pending-future-icon')).not.toBeInTheDocument();

      // Future day
      rerender(
        <CalendarDayCard
          date="2099-01-01"
          dayNumber={1}
          status="smart"
          isConfirmed={true}
          isFuture={true}
        />
      );

      expect(screen.getByTestId('day-pending-future-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('day-confirmed-icon')).not.toBeInTheDocument();
    });

    it('renders today and selected states with appropriate data attributes', () => {
      render(
        <CalendarDayCard
          date="2026-10-06"
          dayNumber={6}
          status="smart"
          isToday={true}
          isSelected={true}
          isConfirmed={false}
        />
      );

      const card = screen.getByTestId('day-card-2026-10-06');
      expect(card).toHaveAttribute('data-today', 'true');
      expect(card).toHaveAttribute('data-selected', 'true');
      expect(screen.queryByTestId('day-confirmed-icon')).not.toBeInTheDocument();
    });

    it('renders holiday indicator on national holidays', () => {
      render(
        <CalendarDayCard
          date="2026-11-01"
          dayNumber={1}
          status="non_lavorativo"
          isHoliday={true}
          holidayName="Tutti i Santi"
        />
      );

      const holidayBadge = screen.getByTestId('day-holiday-badge');
      expect(holidayBadge).toBeInTheDocument();
      expect(holidayBadge).toHaveTextContent('Festivo');
    });

    it('calls onClick with the date when clicked', () => {
      const handleClick = vi.fn();
      render(
        <CalendarDayCard
          date="2026-10-07"
          dayNumber={7}
          status="idea_smart"
          onClick={handleClick}
        />
      );

      fireEvent.click(screen.getByTestId('day-card-2026-10-07'));
      expect(handleClick).toHaveBeenCalledWith('2026-10-07');
    });
  });

  describe('WeekSummaryBadge Component', () => {
    it('renders green compliant badge when week is compliant', () => {
      const week: WeekValidationResult = {
        weekNumber: 41,
        startDate: '2026-10-05',
        endDate: '2026-10-11',
        presenceCount: 2,
        smartCount: 2,
        ferieCount: 1,
        closureCount: 0,
        isCompliant: true,
      };

      render(<WeekSummaryBadge week={week} />);

      const badge = screen.getByTestId('week-summary-41');
      expect(badge).toHaveAttribute('data-compliant', 'true');
      expect(badge).toHaveTextContent(/Settimana 41.*Conforme/i);
      expect(badge).toHaveTextContent(/2 Presenza.*2 Smart/i);
    });

    it('renders red warning badge with errorReason when week is not compliant', () => {
      const nonCompliantWeek: WeekValidationResult = {
        weekNumber: 42,
        startDate: '2026-10-12',
        endDate: '2026-10-18',
        presenceCount: 0,
        smartCount: 3,
        ferieCount: 0,
        closureCount: 0,
        isCompliant: false,
        errorReason: 'Manca presenza obbligatoria',
      };

      render(<WeekSummaryBadge week={nonCompliantWeek} />);

      const badge = screen.getByTestId('week-summary-42');
      expect(badge).toHaveAttribute('data-compliant', 'false');
      expect(badge).toHaveTextContent(/Settimana 42/i);
      expect(badge).toHaveTextContent('Manca presenza obbligatoria');
    });
  });

  describe('StatusSelectorModal Component', () => {
    it('does not render when isOpen is false', () => {
      render(
        <StatusSelectorModal
          isOpen={false}
          date="2026-10-05"
          currentStatus="presenza"
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(screen.queryByTestId('status-selector-modal')).not.toBeInTheDocument();
    });

    it('renders all 6 causali buttons and notes textarea when isOpen is true', () => {
      render(
        <StatusSelectorModal
          isOpen={true}
          date="2026-10-05"
          currentStatus="presenza"
          currentNotes="Nota esistente"
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      );

      expect(screen.getByTestId('status-selector-modal')).toBeInTheDocument();
      expect(screen.getByTestId('status-btn-presenza')).toBeInTheDocument();
      expect(screen.getByTestId('status-btn-smart')).toBeInTheDocument();
      expect(screen.getByTestId('status-btn-idea_smart')).toBeInTheDocument();
      expect(screen.getByTestId('status-btn-ferie')).toBeInTheDocument();
      expect(screen.getByTestId('status-btn-chiusura')).toBeInTheDocument();
      expect(screen.getByTestId('status-btn-non_lavorativo')).toBeInTheDocument();

      const notesInput = screen.getByTestId('modal-notes-input');
      expect(notesInput).toHaveValue('Nota esistente');
    });

    it('calls onSave and closes when clicking a status button', async () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <StatusSelectorModal
          isOpen={true}
          date="2026-10-05"
          currentStatus="presenza"
          currentNotes="Nota esistente"
          onClose={handleClose}
          onSave={handleSave}
        />
      );

      fireEvent.click(screen.getByTestId('status-btn-smart'));

      expect(handleSave).toHaveBeenCalledWith('2026-10-05', 'smart', 'Nota esistente');
      expect(handleClose).toHaveBeenCalled();
    });

    it('allows typing new notes and saving via modal-save-btn', async () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <StatusSelectorModal
          isOpen={true}
          date="2026-10-05"
          currentStatus="presenza"
          onClose={handleClose}
          onSave={handleSave}
        />
      );

      const notesInput = screen.getByTestId('modal-notes-input');
      fireEvent.change(notesInput, { target: { value: 'Lavoro straordinario concordato' } });

      fireEvent.click(screen.getByTestId('modal-save-btn'));

      expect(handleSave).toHaveBeenCalledWith('2026-10-05', 'presenza', 'Lavoro straordinario concordato');
      expect(handleClose).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked without saving', () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <StatusSelectorModal
          isOpen={true}
          date="2026-10-05"
          currentStatus="presenza"
          onClose={handleClose}
          onSave={handleSave}
        />
      );

      fireEvent.click(screen.getByTestId('modal-close-btn'));
      expect(handleClose).toHaveBeenCalledTimes(1);
      expect(handleSave).not.toHaveBeenCalled();
    });
  });

  describe('CalendarGrid Full Integration', () => {
    it('renders weekday headers (Lun-Dom) and all weeks of the month', async () => {
      await renderCalendarWithProviders(<CalendarGrid />, {
        initialYear: 2026,
        initialMonth: 10,
      });

      // 7 Weekday headers
      expect(screen.getByText('Lun')).toBeInTheDocument();
      expect(screen.getByText('Mar')).toBeInTheDocument();
      expect(screen.getByText('Mer')).toBeInTheDocument();
      expect(screen.getByText('Gio')).toBeInTheDocument();
      expect(screen.getByText('Ven')).toBeInTheDocument();
      expect(screen.getByText('Sab')).toBeInTheDocument();
      expect(screen.getByText('Dom')).toBeInTheDocument();

      // Oct 1st 2026 is a Thursday, so week 40 includes Sep 28 - Oct 4
      expect(screen.getByTestId('day-card-2026-10-01')).toBeInTheDocument();
      expect(screen.getByTestId('day-card-2026-10-31')).toBeInTheDocument();

      // Previous month days in the first week have data-outside-month="true"
      const sep30 = screen.getByTestId('day-card-2026-09-30');
      expect(sep30).toHaveAttribute('data-outside-month', 'true');

      // Current month day has data-outside-month="false"
      const oct1 = screen.getByTestId('day-card-2026-10-01');
      expect(oct1).toHaveAttribute('data-outside-month', 'false');
    });

    it('selects day card on click and invokes onSelectDay without opening any popup modal', async () => {
      const onSelectDayMock = vi.fn();

      await renderCalendarWithProviders(<CalendarGrid onSelectDay={onSelectDayMock} />, {
        initialYear: 2026,
        initialMonth: 10,
      });

      // Click on Oct 14th
      const dayCard = screen.getByTestId('day-card-2026-10-14');
      await act(async () => {
        fireEvent.click(dayCard);
      });

      expect(onSelectDayMock).toHaveBeenCalledWith('2026-10-14');

      // Modal should NOT be open
      expect(screen.queryByTestId('status-selector-modal')).not.toBeInTheDocument();
      expect(dayCard).toHaveAttribute('data-selected', 'true');
    });

    it('renders weekly policy alerts when weekly presence rules are violated', async () => {
      // Seed cached days: 5 smart days in week 41 (Oct 5 - Oct 11) -> violates minPresence and maxSmart (max 4)
      localCache.saveCalendarDay('2026-10-05', { date: '2026-10-05', status: 'smart', isConfirmed: true });
      localCache.saveCalendarDay('2026-10-06', { date: '2026-10-06', status: 'smart', isConfirmed: true });
      localCache.saveCalendarDay('2026-10-07', { date: '2026-10-07', status: 'smart', isConfirmed: true });
      localCache.saveCalendarDay('2026-10-08', { date: '2026-10-08', status: 'smart', isConfirmed: true });
      localCache.saveCalendarDay('2026-10-09', { date: '2026-10-09', status: 'smart', isConfirmed: true });

      await renderCalendarWithProviders(<CalendarGrid />, {
        initialYear: 2026,
        initialMonth: 10,
      });

      // Week 41 should have an alert
      const week41Badge = await screen.findByTestId('week-summary-41');
      expect(week41Badge).toHaveAttribute('data-compliant', 'false');
      expect(week41Badge).toHaveTextContent(/Superato massimo 4 smart/i);
    });

    it('supports compact prop for split layout', async () => {
      await renderCalendarWithProviders(<CalendarGrid compact={true} />, {
        initialYear: 2026,
        initialMonth: 10,
      });

      const gridContainer = screen.getByTestId('calendar-grid');
      expect(gridContainer).toHaveAttribute('data-compact', 'true');
    });
  });
});
