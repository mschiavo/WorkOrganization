import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Header } from './Header';
import { MonthSelector } from './MonthSelector';
import { KpiBadges } from './KpiBadges';
import { WorkOrganizerProvider } from '../../context/WorkOrganizerContext';
import { AuthContext, AuthContextType } from '../../services/supabase/authContext';
import { MonthValidationResult } from '../../core/domain/policyValidator';
import { QuarterSummary } from '../../core/domain/bancaOreManager';
import { MealVoucherSummary } from '../../core/domain/mealVouchersLedger';

const renderWithProviders = async (
  ui: React.ReactElement,
  options?: {
    initialYear?: number;
    initialMonth?: number;
    authContextValue?: Partial<AuthContextType>;
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
    ...options?.authContextValue,
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

describe('Header & Global Navigation Components', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  describe('Header Rendering & Branding', () => {
    it('renders the WorkOrganizer brand title and version badge', async () => {
      await renderWithProviders(<Header />);
      expect(screen.getByText('WorkOrganizer')).toBeInTheDocument();
      expect(screen.getByText(/v0\.5\.1/i)).toBeInTheDocument();
    });

    it('triggers onOpenSettings callback when settings button is clicked', async () => {
      const handleOpenSettings = vi.fn();
      await renderWithProviders(<Header onOpenSettings={handleOpenSettings} />);

      const settingsBtn = screen.getByTestId('btn-settings');
      expect(settingsBtn).toBeInTheDocument();
      fireEvent.click(settingsBtn);

      expect(handleOpenSettings).toHaveBeenCalledTimes(1);
    });
  });

  describe('MonthSelector Component', () => {
    it('renders month name in Italian with capitalized initial letter and year', async () => {
      await renderWithProviders(<Header />, { initialYear: 2026, initialMonth: 10 });
      // Month 10 should be "Ottobre 2026"
      expect(screen.getByTestId('month-display')).toHaveTextContent('Ottobre 2026');
    });

    it('navigates to previous month, next month, and today', async () => {
      await renderWithProviders(<Header />, { initialYear: 2026, initialMonth: 10 });

      const prevBtn = screen.getByTestId('btn-prev-month');
      const nextBtn = screen.getByTestId('btn-next-month');
      const todayBtn = screen.getByTestId('btn-today');

      // Click next month -> Novembre 2026
      await act(async () => {
        fireEvent.click(nextBtn);
      });
      await waitFor(() => {
        expect(screen.getByTestId('month-display')).toHaveTextContent('Novembre 2026');
      });

      // Click prev month twice -> Ottobre 2026 -> Settembre 2026
      await act(async () => {
        fireEvent.click(prevBtn);
      });
      await waitFor(() => {
        expect(screen.getByTestId('month-display')).toHaveTextContent('Ottobre 2026');
      });
      await act(async () => {
        fireEvent.click(prevBtn);
      });
      await waitFor(() => {
        expect(screen.getByTestId('month-display')).toHaveTextContent('Settembre 2026');
      });

      // Click today button
      await act(async () => {
        fireEvent.click(todayBtn);
      });
      const now = new Date();
      const italianMonths = [
        'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
        'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
      ];
      const expectedTodayLabel = `${italianMonths[now.getMonth()]} ${now.getFullYear()}`;
      await waitFor(() => {
        expect(screen.getByTestId('month-display')).toHaveTextContent(expectedTodayLabel);
      });
    });

    it('works as a standalone component with explicit props', () => {
      const onPrev = vi.fn();
      const onNext = vi.fn();
      const onToday = vi.fn();

      render(
        <MonthSelector
          currentYear={2027}
          currentMonth={1}
          onPrevMonth={onPrev}
          onNextMonth={onNext}
          onToday={onToday}
        />
      );

      expect(screen.getByTestId('month-display')).toHaveTextContent('Gennaio 2027');

      fireEvent.click(screen.getByTestId('btn-prev-month'));
      expect(onPrev).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('btn-next-month'));
      expect(onNext).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByTestId('btn-today'));
      expect(onToday).toHaveBeenCalledTimes(1);
    });
  });

  describe('KpiBadges Component', () => {
    it('renders Smart, Banca Ore, and Meal Vouchers badges with correct formats', async () => {
      await renderWithProviders(<Header />, { initialYear: 2026, initialMonth: 10 });

      // Default state: 0/10 smart days, Q4 banca ore +00:00, buoni € 0.00
      const smartBadge = await screen.findByTestId('kpi-smart');
      expect(smartBadge).toHaveTextContent(/Smart:\s*0\/10\s*gg/i);

      const bancaOreBadge = await screen.findByTestId('kpi-banca-ore');
      expect(bancaOreBadge).toHaveTextContent(/2026-Q4:\s*\+00:00/i);

      const buoniBadge = await screen.findByTestId('kpi-buoni');
      expect(buoniBadge).toHaveTextContent(/Buoni:\s*€\s*0\.00/i);

      const ferieBadge = await screen.findByTestId('kpi-ferie');
      expect(ferieBadge).toHaveTextContent(/Ferie:\s*160h/i);

      const parBadge = await screen.findByTestId('kpi-par');
      expect(parBadge).toHaveTextContent(/PAR:\s*88h/i);
    });

    it('renders with appropriate status classes and indicators when supplied with customized values', () => {
      const mockValidation: MonthValidationResult = {
        year: 2026,
        month: 10,
        workingDaysCount: 22,
        presenceDays: 12,
        smartDoneDays: 8,
        smartPlannedDays: 2,
        totalSmartDays: 10,
        ferieDays: 0,
        closureDays: 0,
        unscheduledDaysCount: 0,
        smartStatus: 'OK',
        weeks: [],
        isMonthFullyCompliant: true,
      };

      const mockQuarter: QuarterSummary = {
        quarterId: '2026-Q4',
        year: 2026,
        quarterNumber: 4,
        monthDeltas: [{ month: 10, deltaMinutes: 90 }],
        totalDeltaMinutes: 90,
        isMonth1Compliant: true,
        canCoverDeficit: true,
        warningReasons: [],
      };

      const mockVouchers: MealVoucherSummary = {
        canteenUsedCount: 4,
        canteenCostPerUnit: 1.5,
        totalCanteenExpense: 6.0,
        smartVoucherCount: 10,
        smartVoucherValuePerUnit: 8.0,
        totalSmartVouchersValue: 80.0,
        netBalance: 74.0,
      };

      render(
        <KpiBadges
          monthValidation={mockValidation}
          quarterSummary={mockQuarter}
          mealVouchers={mockVouchers}
          maxSmartDays={10}
        />
      );

      const smartBadge = screen.getByTestId('kpi-smart');
      expect(smartBadge).toHaveTextContent('Smart: 10/10 gg');
      expect(smartBadge).toHaveAttribute('data-status', 'OK');

      const bancaOreBadge = screen.getByTestId('kpi-banca-ore');
      expect(bancaOreBadge).toHaveTextContent('2026-Q4: +01:30');
      expect(bancaOreBadge).toHaveAttribute('data-status', 'positive');

      const buoniBadge = screen.getByTestId('kpi-buoni');
      expect(buoniBadge).toHaveTextContent('Buoni: € 74.00');
      expect(buoniBadge).toHaveAttribute('data-status', 'positive');
    });

    it('displays warning/danger status on smart badge and negative banca ore', () => {
      const mockValidation: MonthValidationResult = {
        year: 2026,
        month: 10,
        workingDaysCount: 22,
        presenceDays: 5,
        smartDoneDays: 12,
        smartPlannedDays: 1,
        totalSmartDays: 13,
        ferieDays: 0,
        closureDays: 0,
        unscheduledDaysCount: 0,
        smartStatus: 'ERRORE',
        weeks: [],
        isMonthFullyCompliant: false,
      };

      const mockQuarter: QuarterSummary = {
        quarterId: '2026-Q4',
        year: 2026,
        quarterNumber: 4,
        monthDeltas: [{ month: 10, deltaMinutes: -45 }],
        totalDeltaMinutes: -45,
        isMonth1Compliant: false,
        canCoverDeficit: false,
        warningReasons: ['Deficit mese 1'],
      };

      const mockVouchers: MealVoucherSummary = {
        canteenUsedCount: 5,
        canteenCostPerUnit: 1.5,
        totalCanteenExpense: 7.5,
        smartVoucherCount: 0,
        smartVoucherValuePerUnit: 8.0,
        totalSmartVouchersValue: 0.0,
        netBalance: -7.5,
      };

      render(
        <KpiBadges
          monthValidation={mockValidation}
          quarterSummary={mockQuarter}
          mealVouchers={mockVouchers}
          maxSmartDays={10}
        />
      );

      const smartBadge = screen.getByTestId('kpi-smart');
      expect(smartBadge).toHaveAttribute('data-status', 'ERRORE');

      const bancaOreBadge = screen.getByTestId('kpi-banca-ore');
      expect(bancaOreBadge).toHaveTextContent('2026-Q4: -00:45');
      expect(bancaOreBadge).toHaveAttribute('data-status', 'negative');

      const buoniBadge = screen.getByTestId('kpi-buoni');
      expect(buoniBadge).toHaveTextContent('Buoni: € -7.50');
      expect(buoniBadge).toHaveAttribute('data-status', 'negative');
    });
  });

  describe('Quick Layout Switcher', () => {
    it('renders 2 layout buttons (Split and Smart Sheet) and updates settings on click', async () => {
      await renderWithProviders(<Header />);

      const splitBtn = screen.getByTestId('layout-split');
      const smartSheetBtn = screen.getByTestId('layout-smart-sheet');

      expect(screen.queryByTestId('layout-tabbed')).not.toBeInTheDocument();
      expect(splitBtn).toBeInTheDocument();
      expect(smartSheetBtn).toBeInTheDocument();

      // Default layout is 'split'
      expect(splitBtn).toHaveAttribute('aria-pressed', 'true');
      expect(smartSheetBtn).toHaveAttribute('aria-pressed', 'false');

      // Click smart sheet layout
      await act(async () => {
        fireEvent.click(smartSheetBtn);
      });
      await waitFor(() => {
        expect(smartSheetBtn).toHaveAttribute('aria-pressed', 'true');
        expect(splitBtn).toHaveAttribute('aria-pressed', 'false');
      });

      // Click split layout again
      await act(async () => {
        fireEvent.click(splitBtn);
      });
      await waitFor(() => {
        expect(splitBtn).toHaveAttribute('aria-pressed', 'true');
        expect(smartSheetBtn).toHaveAttribute('aria-pressed', 'false');
      });
    });
  });

  describe('Theme Switcher Toggle', () => {
    it('toggles theme between dark and light, updating document data-theme', async () => {
      await renderWithProviders(<Header />);

      const themeBtn = screen.getByTestId('btn-theme-toggle');
      expect(themeBtn).toBeInTheDocument();

      // Default theme is 'dark'
      // Click to toggle to light
      await act(async () => {
        fireEvent.click(themeBtn);
      });
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      });

      // Click again to toggle back to dark
      await act(async () => {
        fireEvent.click(themeBtn);
      });
      await waitFor(() => {
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      });
    });
  });

  describe('Auth and Guest State', () => {
    it('renders guest badge and calls onOpenAuth when guest triggers auth', async () => {
      const handleOpenAuth = vi.fn();
      await renderWithProviders(<Header onOpenAuth={handleOpenAuth} />, {
        authContextValue: {
          isGuest: true,
          user: { id: 'guest', email: 'guest@workorganizer.local' },
        },
      });

      const guestBadge = screen.getByTestId('badge-guest');
      expect(guestBadge).toBeInTheDocument();
      expect(guestBadge).toHaveTextContent(/Ospite|Guest/i);

      fireEvent.click(guestBadge);
      expect(handleOpenAuth).toHaveBeenCalledTimes(1);
    });

    it('renders user email and signOut button when logged in, and calls signOut on click', async () => {
      const mockSignOut = vi.fn().mockResolvedValue(undefined);
      await renderWithProviders(<Header />, {
        authContextValue: {
          isGuest: false,
          user: { id: 'user-123', email: 'mario.rossi@company.it' },
          signOut: mockSignOut,
        },
      });

      expect(screen.getByTestId('badge-user')).toHaveTextContent('mario.rossi@company.it');
      const logoutBtn = screen.getByTestId('btn-logout');
      expect(logoutBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(logoutBtn);
      });
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
