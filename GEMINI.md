# WorkOrganization: Project Guidelines & Workflow

## Git & Branching Workflow
- **Branching per le modifiche:** Per tutte le nuove feature o modifiche al codice, staccare sempre un nuovo branch dedicato (es. `feature/...` o `fix/...`) e lavorare in isolamento.
- **Merge protetto:** Il merge sul ramo di produzione (`main` / `master`) deve avvenire **esclusivamente dopo che tutti i test sono passati** (`npm test`, `npx tsc`, `npm run build`) e **solo previa esplicita approvazione dell'utente**.
- **Versioning continuo:** Ad ogni blocco di modifiche, incrementare la versione `minor` o `patch` in `package.json`, Header e documentazione in base all'entità degli interventi.

## Architettura & Design Principles
- **Zero Popup:** Non utilizzare finestre modali o popover invadenti per la selezione delle causali o la modifica dei dati del calendario; favorire controlli inline (es. menu a tendina) o la scheda laterale di dettaglio (`DayDetailCard`).
- **Tastiera & Ergonomia:** I campi orari delle timbrature devono sempre supportare la digitazione fluida diretta da tastiera (es. digitazione rapida minuti a due cifre) preservando contestualmente il selettore/picker orario nativo.
- **Testing (TDD):** Ogni nuova logica di calcolo orario, policy, ferie/PAR e componente UI deve essere coperta da test unitari/integrazione con Vitest e Testing Library prima della finalizzazione.
