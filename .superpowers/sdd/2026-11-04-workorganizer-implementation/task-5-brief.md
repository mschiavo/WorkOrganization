# Task 5 Brief: Supabase Client, Auth Context & Local Storage Fallback

## Goal
Implementare lo strato di persistenza e autenticazione:
1. Script SQL iniziale con tabelle e Row Level Security (`supabase/migrations/20261104_init_workorganizer.sql`)
2. Local Storage Cache con supporto offline e impostazioni predefinite (`src/services/storage/localCache.ts` e `src/services/storage/localCache.test.ts`)
3. Supabase Client con supporto a fallback offline/chiavi personalizzate (`src/services/supabase/client.ts`)
4. Auth Context React con stato sessione, login, registrazione, logout e modalità "Guest/Demo" locale (`src/services/supabase/authContext.tsx` e `src/services/supabase/authContext.test.tsx`)

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git init, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Interfaces & Contracts

### 1. Database Schema (`supabase/migrations/20261104_init_workorganizer.sql`)
- Tabelle:
  - `app_settings` (id uuid pk, user_id uuid fk auth.users, max_smart_days_month int default 10, min_presence_days_week int default 1, max_smart_days_week int default 4, ferie_compensates_presence bool default false, standard_day_hours numeric default 8.0, reduced_day_hours numeric default 7.0, min_lunch_break_minutes int default 30, max_daily_bank_recovery_minutes int default 60, canteen_voucher_cost numeric default 1.50, smart_voucher_value numeric default 8.00, preferred_layout text default 'tabbed', preferred_theme text default 'dark', updated_at timestamptz default now())
  - `calendar_days` (id uuid pk, user_id uuid fk auth.users, date date not null, status text not null, notes text, is_confirmed bool default false, created_at timestamptz default now(), updated_at timestamptz default now(), unique(user_id, date))
  - `time_entries` (id uuid pk, user_id uuid fk auth.users, date date not null, morning_in text, lunch_out text, lunch_in text, evening_out text, permission_minutes int default 0, lunch_duration_minutes int default 0, worked_minutes int default 0, expected_exit_8h text, expected_exit_7h text, delta_minutes int default 0, canteen_used bool default false, is_smart_work bool default false, updated_at timestamptz default now(), unique(user_id, date))
  - `bank_hours_quarters` (id uuid pk, user_id uuid fk auth.users, quarter_id text not null, year int not null, quarter_number int not null, carryover_from_prev_quarter int default 0, total_delta_minutes int default 0, is_closed bool default false, updated_at timestamptz default now(), unique(user_id, quarter_id))
- RLS abilitato su tutte le 4 tabelle: policy per SELECT, INSERT, UPDATE, DELETE che verificano `auth.uid() = user_id`.

### 2. `src/services/storage/localCache.ts`
```typescript
export interface AppSettings {
  maxSmartDaysMonth: number;
  minPresenceDaysWeek: number;
  maxSmartDaysWeek: number;
  ferieCompensatesPresence: boolean;
  standardDayHours: number;
  reducedDayHours: number;
  minLunchBreakMinutes: number;
  maxDailyBankRecoveryMinutes: number;
  canteenVoucherCost: number;
  smartVoucherValue: number;
  preferredLayout: 'tabbed' | 'split' | 'smart-sheet';
  preferredTheme: 'dark' | 'light' | 'system';
}

export const DEFAULT_SETTINGS: AppSettings = {
  maxSmartDaysMonth: 10,
  minPresenceDaysWeek: 1,
  maxSmartDaysWeek: 4,
  ferieCompensatesPresence: false,
  standardDayHours: 8,
  reducedDayHours: 7,
  minLunchBreakMinutes: 30,
  maxDailyBankRecoveryMinutes: 60,
  canteenVoucherCost: 1.5,
  smartVoucherValue: 8.0,
  preferredLayout: 'tabbed',
  preferredTheme: 'dark',
};

export const localCache = {
  getSettings(): AppSettings;
  saveSettings(settings: Partial<AppSettings>): AppSettings;
  getCalendarDays(): Record<string, any>; // key: "YYYY-MM-DD"
  saveCalendarDay(date: string, data: any): void;
  saveCalendarDays(daysMap: Record<string, any>): void;
  getTimeEntries(): Record<string, any>; // key: "YYYY-MM-DD"
  saveTimeEntry(date: string, entry: any): void;
  saveTimeEntries(entriesMap: Record<string, any>): void;
  getSupabaseConfig(): { url: string; anonKey: string } | null;
  saveSupabaseConfig(config: { url: string; anonKey: string } | null): void;
  clearAll(): void;
};
```

### 3. `src/services/supabase/client.ts`
- Recupera URL e Anon Key da:
  - `import.meta.env.VITE_SUPABASE_URL` e `import.meta.env.VITE_SUPABASE_ANON_KEY`
  - Oppure da `localCache.getSupabaseConfig()`
- Se non configurati, fornisce un flag `isSupabaseConfigured(): boolean` (false se mancano le chiavi) e un client dummy o gestito con grazia senza crash.

### 4. `src/services/supabase/authContext.tsx`
- Esporta `AuthProvider` e `useAuth()` hook.
- Espone:
  - `user`: utente Supabase (o utente mock guest: `{ id: 'guest-user', email: 'guest@workorganizer.local' }` se in modalità guest)
  - `session`: sessione Supabase o null
  - `isGuest`: boolean (true se l'utente naviga come ospite/offline)
  - `isConfigured`: boolean (se Supabase è configurato con URL e Key)
  - `loading`: boolean
  - `signIn(email, password)`
  - `signUp(email, password)`
  - `signOut()`
  - `continueAsGuest()`

## Verification
- `npx vitest run src/services/storage/localCache.test.ts`
- Se crei `src/services/supabase/authContext.test.tsx`, deve passare.
- `npx vitest run` (tutti i test verdi)
- `npx tsc` (zero errori)

## Deliverables
- `supabase/migrations/20261104_init_workorganizer.sql`
- `src/services/storage/localCache.ts`
- `src/services/storage/localCache.test.ts`
- `src/services/supabase/client.ts`
- `src/services/supabase/authContext.tsx`
- `src/services/supabase/authContext.test.tsx`
- Report in `.superpowers/sdd/2026-11-04-workorganizer-implementation/task-5-report.md`
