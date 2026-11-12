import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { AuthModal } from './AuthModal';
import { AuthContext, AuthContextType } from '../../services/supabase/authContext';

const renderAuthModal = (
  isOpen = true,
  onClose = vi.fn(),
  contextOverrides?: Partial<AuthContextType>
) => {
  const defaultAuthValue: AuthContextType = {
    user: null,
    session: null,
    isGuest: false,
    isConfigured: true,
    loading: false,
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue(undefined),
    continueAsGuest: vi.fn(),
    ...contextOverrides,
  };

  return render(
    <AuthContext.Provider value={defaultAuthValue}>
      <AuthModal isOpen={isOpen} onClose={onClose} />
    </AuthContext.Provider>
  );
};

describe('AuthModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    renderAuthModal(false);
    expect(screen.queryByTestId('auth-modal')).not.toBeInTheDocument();
  });

  it('renders signin mode by default and allows switching to signup mode', () => {
    renderAuthModal(true);

    expect(screen.getByTestId('auth-modal')).toBeInTheDocument();
    expect(screen.getByTestId('btn-auth-submit')).toHaveTextContent('Accedi');

    // Switch to signup
    fireEvent.click(screen.getByTestId('tab-signup'));
    expect(screen.getByTestId('btn-auth-submit')).toHaveTextContent('Registrati');

    // Switch back to signin
    fireEvent.click(screen.getByTestId('tab-login'));
    expect(screen.getByTestId('btn-auth-submit')).toHaveTextContent('Accedi');
  });

  it('submits signin and calls onClose on success', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({ error: null });
    const handleClose = vi.fn();

    renderAuthModal(true, handleClose, { signIn: mockSignIn });

    fireEvent.change(screen.getByTestId('input-auth-email'), {
      target: { value: 'mario.rossi@company.it' },
    });
    fireEvent.change(screen.getByTestId('input-auth-password'), {
      target: { value: 'secret123' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-auth-submit'));
    });

    expect(mockSignIn).toHaveBeenCalledWith('mario.rossi@company.it', 'secret123');
    expect(handleClose).toHaveBeenCalled();
  });

  it('displays error message when signin fails', async () => {
    const mockSignIn = vi.fn().mockResolvedValue({
      error: new Error('Credenziali non valide'),
    });

    renderAuthModal(true, vi.fn(), { signIn: mockSignIn });

    fireEvent.change(screen.getByTestId('input-auth-email'), {
      target: { value: 'wrong@user.it' },
    });
    fireEvent.change(screen.getByTestId('input-auth-password'), {
      target: { value: 'wrongpass' },
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('btn-auth-submit'));
    });

    expect(screen.getByTestId('auth-error-msg')).toHaveTextContent('Credenziali non valide');
  });

  it('calls continueAsGuest and closes modal on guest button click', () => {
    const mockContinueAsGuest = vi.fn();
    const handleClose = vi.fn();

    renderAuthModal(true, handleClose, { continueAsGuest: mockContinueAsGuest });

    fireEvent.click(screen.getByTestId('btn-auth-guest'));

    expect(mockContinueAsGuest).toHaveBeenCalledTimes(1);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
