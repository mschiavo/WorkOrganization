# Task 12 Brief: Auth Screen, GitHub Actions Workflow & Full Build Verification

## Goal
Completare l'applicazione con:
1. `src/features/auth/AuthModal.tsx`: dialog modale di autenticazione Supabase (login, registrazione, modalità ospite offline).
2. `src/features/auth/Auth.module.css`: stili CSS dedicati.
3. `.github/workflows/deploy.yml`: pipeline di Continuous Integration e Continuous Deployment su GitHub Pages.
4. `src/App.tsx`: assemblaggio completo dell'albero dei componenti con `AuthProvider`, `WorkOrganizerProvider`, `Header`, `LayoutContainer`, `SettingsModal` e `AuthModal`.
5. `src/features/auth/AuthModal.test.tsx` e `src/App.test.tsx`: test unitari e di integrazione dell'intera app.

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Interfaces & Contracts

### In `src/features/auth/AuthModal.tsx`:
Props:
```typescript
export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```
Controlli:
- Toggle modalità Login / Registrati
- Input email (`data-testid="input-auth-email"`)
- Input password (`data-testid="input-auth-password"`)
- Bottone Submit (`data-testid="btn-auth-submit"`)
- Bottone "Continua come Ospite" (`data-testid="btn-auth-guest"`)
- Messaggio errore (`data-testid="auth-error-msg"`)
- Avviso se Supabase non è configurato con tasto per aprire configurazione

### In `src/App.tsx`:
- Provider gerarchici: `AuthProvider` -> `WorkOrganizerProvider`.
- Componente `AppContent`:
  - `Header` (passa `onOpenSettings`, `onOpenAuth`)
  - `LayoutContainer`
  - `SettingsModal` (`isOpen`, `onClose`)
  - `AuthModal` (`isOpen`, `onClose`)

### In `.github/workflows/deploy.yml`:
- Trigger: push su `main`, `workflow_dispatch`.
- Permissions: `contents: read`, `pages: write`, `id-token: write`.
- Step:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` con node-version: 20
  3. `npm ci` o `npm install`
  4. `npm run test`
  5. `npm run build`
  6. `actions/upload-pages-artifact@v3` con path `dist`
  7. `actions/deploy-pages@v4`

## Deliverables
- `src/features/auth/AuthModal.tsx`
- `src/features/auth/Auth.module.css`
- `src/features/auth/AuthModal.test.tsx`
- `.github/workflows/deploy.yml`
- `src/App.tsx`
- `src/App.test.tsx`
- Report in `.superpowers/sdd/2026-11-04-workorganizer-implementation/task-12-report.md`

## Verification
- `npx vitest run src/features/auth/AuthModal.test.tsx src/App.test.tsx`
- `npx vitest run` (tutti i test verdi)
- `npx tsc` (zero errori)
- `npm run build` (bundle generato con successo)
