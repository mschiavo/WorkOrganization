import React, { useState, useEffect } from 'react';
import {
  Settings,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  Columns,
  Table as TableIcon,
} from 'lucide-react';
import { useWorkOrganizer } from '../../context/WorkOrganizerContext';
import { useAuth } from '../../services/supabase/authContext';
import { MonthSelector } from './MonthSelector';
import { KpiBadges } from './KpiBadges';
import styles from './Header.module.css';

export interface HeaderProps {
  onOpenSettings?: () => void;
  onOpenAuth?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenAuth }) => {
  const { settings, updateSettings } = useWorkOrganizer();
  const { user, isGuest, signOut } = useAuth();

  const [currentTheme, setCurrentTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const active = settings.preferredTheme === 'light' ? 'light' : 'dark';
    setCurrentTheme(active);
    document.documentElement.setAttribute('data-theme', active);
  }, [settings.preferredTheme]);

  const handleToggleTheme = () => {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    updateSettings({ preferredTheme: nextTheme });
  };

  const handleLayoutChange = (layout: 'split' | 'smart-sheet') => {
    updateSettings({ preferredLayout: layout });
  };

  return (
    <header className={styles.headerContainer}>
      {/* Brand & Version */}
      <div className={styles.brandGroup}>
        <h1 className={styles.logoTitle}>WorkOrganizer</h1>
        <span className={styles.versionBadge}>v0.5.1</span>
      </div>

      {/* Center: Month Selector */}
      <MonthSelector />

      {/* KPI Badges */}
      <KpiBadges />

      {/* Right: Layout Switcher, Theme Toggle, Auth, Settings */}
      <div className={styles.actionsGroup}>
        {/* Layout Switcher */}
        <div className={styles.layoutSwitcher} role="group" aria-label="Selettore Layout">
          <button
            type="button"
            className={styles.layoutBtn}
            data-testid="layout-split"
            aria-pressed={settings.preferredLayout === 'split'}
            onClick={() => handleLayoutChange('split')}
            title="Layout Split Master-Detail"
          >
            <Columns size={14} />
            <span>Split</span>
          </button>

          <button
            type="button"
            className={styles.layoutBtn}
            data-testid="layout-smart-sheet"
            aria-pressed={settings.preferredLayout === 'smart-sheet'}
            onClick={() => handleLayoutChange('smart-sheet')}
            title="Layout Smart Sheet"
          >
            <TableIcon size={14} />
            <span>Sheet</span>
          </button>
        </div>

        {/* Theme Toggle */}
        <button
          type="button"
          className={styles.iconBtn}
          data-testid="btn-theme-toggle"
          onClick={handleToggleTheme}
          title={currentTheme === 'dark' ? 'Passa a tema chiaro' : 'Passa a tema scuro'}
          aria-label="Toggle tema"
        >
          {currentTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        {/* Auth / User Status */}
        {isGuest || !user ? (
          <button
            type="button"
            className={styles.userBadge}
            data-testid="badge-guest"
            onClick={onOpenAuth}
            title="Modalità Ospite locale. Clicca per accedere a Supabase."
          >
            <UserIcon size={14} />
            <span>Ospite</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span className={styles.userBadge} data-testid="badge-user">
              <UserIcon size={14} />
              <span>{user?.email}</span>
            </span>
            <button
              type="button"
              className={styles.iconBtn}
              data-testid="btn-logout"
              onClick={() => signOut()}
              title="Disconnetti"
              aria-label="Disconnetti"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}

        {/* Settings Button */}
        {onOpenSettings && (
          <button
            type="button"
            className={styles.iconBtn}
            data-testid="btn-settings"
            onClick={onOpenSettings}
            title="Impostazioni"
            aria-label="Impostazioni"
          >
            <Settings size={18} />
          </button>
        )}
      </div>
    </header>
  );
};
