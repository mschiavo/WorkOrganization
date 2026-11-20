# Zucchetti to WorkOrganizer - Tampermonkey Userscript

Questo Userscript per **Tampermonkey** consente di estrarre con 1 clic tutte le timbrature, lo smart working, le ferie, i permessi e la mensa dal portale web aziendale **Zucchetti** (HR Portal, Infinity, Presenze Web, ZConnect), generando istantaneamente il file JSON o CSV pronto per WorkOrganizer.

---

## 🚀 Come installarlo in Tampermonkey (1 minuto)

1. **Apri Tampermonkey** nel tuo browser (icona a forma di due cerchi neri in alto a destra).
2. Clicca sull'icona e seleziona **"Aggiungi un nuovo script..."** (o l'icona con il simbolo `+`).
3. Cancella il template vuoto e **incolla l'intero contenuto** del file:
   👉 [`tools/tampermonkey/zucchetti-to-workorganizer.user.js`](./zucchetti-to-workorganizer.user.js)
4. Clicca su **File > Salva** (o premi `Ctrl + S`).

> **💡 Nota sull'indirizzo aziendale:**  
> Se il portale Zucchetti della tua azienda si trova su un dominio interno o personalizzato (ad esempio `https://portale.azienda.it` o `https://hr.azienda.com`), apri lo script in Tampermonkey e aggiungi in alto tra i metadati:  
> `// @match        https://portale.azienda.it/*`

---

## 🖱️ Come usarlo

1. Accedi normalmente al tuo portale Zucchetti con username, password e eventuale 2FA.
2. Naviga sulla pagina del **Cartellino Mensile** / **Elenco Timbrature**.
3. In basso a destra comparirà il pulsante azzurro **"📤 WorkOrganizer"**.
4. Clicca sul pulsante:
   - Clicca **"📥 Scarica JSON per WorkOrganizer"** (oppure *"📄 Scarica CSV"* o *"📋 Copia JSON"*).
5. Apri **WorkOrganizer** (`https://mschiavo.github.io/WorkOrganization/` o in locale).
6. Clicca su **⚙️ Impostazioni > "Ripristina da File JSON"** e seleziona il file scaricato.

Tutte le timbrature del mese verranno caricate istantaneamente, sincronizzando presenze, ore lavorate, mensa, banca ore e permessi!
