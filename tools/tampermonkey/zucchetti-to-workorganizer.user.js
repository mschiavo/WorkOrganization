// ==UserScript==
// @name         Zucchetti to WorkOrganizer Exporter
// @namespace    https://github.com/mschiavo/WorkOrganization
// @version      1.3.0
// @description  Estrae le timbrature e il cartellino dal portale Zucchetti e le esporta per WorkOrganizer in formato JSON e CSV.
// @author       mschiavo & Gemini CLI
// @match        https://saas.hrzucchetti.it/*
// @match        https://*.hrzucchetti.it/*
// @match        https://*.zucchetti.it/*
// @match        *://*/HRPortal/*
// @match        *://*/Presenze/*
// @match        *://*/ZConnect/*
// @include      /^https?:\/\/.*zucchetti.*$/
// @grant        GM_setClipboard
// @allFrames    true
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // --- Parser Helpers ---
  function normalizeDate(raw, defaultYear = new Date().getFullYear()) {
    if (!raw) return null;
    const str = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const itFull = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (itFull) return `${itFull[3]}-${itFull[2].padStart(2, '0')}-${itFull[1].padStart(2, '0')}`;
    const itShort = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2})\b/);
    if (itShort) return `20${itShort[3]}-${itShort[2].padStart(2, '0')}-${itShort[1].padStart(2, '0')}`;
    const itMonth = str.match(/(\d{1,2})\/(\d{1,2})\b/);
    if (itMonth) return `${defaultYear}-${itMonth[2].padStart(2, '0')}-${itMonth[1].padStart(2, '0')}`;
    return null;
  }

  function normalizeTime(raw) {
    if (!raw) return undefined;
    const str = String(raw).trim();
    const colon = str.match(/^(\d{1,2}):(\d{2})$/);
    if (colon) return `${colon[1].padStart(2, '0')}:${colon[2]}`;
    const dot = str.match(/^(\d{1,2})\.(\d{2})$/);
    if (dot) return `${dot[1].padStart(2, '0')}:${dot[2]}`;
    return undefined;
  }

  function parseFlexibleDuration(input) {
    if (!input) return 0;
    const str = String(input).trim();
    const colon = str.match(/^(\d{1,2}):(\d{2})$/);
    if (colon) return parseInt(colon[1], 10) * 60 + parseInt(colon[2], 10);
    const combined = str.match(/^(\d+)\s*h\s*(\d+)\s*m?$/i);
    if (combined) return parseInt(combined[1], 10) * 60 + parseInt(combined[2], 10);
    const minutes = str.match(/^(\d+)\s*m$/i);
    if (minutes) return parseInt(minutes[1], 10);
    const hours = str.match(/^(\d+)\s*h$/i);
    if (hours) return parseInt(hours[1], 10) * 60;
    return 0;
  }

  function extractRowsFromDoc(doc, defaultYear = new Date().getFullYear()) {
    if (!doc) return [];
    const extractedRows = [];

    // 1. Table rows
    const tables = doc.querySelectorAll('table');
    tables.forEach((tbl) => {
      const trs = tbl.querySelectorAll('tr');
      trs.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('td, th')).map((c) =>
          c.innerText.replace(/\u00a0/g, ' ').trim()
        );
        if (cells.length >= 3 && cells.some((cell) => normalizeDate(cell, defaultYear))) {
          extractedRows.push(cells);
        }
      });
    });

    // 2. Div-based grids
    const gridRows = doc.querySelectorAll('[class*="row"], [class*="grid-row"], .dhtmlx_grid_data tr');
    gridRows.forEach((r) => {
      const cells = Array.from(r.children).map((c) => c.innerText.replace(/\u00a0/g, ' ').trim());
      if (cells.length >= 3 && cells.some((cell) => normalizeDate(cell, defaultYear))) {
        extractedRows.push(cells);
      }
    });

    return extractedRows;
  }

  function getAllDocs(win = window.top || window) {
    let docs = [];
    try {
      if (win.document) docs.push(win.document);
    } catch (e) {}

    try {
      for (let i = 0; i < win.frames.length; i++) {
        try {
          docs = docs.concat(getAllDocs(win.frames[i]));
        } catch (e) {}
      }
    } catch (e) {}

    return docs;
  }

  function extractAllRows(defaultYear = new Date().getFullYear()) {
    const docs = getAllDocs();
    let allRows = [];
    docs.forEach((doc) => {
      try {
        const r = extractRowsFromDoc(doc, defaultYear);
        if (r.length > 0) allRows = allRows.concat(r);
      } catch (e) {}
    });
    return allRows;
  }

  function parseRowsToData(rows, defaultYear = new Date().getFullYear()) {
    const days = {};
    const timeEntries = {};

    for (const row of rows) {
      let dateStr = null;
      let dateColIdx = -1;

      for (let c = 0; c < row.length; c++) {
        const d = normalizeDate(row[c], defaultYear);
        if (d) {
          dateStr = d;
          dateColIdx = c;
          break;
        }
      }

      if (!dateStr) continue;

      const times = [];
      const nonTime = [];

      for (let c = 0; c < row.length; c++) {
        if (c === dateColIdx) continue;
        const t = normalizeTime(row[c]);
        if (t) {
          times.push(t);
        } else if (row[c] && row[c].trim()) {
          nonTime.push(row[c].trim());
        }
      }

      const in1 = times[0];
      const out1 = times[1];
      const in2 = times[2];
      const out2 = times[3];

      const actualOut1 = times.length >= 4 ? out1 : undefined;
      const actualIn2 = times.length >= 4 ? in2 : undefined;
      const actualOut2 = times.length >= 4 ? out2 : (times.length === 2 ? out1 : undefined);

      const combined = nonTime.join(' ').toLowerCase();

      let status = 'presenza';
      let isSmart = false;
      let permMin = 0;
      let canteenUsed = false;

      for (const cell of nonTime) {
        const lower = cell.toLowerCase().trim();
        if (['si', 'sì', 'yes', 's', '1', 'mensa'].includes(lower)) {
          canteenUsed = true;
        }
      }

      if (combined.includes('smart') || combined.includes('agile') || combined.includes('telelavoro') || combined === 'sw') {
        status = 'smart';
        isSmart = true;
      } else if (combined.includes('ferie') || combined.includes('fer.')) {
        status = 'ferie';
      } else if (combined.includes('par') || combined.includes('rol') || combined.includes('permess')) {
        const durationMatch = combined.match(/(\d+\s*h(?:\s*\d+m?)?|\d+:\d{2}|\d+\s*m)/i);
        if (durationMatch) {
          permMin = parseFlexibleDuration(durationMatch[1]);
          status = in1 ? 'presenza' : 'par';
        } else if (!in1) {
          status = 'par';
        }
      } else if (combined.includes('chiusura') || combined.includes('festiv')) {
        status = 'chiusura';
      } else if (in1) {
        status = 'presenza';
      } else {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dayOfWeek = new Date(y, m - 1, d).getDay();
        status = dayOfWeek === 0 || dayOfWeek === 6 ? 'non_lavorativo' : 'non_lavorativo';
      }

      const potentialNotes = nonTime.filter(
        (c) => !['si', 'sì', 'yes', 's', '1', 'no', 'presenza', 'smart', 'ferie', 'par'].includes(c.toLowerCase().trim())
      );
      const noteText = potentialNotes.length > 0 ? potentialNotes.join(' - ') : undefined;

      days[dateStr] = {
        date: dateStr,
        status,
        isConfirmed: status !== 'non_lavorativo',
        notes: noteText,
      };

      if (status === 'smart' || in1 || actualOut2 || permMin > 0 || canteenUsed) {
        timeEntries[dateStr] = {
          date: dateStr,
          morningIn: in1,
          lunchOut: actualOut1,
          lunchIn: actualIn2,
          eveningOut: actualOut2,
          permissionMinutes: permMin > 0 ? permMin : undefined,
          canteenUsed,
          isSmartWork: isSmart,
        };
      }
    }

    return { days, timeEntries };
  }

  function buildPayload(days, timeEntries) {
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

  function buildCsv(days, timeEntries) {
    const header = 'Data;Stato;Entrata1;Uscita1;Entrata2;Uscita2;Permesso;Mensa;Note';
    const allDates = Array.from(new Set([...Object.keys(days), ...Object.keys(timeEntries)])).sort();

    const rows = allDates.map((dateStr) => {
      const d = days[dateStr];
      const e = timeEntries[dateStr];
      const status = d?.status || (e?.isSmartWork ? 'smart' : (e?.morningIn ? 'presenza' : ''));
      const in1 = e?.morningIn || '';
      const out1 = e?.lunchOut || '';
      const in2 = e?.lunchIn || '';
      const out2 = e?.eveningOut || '';
      const perm = e?.permissionMinutes ? `${e.permissionMinutes}m` : '';
      const mensa = e?.canteenUsed ? 'Si' : (e && status === 'presenza' ? 'No' : '');
      const note = d?.notes || '';
      return `${dateStr};${status};${in1};${out1};${in2};${out2};${perm};${mensa};${note}`;
    });

    return [header, ...rows].join('\n');
  }

  function downloadFile(content, fileName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // --- Frame messaging listener (for child iframes) ---
  if (window.self !== window.top) {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'WO_EXTRACT_REQ') {
        const rows = extractRowsFromDoc(document, new Date().getFullYear());
        window.top.postMessage({ type: 'WO_EXTRACT_RES', rows }, '*');
      }
    });
    return; // Don't mount floating widget inside child iframes
  }

  // --- Mount floating widget inside Top Window ---
  function initTopWidget() {
    const rootDoc = document;
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
        const rows = extractAllRows(new Date().getFullYear());
        const statusInfo = panel.querySelector('#wo-status-info');
        if (rows.length > 0) {
          statusInfo.innerText = `✅ Trovate ${rows.length} righe nel cartellino!`;
          statusInfo.style.color = '#4ade80';
        } else {
          statusInfo.innerText = `⚠️ Nessuna riga con date rilevata a video.`;
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
        Estrae le timbrature visibili a schermo per il ripristino istantaneo in WorkOrganizer.
      </div>
      <div id="wo-status-info" style="font-size: 12px; padding: 8px; background: rgba(56, 189, 248, 0.1); border-radius: 6px; margin-bottom: 14px; color: #38bdf8;">
        Pronto per la scansione...
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button id="wo-btn-json" style="background: #0284c7; color: white; border: none; padding: 9px 12px; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 13px;">
          📥 Scarica JSON per WorkOrganizer
        </button>
        <button id="wo-btn-csv" style="background: #334155; color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 13px;">
          📄 Scarica CSV
        </button>
        <button id="wo-btn-copy" style="background: transparent; border: 1px solid #475569; color: #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px;">
          📋 Copia JSON negli appunti
        </button>
      </div>
    `;

    container.appendChild(panel);
    container.appendChild(btn);
    rootDoc.body.appendChild(container);

    panel.querySelector('#wo-close-btn').onclick = () => (panel.style.display = 'none');

    function collectAllData() {
      const rows = extractAllRows(new Date().getFullYear());
      const { days, timeEntries } = parseRowsToData(rows, new Date().getFullYear());
      const daysCount = Object.keys(days).length;

      const statusInfo = panel.querySelector('#wo-status-info');
      if (daysCount > 0) {
        statusInfo.innerText = `✅ Esportati ${daysCount} giorni con successo!`;
        statusInfo.style.color = '#4ade80';
      } else {
        statusInfo.innerText = `⚠️ Nessuna riga con date rilevata.`;
        statusInfo.style.color = '#f87171';
      }

      return { days, timeEntries, count: daysCount };
    }

    panel.querySelector('#wo-btn-json').onclick = () => {
      const { days, timeEntries, count } = collectAllData();
      if (count === 0) return;
      const payload = buildPayload(days, timeEntries);
      const fileName = `WorkOrganization_Zucchetti_${new Date().toISOString().slice(0, 10)}.json`;
      downloadFile(JSON.stringify(payload, null, 2), fileName, 'application/json');
    };

    panel.querySelector('#wo-btn-csv').onclick = () => {
      const { days, timeEntries, count } = collectAllData();
      if (count === 0) return;
      const csv = buildCsv(days, timeEntries);
      const fileName = `WorkOrganization_Zucchetti_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadFile(csv, fileName, 'text/csv');
    };

    panel.querySelector('#wo-btn-copy').onclick = () => {
      const { days, timeEntries, count } = collectAllData();
      if (count === 0) return;
      const payload = buildPayload(days, timeEntries);
      const jsonStr = JSON.stringify(payload, null, 2);
      if (typeof GM_setClipboard !== 'undefined') {
        GM_setClipboard(jsonStr);
      } else {
        navigator.clipboard.writeText(jsonStr);
      }
      const statusInfo = panel.querySelector('#wo-status-info');
      statusInfo.innerText = `📋 Copiato negli appunti! Incollalo in WorkOrganizer.`;
      statusInfo.style.color = '#38bdf8';
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTopWidget);
  } else {
    initTopWidget();
  }
})();
