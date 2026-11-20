(async function autoCrawlYear2026() {
      console.log("🚀 Avvio estrazione completa Anno 2026 da Zucchetti...");
   
      function getCartellinoFrame() {
        const winList = [window.top || window];
        try {
          for (let i = 0; i < (window.top || window).frames.length; i++) {
            try { winList.push((window.top || window).frames[i]); } catch(e){}
          }
        } catch(e){}
        for (const w of winList) {
          try {
            if (w.document && w.document.body && /\b\d{1,2}\s+(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b/i.test(w.document.body.innerText)) {
              return w;
            }
          } catch(e){}
        }
        return window;
      }
   
      const frame = getCartellinoFrame();
      const doc = frame.document;
   
      const months = [
        { name: 'Gennaio', num: 1 },
        { name: 'Febbraio', num: 2 },
        { name: 'Marzo', num: 3 },
        { name: 'Aprile', num: 4 },
        { name: 'Maggio', num: 5 },
        { name: 'Giugno', num: 6 },
        { name: 'Luglio', num: 7 },
        { name: 'Agosto', num: 8 },
        { name: 'Settembre', num: 9 },
        { name: 'Ottobre', num: 10 },
        { name: 'Novembre', num: 11 }
      ];
   
      const allDays = {};
      const allTimeEntries = {};
   
      function parseCurrentView(monthNum) {
        const rawText = frame.document.body.innerText;
        const year = 2026;
        const paddedM = String(monthNum).padStart(2, '0');
        const dayRegex = /(\d{1,2})\s+(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b([\s\S]*?)(?=(?:(?:\r?\n)\s*\d{1,2}\s+(?:Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b)|$)/gi;
        let match;
   
        while ((match = dayRegex.exec(rawText)) !== null) {
          const dayNum = parseInt(match[1], 10);
          const weekday = match[2];
          const content = match[3].replace(/\s+/g, ' ').trim();
          const paddedD = String(dayNum).padStart(2, '0');
          const dateStr = `${year}-${paddedM}-${paddedD}`;
   
          const timesMatch = content.match(/(\d{2}:\d{2})\s*(\d{2}:\d{2})\s*(\d{2}:\d{2})\s*(\d{2}:\d{2})/);
          let status = 'presenza';
          let isSmart = false;
          let in1, out1, in2, out2;
   
          if (timesMatch) {
            in1 = timesMatch[1]; out1 = timesMatch[2]; in2 = timesMatch[3]; out2 = timesMatch[4];
            status = 'presenza';
          } else if (/SMART WORKING/i.test(content) || /\b1SW\b/.test(content)) {
            status = 'smart'; isSmart = true;
          } else if (/FERIE/i.test(content)) {
            status = 'ferie';
          } else if (/PAR/i.test(content) || /ROL/i.test(content)) {
            status = 'par';
          } else if (/FES/i.test(content)) {
            status = 'chiusura';
          } else if (weekday === 'Sab' || weekday === 'Dom') {
            status = 'non_lavorativo';
          }
   
          const canteenUsed = Boolean(in1 && out2 && status === 'presenza');
          allDays[dateStr] = { date: dateStr, status, isConfirmed: status !== 'non_lavorativo' };
          if (status === 'smart' || in1 || canteenUsed) {
            allTimeEntries[dateStr] = { date: dateStr, morningIn: in1, lunchOut: out1, lunchIn: in2, eveningOut: out2, canteenUsed, isSmartWork: isSmart };
          }
        }
      }
   
      // Trova gli elementi cliccabili dei mesi
      for (const m of months) {
        const allClickables = Array.from(doc.querySelectorAll('a, button, span, td, div'));
        const monthBtn = allClickables.find(el => el.innerText && el.innerText.trim().toLowerCase() === m.name.toLowerCase() && el.children.length === 0);
   
        if (monthBtn) {
          console.log(`⏳ Caricamento ${m.name} 2026...`);
          monthBtn.click();
          // Attesa rendering AJAX di Zucchetti
          await new Promise(r => setTimeout(r, 900));
          parseCurrentView(m.num);
          console.log(`✅ ${m.name} estratto! (Totale progressivo: ${Object.keys(allDays).length} giorni)`);
        } else {
          console.log(`⚠️ Pulsante ${m.name} non cliccabile direttamente, estrazione vista corrente...`);
          parseCurrentView(m.num);
        }
      }
   
      const payload = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        settings: {
          maxSmartDaysMonth: 10, minPresenceDaysWeek: 1, maxSmartDaysWeek: 4,
          standardDayHours: 8, reducedDayHours: 7, minLunchBreakMinutes: 30,
          canteenVoucherCost: 1.5, smartVoucherValue: 8.0, yearlyFerieHours: 160,
          yearlyParHours: 88, preferredLayout: 'split', preferredTheme: 'dark'
        },
        days: allDays,
        timeEntries: allTimeEntries
      };
   
      const totalCount = Object.keys(allDays).length;
      console.log(`🎉 COMPLETATO! Estratti in totale ${totalCount} giorni per tutto il 2026.`);
   
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WorkOrganization_Zucchetti_Anno_2026.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
   
      console.log("📁 File 'WorkOrganization_Zucchetti_Anno_2026.json' scaricato! Caricalo in WorkOrganizer.");
    })();