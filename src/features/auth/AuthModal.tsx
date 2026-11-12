import React, { useState } from 'react';
import { X, Lock, Mail } from 'lucide-react';
import { useAuth } from '../../services/supabase/authContext';
import styles from './Auth.module.css';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onOpenSettings }) => {
  const { signIn, signUp, continueAsGuest, isConfigured } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Inserisci sia email che password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          onClose();
        }
      } else {
        const { error } = await signUp(email.trim(), password);
        if (error) {
          setErrorMsg(error.message);
        } else {
          alert('Registrazione completata! Controlla la tua email per confermare l\'account o accedi direttamente.');
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Si è verificato un errore.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    onClose();
  };

  return (
    <div
      className={styles.modalBackdrop}
      onClick={onClose}
      data-testid="auth-modal"
    >
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle} id="auth-modal-title">
            {mode === 'signin' ? 'Accedi a WorkOrganizer' : 'Crea Nuovo Account'}
          </h2>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            data-testid="modal-close-btn"
            aria-label="Chiudi"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {!isConfigured && (
            <div className={styles.unconfiguredBanner} data-testid="unconfigured-banner">
              ⚠️ <strong>Supabase non è ancora configurato.</strong> Puoi continuare come
              ospite in locale, oppure inserire URL e Anon Key nelle{' '}
              {onOpenSettings ? (
                <button
                  type="button"
                  style={{ textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                  onClick={() => {
                    onClose();
                    onOpenSettings();
                  }}
                >
                  Impostazioni
                </button>
              ) : (
                'Impostazioni'
              )}
              .
            </div>
          )}

          <div className={styles.tabSwitchRow} role="tablist">
            <button
              type="button"
              className={styles.tabSwitchBtn}
              data-active={mode === 'signin'}
              data-testid="tab-login"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
            >
              Accedi
            </button>
            <button
              type="button"
              className={styles.tabSwitchBtn}
              data-active={mode === 'signup'}
              data-testid="tab-signup"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
            >
              Registrati
            </button>
          </div>

          {errorMsg && (
            <div className={styles.errorBanner} data-testid="auth-error-msg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label htmlFor="auth-email" className={styles.label}>
                <Mail size={14} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                className={styles.input}
                data-testid="input-auth-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="auth-password" className={styles.label}>
                <Lock size={14} style={{ display: 'inline', verticalAlign: '-1px', marginRight: '4px' }} />
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                className={styles.input}
                data-testid="input-auth-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              data-testid="btn-auth-submit"
              disabled={loading}
            >
              {loading
                ? 'Elaborazione in corso...'
                : mode === 'signin'
                ? 'Accedi'
                : 'Registrati'}
            </button>
          </form>

          <div className={styles.dividerRow}>
            <div className={styles.dividerLine} />
            <span>oppure</span>
            <div className={styles.dividerLine} />
          </div>

          <button
            type="button"
            className={styles.guestBtn}
            data-testid="btn-auth-guest"
            onClick={handleGuest}
          >
            Continua come Ospite (Offline / Demo)
          </button>
        </div>
      </div>
    </div>
  );
};
