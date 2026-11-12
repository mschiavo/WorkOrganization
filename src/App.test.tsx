import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from './App';
import { localCache } from './services/storage/localCache';

describe('App Full Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    localCache.clearAll();
  });

  it('renders the WorkOrganizer header, default split layout, and calendar', async () => {
    await act(async () => {
      render(<App />);
    });

    // Heading in Header
    expect(screen.getByRole('heading', { name: /workorganizer/i, level: 1 })).toBeInTheDocument();

    // Default layout container is split
    expect(screen.getByTestId('layout-container')).toBeInTheDocument();
    expect(screen.getByTestId('split-layout')).toBeInTheDocument();

    // Calendar grid is visible
    expect(screen.getByTestId('calendar-grid')).toBeInTheDocument();
  });

  it('opens and closes settings modal via header button', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();

    // Click settings in Header
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-settings'));
    });

    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();

    // Close settings
    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-cancel-settings'));
    });

    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
  });

  it('opens and closes auth modal when clicking guest badge', async () => {
    await act(async () => {
      render(<App />);
    });

    expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();

    // Click guest badge in Header
    const guestBadge = screen.getByTestId('badge-guest');
    await act(async () => {
      fireEvent.click(guestBadge);
    });

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();

    // Close modal
    await act(async () => {
      fireEvent.click(screen.getByTestId('modal-close-btn'));
    });

    expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
  });
});
