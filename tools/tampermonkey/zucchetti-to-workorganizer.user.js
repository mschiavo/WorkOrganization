// ==UserScript==
// @name         Zucchetti to WorkOrganizer Exporter
// @namespace    https://github.com/mschiavo/WorkOrganization
// @version      2.1.0
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

  function findCartellinoText() {
    let text = '';
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
            text = bodyText;
            break;
          }
        }
      } catch (e) {}
    }

    return text;
  }

  function detectPeriod(text) {
    const yearMatch = text.match(/\b(202[0-9])\b/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();

    const monthMap = {
      gennaio: 1, febbraio: 2, marzo: 3, aprile: 4, maggio: 5, giugno: 6,
      luglio: 7, agosto: 8, settembre: 9, ottobre: 10, novembre: 11, dicembre: 12
    };

    let month = new Date().getMonth() + 1;
    // Look for active selected month radio/button if present in documents
    try {
      const activeEl = document.querySelector('input[type="radio"]:checked, option:selected, .selected, .active');
      if (activeEl && activeEl.innerText) {
        const m = monthMap[activeEl.innerText.trim().toLowerCase()];
        if (m) month = m;
      }
    } catch (e) {}

    return { year, month };
  }

  function parseWorkflowCartellino(rawText, year, month) {
    const days = {};
    const timeEntries = {};
    const paddedM = String(month).padStart(2, '0');

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
        in1 = timesMatch[1];
        out1 = timesMatch[2];
        in2 = timesMatch[3];
        out2 = timesMatch[4];
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

    return {
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
      days,
      timeEntries,
    };
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

    btn.onmouseenter = () => (btn.style.transform = 'scale(1.06)');
    btn.onmouseleave = () => (btn.style.transform = 'scale(1.0)');

    const panel = rootDoc.createElement('div');
    panel.style.cssText = `
      display: none;
      position: absolute;
      bottom: 58px;
      right: 0;
      width: 300px;
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
        const text = findCartellinoText();
        const { year, month } = detectPeriod(text);
        const payload = parseWorkflowCartellino(text, year, month);
        const count = Object.keys(payload.days).length;
        const statusInfo = panel.querySelector('#wo-status-info');
        if (count > 0) {
          statusInfo.innerText = `✅ Rilevati ${count} giorni (${year}-${String(month).padStart(2, '0')})!`;
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
        Estrae le timbrature del cartellino per l'importazione diretta in WorkOrganizer.
      </div>
      <div id="wo-status-info" style="font-size: 12px; padding: 8px; background: rgba(56, 189, 248, 0.1); border-radius: 6px; margin-bottom: 14px; color: #38bdf8;">
        Pronto per l'estrazione...
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button id="wo-btn-json" style="background: #0284c7; color: white; border: none; padding: 10px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
          📥 Scarica JSON per WorkOrganizer
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

    panel.querySelector('#wo-btn-json').onclick = () => {
      const text = findCartellinoText();
      const { year, month } = detectPeriod(text);
      const payload = parseWorkflowCartellino(text, year, month);
      const fileName = `WorkOrganization_Zucchetti_${year}-${String(month).padStart(2, '0')}.json`;
      downloadJson(payload, fileName);
    };

    panel.querySelector('#wo-btn-copy').onclick = () => {
      const text = findCartellinoText();
      const { year, month } = detectPeriod(text);
      const payload = parseWorkflowCartellino(text, year, month);
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
