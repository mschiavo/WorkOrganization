import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { AuthContext, AuthContextType } from '../services/supabase/authContext';
import { WorkOrganizerProvider, useWorkOrganizer } from './WorkOrganizerContext';
import { localCache, DEFAULT_SETTINGS, StorageIdentity } from '../services/storage/localCache';
import { workDataService } from '../services/repository/workDataService';

const TestProfileView: React.FC = () => {
  const { days, settings, currentMonth, updateDayStatus, updateSettings, loading } = useWorkOrganizer();

  return (
    <div>
      <span data-testid="is-loading">{loading ? 'loading' : 'ready'}</span>
      <span data-testid="month">{currentMonth}</span>
      <span data-testid="yearly-ferie">{settings.yearlyFerieHours}</span>
      <span data-testid="day-count">{Object.keys(days).length}</span>
      <span data-testid="sample-note">{days['2026-11-04']?.notes || 'no-note'}</span>
      <span data-testid="sample-status">{days['2026-11-04']?.status || 'none'}</span>
      <button
        data-testid="btn-mark-smart"
        onClick={() => updateDayStatus('2026-11-04', 'smart', 'Test Smart')}
      >
        Mark Smart
      </button>
      <button
        data-testid="btn-set-ferie"
        onClick={() => updateSettings({ yearlyFerieHours: 190 })}
      >
        Set Ferie 190
      </button>
    </div>
  );
};

