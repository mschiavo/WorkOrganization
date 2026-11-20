// =========================================================================================
// SCRIPT ESTRAZIONE ANNO 2026 COMPLETO DA ZUCCHETTI WORKFLOW
// Copia e incolla questo testo nella Console (F12) mentre sei sulla pagina del cartellino.
// =========================================================================================

(async function crawlAllZucchetti2026() {
  console.log("🚀 Avvio estrazione completa Anno 2026 da Zucchetti InfoCamere...");

  function getCartellinoFrame() {
    const winList = [window.top || window];
    try {
      for (let i = 0; i < (window.top || window).frames.length; i++) {
        try { winList.push((window.top || window).frames[i]); } catch(e){}
      }
    } catch(e){}
    for (const w of winList) {
      try {
        if (w.document && w.document.querySelector('select[id*="TxtMese"]')) {
          return w;
        }
      } catch(e){}
    }
    return window;
  }

  const frame = getCartellinoFrame();
  const doc = frame.document;
  const selectMese = doc.querySelector('select[id*="TxtMese"]');

  if (!selectMese) {
    console.error("⚠️ Selettore dei mesi non trovato.");
    return;
  }

  const allDays = {};
  const allTimeEntries = {};
  const year = 2026;

  function parseCurrentCartellino(monthNum) {
    const rawText = frame.document.body.innerText;
    const paddedM = String(monthNum).padStart(2, '0');
    const dayRegex = /(\d{1,2})\s+(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b([\s\S]*?)(?=(?:(?:\r?\n)\s*\d{1,2}\s+(?:Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b)|$)/gi;
    let match;
    let parsedCount = 0;

    while ((match = dayRegex.exec(rawText)) !== null) {
      const dayNum = parseInt(match[1], 10);
      const weekday = match[2];
      const content = match[3].replace(/\s+/g, ' ').trim();
      const paddedD = String(dayNum).padStart(2, '0');
      const dateStr = `${year}-${paddedM}-${paddedD}`;

      // Estrazione degli orari anche se concatenati (es. 08:0012:0512:3716:47)
      const times = content.match(/\d{2}:\d{2}/g) || [];
      let status = 'presenza';
      let isSmart = false;
      let in1, out1, in2, out2;

      if (times.length >= 4) {
        in1 = times[0]; out1 = times[1]; in2 = times[2]; out2 = times[3];
        status = 'presenza';
      } else if (times.length >= 2) {
        in1 = times[0]; out2 = times[1];
        status = 'presenza';
      } else if (/SMART WORKING/i.test(content) || /\b1SW\b/.test(content)) {
        status = 'smart';
        isSmart = true;
      } else if (/FERIE/i.test(content)) {
        status = 'ferie';
      } else if (/PAR/i.test(content) || /ROL/i.test(content)) {
        status = 'par';
      } else if (/FES/i.test(content)) {
        status = 'chiusura';
      } else if (weekday === 'Sab' || weekday === 'Dom') {
        status = 'non_lavorativo';
      } else {
        status = 'presenza';
      }

      const canteenUsed = Boolean(in1 && out2 && status === 'presenza');

      allDays[dateStr] = {
        date: dateStr,
        status,
        isConfirmed: status !== 'non_lavorativo',
      };

      if (status === 'smart' || in1 || canteenUsed) {
        allTimeEntries[dateStr] = {
          date: dateStr,
          morningIn: in1,
          lunchOut: out1,
          lunchIn: in2,
          eveningOut: out2,
          canteenUsed,
          isSmartWork: isSmart,
        };
      }
      parsedCount++;
    }
    return parsedCount;
  }

  // Scansiona da Gennaio (indice 0) a Novembre (indice 10)
  const totalMonths = 11;

  for (let i = 0; i < totalMonths; i++) {
    const monthNum = i + 1;
    const opt = selectMese.options[i];
    const monthName = opt ? opt.text.trim() : `Mese ${monthNum}`;

    console.log(`⏳ [${monthNum}/${totalMonths}] Seleziono ${monthName} 2026...`);
    selectMese.selectedIndex = i;
    selectMese.value = selectMese.options[i].value;
    if (typeof selectMese.onchange === 'function') {
      selectMese.onchange();
    }
    selectMese.dispatchEvent(new Event('input', { bubbles: true }));
    selectMese.dispatchEvent(new Event('change', { bubbles: true }));

    // Attesa caricamento AJAX di Zucchetti
    await new Promise(r => setTimeout(r, 1800));

    const count = parseCurrentCartellino(monthNum);
    console.log(`✅ ${monthName}: estratti ${count} giorni (Totale progressivo: ${Object.keys(allDays).length} giorni)`);
  }

  const payload = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    settings: {
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
      yearlyFerieHours: 160,
      prevYearFerieResidualHours: 0,
      yearlyParHours: 88,
      prevYearParResidualHours: 0,
      preferredLayout: 'split',
      preferredTheme: 'dark',
    },
    days: allDays,
    timeEntries: allTimeEntries,
  };

  const totalDays = Object.keys(allDays).length;
  console.log(`🎉 ESTRAZIONE CONCLUSA! Estratti ${totalDays} giorni dell'anno 2026.`);

  // Download automatico del JSON completo
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `WorkOrganization_Zucchetti_Anno_2026.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log("📁 File 'WorkOrganization_Zucchetti_Anno_2026.json' scaricato con successo nella tua cartella Download!");
})();
