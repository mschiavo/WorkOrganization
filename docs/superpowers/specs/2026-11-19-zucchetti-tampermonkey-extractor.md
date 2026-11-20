# Spec: Zucchetti to WorkOrganizer Tampermonkey Extractor

**Date:** 2026-11-19  
**Status:** Approved  
**Author:** Gemini CLI & User  

## 1. Intent & Problem Statement
L'utente gestisce le proprie presenze e timbrature aziendali sul gestionale web Zucchetti (HR Portal, Presenze Web, Paghe Web o ZConnect). Tali portali risiedono sotto autenticazione aziendale (SSO, 2FA, VPN).
Per evitare inserimenti manuali o riscritture periodiche, l'utente desidera un meccanismo "one-click" per estrarre le proprie timbrature direttamente dalla pagina web aperta nel browser e portarle dentro WorkOrganizer.

Avendo già Tampermonkey installato nel browser, la soluzione ideale è un **Userscript Tampermonkey dedicato** che opera in locale all'interno della sessione autenticata.

## 2. Goals & Architecture
- **In-Browser Execution:** Lo script gira solo nel browser dell'utente all'interno della pagina Zucchetti già autenticata. Zero necessità di salvare password o gestire 2FA.
- **Floating Action Widget:** Lo script inietta un piccolo widget galleggiante discreto ("📤 Esporta per WorkOrganizer") nell'angolo in basso a destra del portale Zucchetti.
- **Smart Cartellino Parser:**
  - Individua la tabella o il frame del cartellino mensile (riconoscimento euristico delle colonne: Data/Giorno, Entrate, Uscite, Giustificativi/Causali come Smart/Ferie/PAR, Mensa).
  - Supporta le strutture standard Zucchetti (griglie `dhtmlxGrid`, tabelle HTML standard `.cartellino`, `table.grid`, ecc.).
- **Dual Export Format:**
  - **JSON nativo WorkOrganizer:** pronto da caricare con 1 click in *Impostazioni > Ripristina da File JSON*.
  - **CSV interoperabile:** formato a 9 colonne compatibile con `csvConverter.ts`.
- **Interfaccia Utente del Widget:**
  - Pulsante *"Scarica JSON per WorkOrganizer"*
  - Pulsante *"Scarica CSV"*
  - Pulsante *"Copia JSON negli appunti"*
  - Anteprima sintetica dei giorni trovati (presenze, smart, ferie, timbrature).

## 3. Constraints & Security (Zero-Leak)
- **Credential Protection:** Nessuna credenziale aziendale viene mai memorizzata, trasmessa o registrata.
- **Privacy:** Tutti i dati estratti rimangono confinati nel computer locale dell'utente.
- **Target URL Matching:** Lo script interviene su domini e percorsi tipici Zucchetti (`*://*/*zucchetti*/*`, `*://*/HRPortal/*`, `*://*/Presenze/*`, `*://*/*cartellino*/*`) con possibilità di aggiungere qualsiasi URL aziendale personalizzato nell'header `@match`.

## 4. Deliverables
1. `tools/tampermonkey/zucchetti-to-workorganizer.user.js`: script pronto per l'installazione in Tampermonkey.
2. `tools/tampermonkey/README.md`: guida passo-passo con screenshot e istruzioni per installare e personalizzare il match dell'URL aziendale.
3. Unit test di validazione del parser per verificare che il formato prodotto rispetti lo schema `BackupPayload` di WorkOrganizer.
