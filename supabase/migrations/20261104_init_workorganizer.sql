-- WorkOrganization Initial Database Schema
-- Migration: 20261104_init_workorganizer.sql
-- Tables: app_settings, calendar_days, time_entries, bank_hours_quarters
-- Security: Row Level Security (RLS) enabled on all tables with auth.uid() = user_id policies

-- 1. App Settings Table
create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  max_smart_days_month int default 10,
  min_presence_days_week int default 1,
  max_smart_days_week int default 4,
  ferie_compensates_presence bool default false,
  standard_day_hours numeric default 8.0,
  reduced_day_hours numeric default 7.0,
  min_lunch_break_minutes int default 30,
  max_daily_bank_recovery_minutes int default 60,
  canteen_voucher_cost numeric default 1.50,
  smart_voucher_value numeric default 8.00,
  yearly_ferie_hours numeric default 160,
  prev_year_ferie_residual_hours numeric default 0,
  yearly_par_hours numeric default 88,
  prev_year_par_residual_hours numeric default 0,
  preferred_layout text default 'split',
  preferred_theme text default 'dark',
  updated_at timestamptz default now(),
  constraint app_settings_user_id_key unique(user_id)
);

-- 2. Calendar Days Table
create table if not exists public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  status text not null,
  notes text,
  is_confirmed bool default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint calendar_days_user_date_key unique(user_id, date)
);

-- 3. Time Entries Table
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null,
  morning_in text,
  lunch_out text,
  lunch_in text,
  evening_out text,
  permission_minutes int default 0,
  lunch_duration_minutes int default 0,
  worked_minutes int default 0,
  expected_exit_8h text,
  expected_exit_7h text,
  delta_minutes int default 0,
  canteen_used bool default false,
  is_smart_work bool default false,
  updated_at timestamptz default now(),
  constraint time_entries_user_date_key unique(user_id, date)
);

-- 4. Bank Hours Quarters Table
create table if not exists public.bank_hours_quarters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  quarter_id text not null,
  year int not null,
  quarter_number int not null,
  carryover_from_prev_quarter int default 0,
  total_delta_minutes int default 0,
  is_closed bool default false,
  updated_at timestamptz default now(),
  constraint bank_hours_quarters_user_quarter_key unique(user_id, quarter_id)
);

-- Indexes for performance
create index if not exists idx_calendar_days_user_date on public.calendar_days(user_id, date);
create index if not exists idx_time_entries_user_date on public.time_entries(user_id, date);
create index if not exists idx_bank_hours_quarters_user on public.bank_hours_quarters(user_id, quarter_id);

-- Enable Row Level Security (RLS) on all tables
alter table public.app_settings enable row level security;
alter table public.calendar_days enable row level security;
alter table public.time_entries enable row level security;
alter table public.bank_hours_quarters enable row level security;

-- RLS Policies for app_settings
create policy "Users can view own app_settings"
  on public.app_settings for select
  using (auth.uid() = user_id);

create policy "Users can insert own app_settings"
  on public.app_settings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own app_settings"
  on public.app_settings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own app_settings"
  on public.app_settings for delete
  using (auth.uid() = user_id);

-- RLS Policies for calendar_days
create policy "Users can view own calendar_days"
  on public.calendar_days for select
  using (auth.uid() = user_id);

create policy "Users can insert own calendar_days"
  on public.calendar_days for insert
  with check (auth.uid() = user_id);

create policy "Users can update own calendar_days"
  on public.calendar_days for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own calendar_days"
  on public.calendar_days for delete
  using (auth.uid() = user_id);

-- RLS Policies for time_entries
create policy "Users can view own time_entries"
  on public.time_entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own time_entries"
  on public.time_entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own time_entries"
  on public.time_entries for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own time_entries"
  on public.time_entries for delete
  using (auth.uid() = user_id);

-- RLS Policies for bank_hours_quarters
create policy "Users can view own bank_hours_quarters"
  on public.bank_hours_quarters for select
  using (auth.uid() = user_id);

create policy "Users can insert own bank_hours_quarters"
  on public.bank_hours_quarters for insert
  with check (auth.uid() = user_id);

create policy "Users can update own bank_hours_quarters"
  on public.bank_hours_quarters for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own bank_hours_quarters"
  on public.bank_hours_quarters for delete
  using (auth.uid() = user_id);
