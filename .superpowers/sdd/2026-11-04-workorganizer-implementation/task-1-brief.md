# Task 1 Brief: Project Scaffolding, Tooling & Test Harness

## Goal
Inizializzare l'ambiente di sviluppo React 19 + TypeScript con Vite e Vitest, installando le dipendenze necessarie e verificando che la suite di test parta e superi il test iniziale di fumo `App.test.tsx`.

## IMPORTANT RULE
**NON ESEGUIRE ALCUN COMANDO GIT (nessun git add, git commit, git init, git diff, ecc.). L'utente ha esplicitamente vietato operazioni git.**

## Deliverables
- `package.json` contenente:
  - Dipendenze di produzione: `react`, `react-dom`, `@supabase/supabase-js`, `lucide-react`, `xlsx`
  - Dipendenze di sviluppo: `@types/react`, `@types/react-dom`, `@vitejs/plugin-react`, `typescript`, `vite`, `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
  - Script: `"dev": "vite"`, `"build": "tsc && vite build"`, `"test": "vitest run"`
- `tsconfig.json` e `tsconfig.node.json` configurati per React 19, strict mode, JSX react-jsx, target ES2022 o ESNext.
- `vite.config.ts` con plugin React e `base: './'` (per supportare GitHub Pages).
- `vitest.config.ts` con environment `jsdom` e setupFiles (se necessario).
- `index.html` con container `<div id="root"></div>`, meta viewport e titolo "WorkOrganizer".
- `src/index.css` con variabili di tema Dark/Light CSS (:root con `--bg-primary`, `--bg-secondary`, `--text-primary`, `--accent`, ecc.).
- `src/App.tsx` componente di base con titolo "WorkOrganizer" e struttura di supporto.
- `src/main.tsx` punto di ingresso React che renderizza `<App />`.
- `src/App.test.tsx` test unitario con Vitest e `@testing-library/react` che renderizza `<App />` e verifica la presenza del testo "WorkOrganizer".

## Verification
Eseguire: `npm install` e poi `npx vitest run src/App.test.tsx`
Tutti i test devono passare.
