import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import { WorkOrganizerProvider } from '../../context/WorkOrganizerContext';
import { AuthContext, AuthContextType } from '../../services/supabase/authContext';
import { localCache, DEFAULT_SETTINGS } from '../../services/storage/localCache';

const renderSettingsModal = async (
  isOpen = true,
  onClose = vi.fn()
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
        <WorkOrganizerProvider initialYear={2026} initialMonth={10}>
          <SettingsModal isOpen={isOpen} onClose={onClose} />
        </WorkOrganizerProvider>
      </AuthContext.Provider>
    );
  });
  return utils;
};

describe('SettingsModal Component', () => {
  beforeEach(() => {
    localCache.clearAll();
  });

  it('does not render when isOpen is false', async () => {
    await renderSettingsModal(false);
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
  });

  it('renders all setting inputs with current default values when open', async () => {
    await renderSettingsModal(true);

    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
    expect(screen.getByTestId('setting-max-smart')).toHaveValue(DEFAULT_SETTINGS.maxSmartDaysMonth);
    expect(screen.getByTestId('setting-min-presence')).toHaveValue(DEFAULT_SETTINGS.minPresenceDaysWeek);
    expect(screen.getByTestId('setting-max-smart-week')).toHaveValue(DEFAULT_SETTINGS.maxSmartDaysWeek);
    expect(screen.getByTestId('setting-min-lunch')).toHaveValue(DEFAULT_SETTINGS.minLunchBreakMinutes);
    expect(screen.getByTestId('setting-canteen-cost')).toHaveValue(DEFAULT_SETTINGS.canteenVoucherCost);
    expect(screen.getByTestId('setting-smart-value')).toHaveValue(DEFAULT_SETTINGS.smartVoucherValue);
    expect(screen.getByTestId('setting-yearly-ferie')).toHaveValue(DEFAULT_SETTINGS.yearlyFerieHours);
    expect(screen.getByTestId('setting-prev-ferie')).toHaveValue(DEFAULT_SETTINGS.prevYearFerieResidualHours);
    expect(screen.getByTestId('setting-yearly-par')).toHaveValue(DEFAULT_SETTINGS.yearlyParHours);
    expect(screen.getByTestId('setting-prev-par')).toHaveValue(DEFAULT_SETTINGS.prevYearParResidualHours);
  });

  it('allows changing settings and saving via btn-save-settings', async () => {
    const handleClose = vi.fn();
    await renderSettingsModal(true, handleClose);

    const smartInput = screen.getByTestId('setting-max-smart');
    fireEvent.change(smartInput, { target: { value: '12' } });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-save-settings'));
    });

    expect(handleClose).toHaveBeenCalled();
    expect(localCache.getSettings().maxSmartDaysMonth).toBe(12);
  });

  it('resets inputs to defaults on btn-reset-defaults', async () => {
    await renderSettingsModal(true);

    const smartInput = screen.getByTestId('setting-max-smart');
    fireEvent.change(smartInput, { target: { value: '15' } });
    expect(smartInput).toHaveValue(15);

    fireEvent.click(screen.getByTestId('btn-reset-defaults'));
    expect(smartInput).toHaveValue(DEFAULT_SETTINGS.maxSmartDaysMonth);
  });

  it('renders import mode selector defaulting to merge', async () => {
    await renderSettingsModal(true);

    const modeSelect = screen.getByTestId('select-import-mode');
    expect(modeSelect).toHaveValue('merge');

    fireEvent.change(modeSelect, { target: { value: 'replace' } });
    expect(modeSelect).toHaveValue('replace');
  });
});