describe('P1.1 Account Isolation & Identity Lifecycle Acceptance Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    localCache.resetForTesting();
    vi.restoreAllMocks();
  });

  function createMockAuth(identity: StorageIdentity, userObj?: any): AuthContextType {
    const isGuest = identity.scope === 'guest';
    const user = userObj || (isGuest ? { id: 'guest-user', email: 'guest@local' } : { id: identity.userId!, email: `${identity.userId}@test.com` });

    return {
      user,
      session: isGuest ? null : ({ user } as any),
      isGuest,
      isConfigured: true,
      loading: false,
      activeIdentity: identity,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      continueAsGuest: vi.fn(),
    };
  }

  it('strictly isolates data between Guest, Account A, and Account B in the same browser', async () => {
    // Setup Account A data in cache
    const idA: StorageIdentity = { scope: 'cloud', userId: 'user-a', projectRef: 'proj-1' };
    localCache.setActiveIdentity(idA);
    localCache.saveCalendarDay('2026-11-04', { date: '2026-11-04', status: 'presenza', notes: 'Note from Account A' });
    localCache.saveSettings({ yearlyFerieHours: 180 });

    // Setup Account B data in cache
    const idB: StorageIdentity = { scope: 'cloud', userId: 'user-b', projectRef: 'proj-1' };
    localCache.setActiveIdentity(idB);
    localCache.saveCalendarDay('2026-11-04', { date: '2026-11-04', status: 'ferie', notes: 'Note from Account B' });
    localCache.saveSettings({ yearlyFerieHours: 150 });

    // Setup Guest data in cache
    const idGuest: StorageIdentity = { scope: 'guest' };
    localCache.setActiveIdentity(idGuest);
    localCache.saveCalendarDay('2026-11-04', { date: '2026-11-04', status: 'smart', notes: 'Note from Guest' });
    localCache.saveSettings({ yearlyFerieHours: 120 });

    // 1. Render as Account A
    const authA = createMockAuth(idA);
    let renderA: any;
    await act(async () => {
      renderA = render(
        <AuthContext.Provider value={authA}>
          <WorkOrganizerProvider initialYear={2026} initialMonth={11}>
            <TestProfileView />
          </WorkOrganizerProvider>
        </AuthContext.Provider>
      );
    });

    expect(screen.getByTestId('sample-note').textContent).toBe('Note from Account A');
    expect(screen.getByTestId('sample-status').textContent).toBe('presenza');
    expect(screen.getByTestId('yearly-ferie').textContent).toBe('180');

    // 2. Switch to Account B (simulate user login switch)
    const authB = createMockAuth(idB);
    await act(async () => {
      renderA.rerender(
        <AuthContext.Provider value={authB}>
          <WorkOrganizerProvider initialYear={2026} initialMonth={11}>
            <TestProfileView />
          </WorkOrganizerProvider>
        </AuthContext.Provider>
      );
    });

    expect(screen.getByTestId('sample-note').textContent).toBe('Note from Account B');
    expect(screen.getByTestId('sample-status').textContent).toBe('ferie');
    expect(screen.getByTestId('yearly-ferie').textContent).toBe('150');

    // 3. Switch to Guest (simulate logout)
    const authGuest = createMockAuth(idGuest);
    await act(async () => {
      renderA.rerender(
        <AuthContext.Provider value={authGuest}>
          <WorkOrganizerProvider initialYear={2026} initialMonth={11}>
            <TestProfileView />
          </WorkOrganizerProvider>
        </AuthContext.Provider>
      );
    });

    expect(screen.getByTestId('sample-note').textContent).toBe('Note from Guest');
    expect(screen.getByTestId('sample-status').textContent).toBe('smart');
    expect(screen.getByTestId('yearly-ferie').textContent).toBe('120');
  });

  it('discards delayed/out-of-order in-flight responses when switching accounts or logging out', async () => {
    const idA: StorageIdentity = { scope: 'cloud', userId: 'user-a', projectRef: 'proj-1' };
    const idB: StorageIdentity = { scope: 'cloud', userId: 'user-b', projectRef: 'proj-1' };

    let resolveAccountARequest: (data: any) => void = () => {};
    const delayedAccountAPromise = new Promise((resolve) => {
      resolveAccountARequest = resolve;
    });

    vi.spyOn(workDataService, 'loadSettings').mockImplementation(async (userId) => {
      if (userId === 'user-a') {
        return { ...DEFAULT_SETTINGS, yearlyFerieHours: 300 };
      }
      return { ...DEFAULT_SETTINGS, yearlyFerieHours: 150 };
    });

    vi.spyOn(workDataService, 'loadMonthData').mockImplementation(async (_year, _month, userId) => {
      if (userId === 'user-a') {
        await delayedAccountAPromise;
        return {
          days: { '2026-11-04': { date: '2026-11-04', status: 'presenza', notes: 'Stale Response from A' } },
          timeEntries: {},
          settings: { ...DEFAULT_SETTINGS, yearlyFerieHours: 300 },
        };
      }
      return {
        days: { '2026-11-04': { date: '2026-11-04', status: 'smart', notes: 'Fresh Response from B' } },
        timeEntries: {},
        settings: { ...DEFAULT_SETTINGS, yearlyFerieHours: 150 },
      };
    });

    // 1. Mount with Account A (triggers delayed loadData for A)
    const authA = createMockAuth(idA);
    let renderResult: any;
    await act(async () => {
      renderResult = render(
        <AuthContext.Provider value={authA}>
          <WorkOrganizerProvider initialYear={2026} initialMonth={11}>
            <TestProfileView />
          </WorkOrganizerProvider>
        </AuthContext.Provider>
      );
    });

    // 2. Before Account A finishes, switch to Account B
    const authB = createMockAuth(idB);
    await act(async () => {
      renderResult.rerender(
        <AuthContext.Provider value={authB}>
          <WorkOrganizerProvider initialYear={2026} initialMonth={11}>
            <TestProfileView />
          </WorkOrganizerProvider>
        </AuthContext.Provider>
      );
    });

    // Account B finishes first and shows B's data
    expect(screen.getByTestId('sample-note').textContent).toBe('Fresh Response from B');
    expect(screen.getByTestId('yearly-ferie').textContent).toBe('150');

    // 3. Now Account A's delayed request finally resolves
    await act(async () => {
      resolveAccountARequest(true);
    });

    // Account B MUST NOT be contaminated by Account A's stale response!
    expect(screen.getByTestId('sample-note').textContent).toBe('Fresh Response from B');
    expect(screen.getByTestId('yearly-ferie').textContent).toBe('150');
  });

  it('keeps legacy unclaimed data safe without attributing it to cloud accounts automatically', async () => {
    // Pre-existing legacy data without owner
    localStorage.setItem(
      'workorganizer_calendar_days',
      JSON.stringify({ '2026-10-01': { date: '2026-10-01', status: 'presenza', notes: 'Old legacy data' } })
    );

    expect(localCache.hasLegacyUnclaimedData()).toBe(true);

    const idCloud: StorageIdentity = { scope: 'cloud', userId: 'user-new', projectRef: 'proj-1' };
    const authCloud = createMockAuth(idCloud);

    await act(async () => {
      render(
        <AuthContext.Provider value={authCloud}>
          <WorkOrganizerProvider initialYear={2026} initialMonth={10}>
            <TestProfileView />
          </WorkOrganizerProvider>
        </AuthContext.Provider>
      );
    });

    // Cloud account starts clean, does not steal legacy data automatically
    expect(screen.getByTestId('day-count').textContent).toBe('0');
    expect(screen.getByTestId('sample-note').textContent).toBe('no-note');

    // Legacy data remains unowned and available for explicit import
    expect(localCache.hasLegacyUnclaimedData()).toBe(true);
  });
});
