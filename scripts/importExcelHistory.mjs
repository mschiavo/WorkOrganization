import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MONTH_NAMES = {
  gennaio: 1,
  febbraio: 2,
  marzo: 3,
  aprile: 4,
  maggio: 5,
  giugno: 6,
  luglio: 7,
  agosto: 8,
  settembre: 9,
  ottobre: 10,
  novembre: 11,
  dicembre: 12,
};

function formatTimeHHmm(val) {
  if (!val) return undefined;
  if (typeof val === 'number') {
    const totalMinutes = Math.round(val * 24 * 60);
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  const match = str.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }
  return undefined;
}

function parsePermissionMinutes(note) {
  if (!note) return 0;
  const match = String(note).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
  }
  return 0;
}

export function convertExcelToWorkOrganizerBackup(excelPath) {
  if (!fs.existsSync(excelPath)) {
    throw new Error(`File non trovato: ${excelPath}`);
  }

  const wb = XLSX.readFile(excelPath);
  const days = {};
  const timeEntries = {};

  const stats = {
    monthsProcessed: 0,
    totalDays: 0,
    presenze: 0,
    smart: 0,
    ferie: 0,
    par: 0,
    nonLavorativi: 0,
    canteenMeals: 0,
    permissionsCount: 0,
  };

  for (const sheetName of wb.SheetNames) {
    const parts = sheetName.trim().toLowerCase().split(/\s+/);
    const mName = parts[0];
    const mNum = MONTH_NAMES[mName];
    const year = parseInt(parts[1], 10) || 2026;
    if (!mNum) continue;

    stats.monthsProcessed++;
    const ws = wb.Sheets[sheetName];
    // Limit range to max 35 rows and 25 columns to avoid scanning 1,000,000+ empty trailing rows
    const rows = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      raw: false,
      range: { s: { r: 0, c: 0 }, e: { r: 35, c: 25 } },
    });
    const r1 = rows[1] || [];

    // Locate Buono Pasto column dynamically
    let bpCol = 13;
    for (let c = 0; c < r1.length; c++) {
      const headerText = String(r1[c] || '').toLowerCase();
      if (headerText.includes('buono') && headerText.includes('pasto')) {
        bpCol = c;
        break;
      }
    }

    const daysInMonth = new Date(year, mNum, 0).getDate();
    const paddedMonth = String(mNum).padStart(2, '0');

    for (let d = 1; d <= daysInMonth; d++) {
      const rowIdx = d + 2; // Row 3 is day 1
      const row = rows[rowIdx] || [];
      const paddedDay = String(d).padStart(2, '0');
      const dateStr = `${year}-${paddedMonth}-${paddedDay}`;

      const in1 = formatTimeHHmm(row[2]);
      const out1 = formatTimeHHmm(row[3]);
      const in2 = formatTimeHHmm(row[4]);
      const out2 = formatTimeHHmm(row[5]);
      const rawNote = row[6] ? String(row[6]).trim() : '';
      const permMin = parsePermissionMinutes(rawNote);
      const bpVal = String(row[bpCol] || '').trim().toLowerCase();

      stats.totalDays++;

      if (bpVal === 'smart') {
        stats.smart++;
        days[dateStr] = {
          date: dateStr,
          status: 'smart',
          isConfirmed: true,
          notes: rawNote && !permMin ? rawNote : undefined,
        };
        timeEntries[dateStr] = {
          date: dateStr,
          isSmartWork: true,
          permissionMinutes: permMin || undefined,
        };
        if (permMin > 0) stats.permissionsCount++;
      } else if (bpVal === 'ferie') {
        stats.ferie++;
        days[dateStr] = {
          date: dateStr,
          status: 'ferie',
          isConfirmed: true,
          notes: rawNote || undefined,
        };
      } else if (bpVal === 'par') {
        stats.par++;
        days[dateStr] = {
          date: dateStr,
          status: 'par',
          isConfirmed: true,
          notes: rawNote || undefined,
        };
      } else if (in1 && out2) {
        stats.presenze++;
        const isCanteen = bpVal === 'si';
        if (isCanteen) stats.canteenMeals++;

        days[dateStr] = {
          date: dateStr,
          status: 'presenza',
          isConfirmed: true,
          notes: rawNote && !permMin ? rawNote : undefined,
        };
        timeEntries[dateStr] = {
          date: dateStr,
          morningIn: in1,
          lunchOut: out1,
          lunchIn: in2,
          eveningOut: out2,
          canteenUsed: isCanteen,
          isSmartWork: false,
          permissionMinutes: permMin || undefined,
        };
        if (permMin > 0) stats.permissionsCount++;
      } else {
        stats.nonLavorativi++;
        days[dateStr] = {
          date: dateStr,
          status: 'non_lavorativo',
          notes: rawNote || undefined,
        };
      }
    }
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
    days,
    timeEntries,
  };

  return { payload, stats };
}

// CLI execution
const inputArg = process.argv[2] || path.resolve(__dirname, '../docs/esempi/Timbrature_2026.xlsx');
const outputPath = path.resolve(__dirname, '../docs/esempi/WorkOrganization_Import_2026.json');

console.log(`\n⏳ Elaborazione del file Excel: ${inputArg}...`);
const { payload, stats } = convertExcelToWorkOrganizerBackup(inputArg);

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), 'utf-8');

console.log(`\n✅ Conversione completata con successo in pochi millisecondi!`);
console.log(`📁 File generato: ${outputPath}`);
console.log(`\n📊 Statistiche Storico Importato (Anno 2026):`);
console.log(`   - Fogli Mese elaborati:     ${stats.monthsProcessed}`);
console.log(`   - Giorni totali archiviati: ${stats.totalDays}`);
console.log(`   - Giornate Presenza:        ${stats.presenze}`);
console.log(`   - Giornate Smart Working:   ${stats.smart}`);
console.log(`   - Giornate Ferie:           ${stats.ferie}`);
console.log(`   - Giornate Non Lavorative:  ${stats.nonLavorativi}`);
console.log(`   - Pasti Mensa consumati:    ${stats.canteenMeals}`);
console.log(`   - Permessi orari rilevati:  ${stats.permissionsCount}\n`);
