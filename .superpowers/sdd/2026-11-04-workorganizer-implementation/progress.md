# SDD ledger — plan: docs/superpowers/plans/2026-11-04-workorganizer-implementation.md

## Pre-flight Conflict Scan
- Nessun conflitto strutturale rilevato tra spec e plan (sono stati redatti nello stesso documento pochi minuti fa, coprendo Supabase Auth, policy e layout switch).
- Esecuzione pronta per il Task 1.

## Todo List
- [x] Task 1: Project Scaffolding, Tooling & Test Harness
- [x] Task 2: Domain Engine - TimeCalculator (TDD)
- [x] Task 3: Domain Engine - PolicyValidator & Calendario Mensile (TDD)
- [x] Task 4: Domain Engine - BancaOreManager & MealVouchersLedger (TDD)
- [x] Task 5: Supabase Client, Auth Context & Local Storage Fallback
- [x] Task 6: Data Repository & State Synchronization Service
- [x] Task 7: UI Component - Header & Global Navigation
- [x] Task 8: UI Feature - Calendar & Month Planning Grid
- [x] Task 9: UI Feature - Timbrature Registration Table & Day Detail Card
- [x] Task 10: Three Switchable Layouts (Tabbed, Split, Smart Sheet)
- [x] Task 11: Settings Page, Parameter Tuning & Backup/Export Engine
- [x] Task 12: Auth Screen, GitHub Actions Workflow & Full Build Verification

## Log
- 2026-11-04: Task 1 completato. Setup Vite + React 19 + TypeScript + Vitest harness.
- 2026-11-06: Task 2 completato e verificato. TimeCalculator e 23 test passati con successo (totale suite: 24/24).
- 2026-11-06: Task 3 completato e verificato. PolicyValidator e 28 test passati con successo (totale suite: 52/52). Zero errori TypeScript.
- 2026-11-06: Task 4 completato e verificato. BancaOreManager e MealVouchersLedger implementati (totale suite: 73/73 passati, zero errori tsc).
- 2026-11-06: Task 5 completato e verificato. Supabase client, script SQL migrazione, localCache e AuthContext (totale suite: 95/95 passati, zero errori tsc).
- 2026-11-06: Task 6 completato e verificato. workDataService e WorkOrganizerContext con auto-sync e derivati live (totale suite: 109/109 passati, zero errori tsc).
- 2026-11-06: Task 7 completato e verificato. Header, MonthSelector, KpiBadges, LayoutSwitcher e ThemeToggle (totale suite: 121/121 passati, zero errori tsc).
- 2026-11-06: Task 8 completato e verificato. CalendarGrid, CalendarDayCard, WeekSummaryBadge e StatusSelectorModal (totale suite: 136/136 passati, zero errori tsc).
- 2026-11-06: Task 9 completato e verificato. TimbratureTable, DayDetailCard, TodayHeroWidget (totale suite: 150/150 passati, zero errori tsc).
- 2026-11-06: Task 10 completato e verificato. TabbedLayout, SplitLayout, SmartSheetLayout e LayoutContainer (totale suite: 154/154 passati, zero errori tsc).
- 2026-11-06: Task 11 completato e verificato. backupService, excelExporter, SettingsModal (totale suite: 163/163 passati, zero errori tsc).
- 2026-11-06: Task 12 completato e verificato. AuthModal, deploy.yml, App.tsx completo (totale suite: 170/170 passati, zero errori tsc, build dist generata con successo).
