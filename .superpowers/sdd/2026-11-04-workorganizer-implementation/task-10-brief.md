# Task 10 Brief: Three Switchable Layouts (Tabbed, Split, Smart Sheet)

## Goal
Implementare i tre layout alternativi dell'applicazione con passaggio a caldo senza reload:
1. `src/layouts/TabbedLayout.tsx`: vista a due schede (Tab 1: Calendario Pianificazione, Tab 2: Registro Timbrature).
2. `src/layouts/SplitLayout.tsx`: vista Master-Detail divisa (a sinistra Calendario compatto, a destra DayDetailCard del giorno attivo).
3. `src/layouts/SmartSheetLayout.tsx`: vista rapida con TodayHeroWidget in testa e tabella timbrature sotto.
4. `src/layouts/LayoutContainer.tsx`: container unificato che monta il layout specificato in `settings.preferredLayout` ('tabbed' | 'split' | 'smart-sheet').
5. `src/layouts/Layouts.module.css`: stili CSS per le viste.
6. `src/layouts/Layouts.test.tsx`: test di rendering per tutti e 3 i layout.

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Interfaces & Contracts

### In `src/layouts/LayoutContainer.tsx`:
- Renderizza il layout corrispondente a `settings.preferredLayout`:
  - `'tabbed'` -> `<TabbedLayout />`
  - `'split'` -> `<SplitLayout />`
  - `'smart-sheet'` -> `<SmartSheetLayout />`
- Ha `data-testid="layout-container"` e `data-layout={settings.preferredLayout}`.

### In `src/layouts/TabbedLayout.tsx`:
- Tab buttons:
  - `data-testid="tab-btn-calendar"`: mostra `<CalendarGrid />`
  - `data-testid="tab-btn-timbrature"`: mostra `<TimbratureTable />`

### In `src/layouts/SplitLayout.tsx`:
- Container con `data-testid="split-layout"`.
- Colonna sinistra (60% su desktop): `<CalendarGrid compact={true} />`
- Colonna destra (40% su desktop): `<DayDetailCard />`

### In `src/layouts/SmartSheetLayout.tsx`:
- Container con `data-testid="smart-sheet-layout"`.
- In alto: `<TodayHeroWidget />`
- Sotto: `<TimbratureTable />`

## Deliverables
- `src/layouts/TabbedLayout.tsx`
- `src/layouts/SplitLayout.tsx`
- `src/layouts/SmartSheetLayout.tsx`
- `src/layouts/LayoutContainer.tsx`
- `src/layouts/Layouts.module.css`
- `src/layouts/Layouts.test.tsx`
- Report in `.superpowers/sdd/2026-11-04-workorganizer-implementation/task-10-report.md`

## Verification
- `npx vitest run src/layouts/Layouts.test.tsx`
- `npx vitest run` (tutti i test verdi)
- `npx tsc` (zero errori)
