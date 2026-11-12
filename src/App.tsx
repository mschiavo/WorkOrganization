import React, { useState } from 'react';
import { AuthProvider } from './services/supabase/authContext';
import { WorkOrganizerProvider } from './context/WorkOrganizerContext';
import { Header } from './components/Header/Header';
import { LayoutContainer } from './layouts/LayoutContainer';
import { SettingsModal } from './features/settings/SettingsModal';
import { AuthModal } from './features/auth/AuthModal';

const AppContent: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  return (
    <div className="app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      <div style={{ flex: 1 }}>
        <LayoutContainer />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <WorkOrganizerProvider>
        <AppContent />
      </WorkOrganizerProvider>
    </AuthProvider>
  );
};

export default App;
