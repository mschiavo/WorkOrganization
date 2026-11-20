# Implementation Plan: Zucchetti to WorkOrganizer Tampermonkey Extractor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creare uno Userscript Tampermonkey pronto all'uso che si integra nel portale web aziendale Zucchetti, legge le timbrature/cartellino del dipendente in locale e genera con 1 click il file JSON/CSV pronto da importare in WorkOrganizer.

**Architecture:**
- Parser di Dominio (`src/services/export/zucchettiParser.ts`): logica pura TDD per estrarre giorni, timbrature, smart working, ferie, par, permessi e mensa da strutture tabellari Zucchetti (HTML o righe testo).
- Userscript Tampermonkey (`tools/tampermonkey/zucchetti-to-workorganizer.user.js`): script con metadati GM, widget UI galleggiante, rilevamento automatico iframe/tabelle cartellino, download diretto JSON/CSV e copia negli appunti.
- Documentazione (`tools/tampermonkey/README.md`): guida all'installazione in 2 click in Tampermonkey con istruzioni per configurare l'URL del portale aziendale.
- Branch Git: `feature/zucchetti-tampermonkey-exporter`.

---

### Task 1: Core Zucchetti Parser & Unit Tests (TDD)

**Files:**
- Create: `src/services/export/zucchettiParser.ts`
- Create: `src/services/export/zucchettiParser.test.ts`

- [ ] **Step 1: Scrivere test in `zucchettiParser.test.ts`**
  - Test per parsing tabella HTML tipica del cartellino Zucchetti (colonne Giorno/Data, Entrata 1, Uscita 1, Entrata 2, Uscita 2, Giustificativi, Mensa).
  - Test per riconoscimento date (formato `DD/MM/YYYY` e `DD/MM`).
  - Test per riconoscimento causali (Smart Working, Ferie, PAR / ROL, Malattia).
  - Test per orari con o senza separatori (`08:30`, `8.30`, `0830`).
- [ ] **Step 2: Eseguire test (RED)**
  - Run: `npx vitest run src/services/export/zucchettiParser.test.ts`
  - Expected: FAIL
- [ ] **Step 3: Implementare `zucchettiParser.ts`**
- [ ] **Step 4: Eseguire test (GREEN)**
  - Run: `npx vitest run src/services/export/zucchettiParser.test.ts`
  - Expected: PASS

---

### Task 2: Tampermonkey Userscript (`zucchetti-to-workorganizer.user.js`)

**Files:**
- Create: `tools/tampermonkey/zucchetti-to-workorganizer.user.js`

- [ ] **Step 1: Strutturare i metadati Tampermonkey (@name, @version, @match, @grant)**
- [ ] **Step 2: Implementare il widget galleggiante UI iniettato nella pagina Zucchetti**
- [ ] **Step 3: Implementare l'estrattore DOM delle tabelle di cartellino (anche all'interno di iframe)**
- [ ] **Step 4: Implementare le azioni "Scarica JSON per WorkOrganizer", "Scarica CSV" e "Copia negli Appunti"**

---

### Task 3: Guida all'uso (`tools/tampermonkey/README.md`) & Versioning v0.7.0

**Files:**
- Create: `tools/tampermonkey/README.md`
- Modify: `package.json` -> `"version": "0.7.0"`
- Modify: `src/components/Header/Header.tsx` -> `v0.7`
- Modify: `src/components/Header/Header.test.tsx`
- Modify: `README.md`

- [ ] **Step 1: Scrivere la guida con istruzioni passo-passo per Tampermonkey**
- [ ] **Step 2: Bump versione a v0.7.0 in package.json, package-lock.json e Header**
- [ ] **Step 3: Eseguire l'intera suite di test e compilazione TypeScript (100% pass, 0 errori)**
- [ ] **Step 4: Build di produzione Vite**
