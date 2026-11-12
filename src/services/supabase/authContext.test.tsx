import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth, GUEST_USER } from './authContext';
import { localCache } from '../storage/localCache';

const TestComponent: React.FC = () => {
  const { user, isGuest, isConfigured, continueAsGuest, signOut } = useAuth();
  return (
    <div>
      <span data-testid="user-id">{user?.id ?? 'none'}</span>
      <span data-testid="is-guest">{isGuest ? 'true' : 'false'}</span>
      <span data-testid="is-configured">{isConfigured ? 'true' : 'false'}</span>
      <button onClick={continueAsGuest} data-testid="btn-guest">
        Continue as Guest
      </button>
      <button onClick={signOut} data-testid="btn-signout">
        Sign Out
      </button>
    </div>
  );
};

describe('AuthContext and AuthProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders children and throws error if useAuth is used outside AuthProvider', () => {
    expect(() => render(<TestComponent />)).toThrow('useAuth must be used within an AuthProvider');
  });

  it('provides initial guest mode state when unconfigured', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initial state without credentials: not configured
    expect(screen.getByTestId('is-configured').textContent).toBe('false');
  });

  it('allows user to switch to guest mode with continueAsGuest', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const guestBtn = screen.getByTestId('btn-guest');
    await act(async () => {
      guestBtn.click();
    });

    expect(screen.getByTestId('is-guest').textContent).toBe('true');
    expect(screen.getByTestId('user-id').textContent).toBe(GUEST_USER.id);
  });

  it('clears guest user and local user cache on signOut', async () => {
    localCache.saveCalendarDay('2026-10-01', { date: '2026-10-01', status: 'presenza' });
    localCache.saveTimeEntry('2026-10-01', { date: '2026-10-01', morningIn: '08:00' });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const guestBtn = screen.getByTestId('btn-guest');
    await act(async () => {
      guestBtn.click();
    });

    expect(screen.getByTestId('user-id').textContent).toBe(GUEST_USER.id);

    const signOutBtn = screen.getByTestId('btn-signout');
    await act(async () => {
      signOutBtn.click();
    });

    expect(screen.getByTestId('is-guest').textContent).toBe('false');
    expect(screen.getByTestId('user-id').textContent).toBe('none');
    expect(localCache.getCalendarDays()).toEqual({});
    expect(localCache.getTimeEntries()).toEqual({});
  });
});
