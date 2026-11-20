// ==UserScript==
// @name         Zucchetti to WorkOrganizer Exporter
// @namespace    https://github.com/mschiavo/WorkOrganization
// @version      2.2.0
// @description  Estrae le timbrature e il cartellino dal portale Zucchetti (HR Workflow / Presenze) e le esporta per WorkOrganizer in formato JSON e CSV.
// @author       mschiavo & Gemini CLI
// @match        https://saas.hrzucchetti.it/*
// @match        https://*.hrzucchetti.it/*
// @match        https://*.zucchetti.it/*
// @match        *://*/*
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  function findCartellinoFrame() {
    const winList = [window.top || window];
    try {
      for (let i = 0; i < (window.top || window).frames.length; i++) {
        try { winList.push((window.top || window).frames[i]); } catch (e) {}
      }
    } catch (e) {}

    for (const w of winList) {
      try {
        if (w.document && w.document.body) {
          const bodyText = w.document.body.innerText;
          if (/\b\d{1,2}\s+(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b/i.test(bodyText)) {
            return w;
          }
        }
      } catch (e) {}
    }

    return window;
  }

  function parseCurrentCartellino(frame, year, month) {
    const rawText = frame.document.body.innerText;
    const paddedM = String(month).padStart(2, '0');
    const dayRegex = /(\d{1,2})\s+(Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b([\s\S]*?)(?=(?:(?:\r?\n)\s*\d{1,2}\s+(?:Lun|Mar|Mer|Gio|Ven|Sab|Dom)\b)|$)/gi;
    let match;

    const days = {};
    const timeEntries = {};

    while ((match = dayRegex.exec(rawText)) !== null) {
      const dayNum = parseInt(match[1], 10);
      const weekday = match[2];
      const content = match[3].replace(/\s+/g, ' ').trim();
      const paddedD = String(dayNum).padStart(2, '0');
      const dateStr = `${year}-${paddedM}-${paddedD}`;

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

      days[dateStr] = {
        date: dateStr,
        status,
        isConfirmed: status !== 'non_lavorativo',
      };

      if (status === 'smart' || in1 || canteenUsed) {
        timeEntries[dateStr] = {
          date: dateStr,
          morningIn: in1,
          lunchOut: out1,
          lunchIn: in2,
          eveningOut: out2,
          canteenUsed,
          isSmartWork: isSmart,
        };
      }
    }

    return { days, timeEntries };
  }

  function downloadJson(payload, fileName) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function initTopWidget() {
    const rootDoc = window.top ? window.top.document : document;
    if (!rootDoc || !rootDoc.body) {
      setTimeout(initTopWidget, 500);
      return;
    }

    if (rootDoc.getElementById('wo-zucchetti-widget')) return;

    const container = rootDoc.createElement('div');
    container.id = 'wo-zucchetti-widget';
    container.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    `;

    const btn = rootDoc.createElement('button');
    btn.innerText = '📤 WorkOrganizer';
    btn.style.cssText = `
      background: linear-gradient(135deg, #0ea5e9, #38bdf8);
      color: #04101e;
      font-weight: bold;
      border: 2px solid #ffffff;
      border-radius: 50px;
      padding: 12px 22px;
      cursor: pointer;
      box-shadow: 0 6px 20px rgba(0,0,0,0.35);
      font-size: 14px;
      transition: transform 0.2s, box-shadow 0.2s;
    `;

    const panel = rootDoc.createElement('div');
    panel.style.cssText = `
      display: none;
      position: absolute;
      bottom: 58px;
      right: 0;
      width: 310px;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0,0,0,0.6);
      padding: 18px;
      color: #f8fafc;
    `;

    btn.onclick = () => {
      panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
      if (panel.style.display === 'block') {
        const frame = findCartellinoFrame();
        const { days } = parseCurrentCartellino(frame, 2026, new Date().getMonth() + 1);
        const count = Object.keys(days).length;
        const statusInfo = panel.querySelector('#wo-status-info');
        if (count > 0) {
          statusInfo.innerText = `✅ Rilevati ${count} giorni nel cartellino!`;
          statusInfo.style.color = '#4ade80';
        } else {
          statusInfo.innerText = `⚠️ Nessun giorno rilevato nel cartellino.`;
          statusInfo.style.color = '#f87171';
        }
      }
    };

    panel.innerHTML = `
      <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px; display: flex; justify-content: space-between;">
        <span>Zucchetti ➔ WorkOrganizer</span>
        <span id="wo-close-btn" style="cursor: pointer; opacity: 0.6; font-size: 16px;">✕</span>
      </div>
      <div style="font-size: 12px; color: #94a3b8; margin-bottom: 12px; line-height: 1.4;">
        Estrae le timbrature del cartellino Zucchetti per WorkOrganizer.
      </div>
      <div id="wo-status-info" style="font-size: 12px; padding: 8px; background: rgba(56, 189, 248, 0.1); border-radius: 6px; margin-bottom: 14px; color: #38bdf8;">
        Pronto per l'estrazione...
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button id="wo-btn-current" style="background: #0284c7; color: white; border: none; padding: 10px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
          📥 Scarica Mese Corrente (JSON)
        </button>
        <button id="wo-btn-crawl" style="background: #059669; color: white; border: none; padding: 10px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
          ⚡ Estrai TUTTO il 2026 (Gen-Nov)
        </button>
        <button id="wo-btn-copy" style="background: transparent; border: 1px solid #475569; color: #cbd5e1; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
          📋 Copia JSON negli appunti
        </button>
      </div>
    `;

    container.appendChild(panel);
    container.appendChild(btn);
    rootDoc.body.appendChild(container);

    panel.querySelector('#wo-close-btn').onclick = () => (panel.style.display = 'none');

    // Scarica Mese Corrente
    panel.querySelector('#wo-btn-current').onclick = () => {
      const frame = findCartellinoFrame();
      const month = new Date().getMonth() + 1;
      const { days, timeEntries } = parseCurrentCartellino(frame, 2026, month);
      const payload = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        settings: {
          maxSmartDaysMonth: 10, minPresenceDaysWeek: 1, maxSmartDaysWeek: 4,
          standardDayHours: 8, reducedDayHours: 7, minLunchBreakMinutes: 30,
          canteenVoucherCost: 1.5, smartVoucherValue: 8.0, yearlyFerieHours: 160,
          yearlyParHours: 88, preferredLayout: 'split', preferredTheme: 'dark'
        },
        days, timeEntries
      };
      downloadJson(payload, `WorkOrganization_Zucchetti_2026-${String(month).padStart(2, '0')}.json`);
    };

    // Estrai Tutto il 2026
    panel.querySelector('#wo-btn-crawl').onclick = async () => {
      const frame = findCartellinoFrame();
      const selectMese = frame.document.querySelector('select[id*="TxtMese"]');
      const statusInfo = panel.querySelector('#wo-status-info');

      if (!selectMese) {
        statusInfo.innerText = "⚠️ Selettore mesi non trovato.";
        statusInfo.style.color = "#f87171";
        return;
      }

      const allDays = {};
      const allTimeEntries = {};
      const totalMonths = 11; // Gen - Nov

      for (let i = 0; i < totalMonths; i++) {
        const monthNum = i + 1;
        const opt = selectMese.options[i];
        statusInfo.innerText = `⏳ Caricamento ${opt ? opt.text.trim() : monthNum} 2026...`;
        statusInfo.style.color = '#38bdf8';

        selectMese.selectedIndex = i;
        selectMese.value = selectMese.options[i].value;
        if (typeof selectMese.onchange === 'function') selectMese.onchange();
        selectMese.dispatchEvent(new Event('change', { bubbles: true }));

        await new Promise((r) => setTimeout(r, 1600));

        const { days, timeEntries } = parseCurrentCartellino(frame, 2026, monthNum);
        Object.assign(allDays, days);
        Object.assign(allTimeEntries, timeEntries);
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

      downloadJson(payload, `WorkOrganization_Zucchetti_Tutto_2026.json`);
      statusInfo.innerText = `🎉 2026 Completo! Scaricato in Download.`;
      statusInfo.style.color = '#4ade80';
    };

    // Copia
    panel.querySelector('#wo-btn-copy').onclick = () => {
      const frame = findCartellinoFrame();
      const month = new Date().getMonth() + 1;
      const { days, timeEntries } = parseCurrentCartellino(frame, 2026, month);
      const payload = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        settings: {
          maxSmartDaysMonth: 10, minPresenceDaysWeek: 1, maxSmartDaysWeek: 4,
          standardDayHours: 8, reducedDayHours: 7, minLunchBreakMinutes: 30,
          canteenVoucherCost: 1.5, smartVoucherValue: 8.0, yearlyFerieHours: 160,
          yearlyParHours: 88, preferredLayout: 'split', preferredTheme: 'dark'
        },
        days, timeEntries
      };
      const jsonStr = JSON.stringify(payload, null, 2);
      if (typeof GM_setClipboard !== 'undefined') {
        GM_setClipboard(jsonStr);
      } else {
        navigator.clipboard.writeText(jsonStr);
      }
      const statusInfo = panel.querySelector('#wo-status-info');
      statusInfo.innerText = `📋 Copiato negli appunti!`;
      statusInfo.style.color = '#38bdf8';
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTopWidget);
  } else {
    initTopWidget();
  }
})();
